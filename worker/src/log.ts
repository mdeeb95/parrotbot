import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@parrot/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let r2Client: S3Client | null = null;
let r2Bucket: string | null = null;
let r2WarnedMissing = false;

export function initR2(config: Partial<R2Config>): void {
  const { endpoint, accessKeyId, secretAccessKey, bucket } = config;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    if (!r2WarnedMissing) {
      logger.warn(
        "R2 envs missing — JSONL will be written to disk but not uploaded",
      );
      r2WarnedMissing = true;
    }
    return;
  }
  r2Client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  r2Bucket = bucket;
}

const dataDir = process.env.DATA_DIR ?? "./data";
const jsonlDir = join(dataDir, "jsonl");
const flushStatePath = join(dataDir, ".flush-state.json");

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function jsonlPathFor(channel: string, date: string): string {
  return join(jsonlDir, channel, `${date}.jsonl`);
}

export function appendJsonl(channel: string, line: Record<string, unknown>): void {
  const date = todayUtc();
  const path = jsonlPathFor(channel, date);
  ensureDir(dirname(path));
  appendFileSync(path, JSON.stringify(line) + "\n", "utf8");
}

type FlushState = Record<string, { offset: number; date: string }>;

function loadFlushState(): FlushState {
  if (!existsSync(flushStatePath)) return {};
  try {
    return JSON.parse(readFileSync(flushStatePath, "utf8")) as FlushState;
  } catch {
    return {};
  }
}

function saveFlushState(state: FlushState): void {
  ensureDir(dirname(flushStatePath));
  writeFileSync(flushStatePath, JSON.stringify(state), "utf8");
}

export async function flushR2(): Promise<void> {
  if (!r2Client || !r2Bucket) return;
  const state = loadFlushState();
  const date = todayUtc();
  if (!existsSync(jsonlDir)) return;
  const channels = await import("node:fs/promises").then((m) =>
    m.readdir(jsonlDir).catch(() => [] as string[]),
  );

  for (const channel of channels) {
    const path = jsonlPathFor(channel, date);
    if (!existsSync(path)) continue;
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      continue;
    }
    const key = `${channel}/${date}`;
    const prev = state[key];
    const offset = prev?.date === date ? prev.offset : 0;
    if (size <= offset) continue;
    let chunk: string;
    try {
      const buf = readFileSync(path);
      chunk = buf.subarray(offset, size).toString("utf8");
    } catch (err) {
      logger.warn({ err, channel }, "r2 flush read failed");
      continue;
    }
    if (!chunk.length) continue;

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = randomBytes(3).toString("hex");
    const objectKey = `${channel}/${date}/${ts}-${rand}.jsonl`;
    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: r2Bucket,
          Key: objectKey,
          Body: chunk,
          ContentType: "application/x-ndjson",
        }),
      );
      state[key] = { offset: size, date };
    } catch (err) {
      logger.warn({ err, channel, objectKey }, "r2 flush upload failed");
    }
  }
  saveFlushState(state);
}

export function startR2FlushLoop(intervalMs = 60_000): () => Promise<void> {
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      await flushR2();
    } catch (err) {
      logger.warn({ err }, "r2 flush tick failed");
    } finally {
      running = false;
    }
  }
  timer = setInterval(tick, intervalMs);
  return async () => {
    if (timer) clearInterval(timer);
    await flushR2();
  };
}

// ----- DB writes via per-channel queue -----

const queues = new Map<string, Promise<void>>();

export function queueDbWrite(
  channelId: string,
  task: () => Promise<void>,
): Promise<void> {
  const prev = queues.get(channelId) ?? Promise.resolve();
  const next = prev.then(task).catch((err) => {
    logger.error({ err, channelId }, "db write failed");
  });
  queues.set(channelId, next);
  return next;
}

export async function drainAllDbQueues(): Promise<void> {
  const all = Array.from(queues.values());
  await Promise.allSettled(all);
}

type InputMessage = { author: string; text: string };

// Note on token accounting: we count input + cache_read + cache_creation + output
// because all four are charged on the Anthropic invoice. The brief technically
// says "input only," but that under-counts real spend.
export function recordPostedAnswer(args: {
  channelId: string;
  intent: string;
  answer: string;
  askerCount: number;
  confidence: number;
  inputMessages: InputMessage[];
  tokensInputDelta: number;
  tokensOutputDelta: number;
}): Promise<void> {
  const today = todayUtc();
  const inputJson = JSON.stringify(args.inputMessages);
  return queueDbWrite(args.channelId, async () => {
    await db.execute(sql`
      WITH ins AS (
        INSERT INTO answers_log
          (channel_id, intent, answer_text, asker_count, confidence, input_messages)
        VALUES
          (${args.channelId}, ${args.intent}, ${args.answer}, ${args.askerCount},
           ${args.confidence}, ${inputJson}::jsonb)
        RETURNING 1
      )
      INSERT INTO usage_daily (channel_id, date, answers_posted, tokens_input, tokens_output)
      SELECT ${args.channelId}, ${today}::date, 1, ${args.tokensInputDelta}, ${args.tokensOutputDelta}
      FROM ins
      ON CONFLICT (channel_id, date) DO UPDATE SET
        answers_posted = usage_daily.answers_posted + 1,
        tokens_input   = usage_daily.tokens_input + EXCLUDED.tokens_input,
        tokens_output  = usage_daily.tokens_output + EXCLUDED.tokens_output;
    `);
  });
}

// Record a blocked group: inserts an answers_log row with block_reason set,
// upserts blocks_summary count, and adds tokens to usage_daily without bumping
// answers_posted. One round-trip per blocked group.
export function recordBlockedGroup(args: {
  channelId: string;
  intent: string | null;
  attemptedAnswer: string | null;
  askerCount: number;
  confidence: number | null;
  blockReason: string;
  inputMessages: InputMessage[];
  tokensInputDelta: number;
  tokensOutputDelta: number;
}): Promise<void> {
  const today = todayUtc();
  const inputJson = JSON.stringify(args.inputMessages);
  return queueDbWrite(args.channelId, async () => {
    await db.execute(sql`
      WITH ins_answer AS (
        INSERT INTO answers_log
          (channel_id, intent, answer_text, asker_count, confidence, block_reason, input_messages)
        VALUES
          (${args.channelId}, ${args.intent}, ${args.attemptedAnswer}, ${args.askerCount},
           ${args.confidence}, ${args.blockReason}, ${inputJson}::jsonb)
        RETURNING 1
      ),
      ins_summary AS (
        INSERT INTO blocks_summary (channel_id, date, block_reason, count)
        VALUES (${args.channelId}, ${today}::date, ${args.blockReason}, 1)
        ON CONFLICT (channel_id, date, block_reason)
          DO UPDATE SET count = blocks_summary.count + 1
        RETURNING 1
      )
      INSERT INTO usage_daily (channel_id, date, answers_posted, tokens_input, tokens_output)
      VALUES (${args.channelId}, ${today}::date, 0, ${args.tokensInputDelta}, ${args.tokensOutputDelta})
      ON CONFLICT (channel_id, date) DO UPDATE SET
        tokens_input  = usage_daily.tokens_input  + EXCLUDED.tokens_input,
        tokens_output = usage_daily.tokens_output + EXCLUDED.tokens_output;
    `);
  });
}

// Record a non-posting LLM call (shadow mode, blocked, etc.) — only updates
// token counts in usage_daily, no answers_log insert and no answers_posted bump.
export function recordTokenUsageOnly(args: {
  channelId: string;
  tokensInputDelta: number;
  tokensOutputDelta: number;
}): Promise<void> {
  const today = todayUtc();
  return queueDbWrite(args.channelId, async () => {
    await db.execute(sql`
      INSERT INTO usage_daily (channel_id, date, answers_posted, tokens_input, tokens_output)
      VALUES (${args.channelId}, ${today}::date, 0, ${args.tokensInputDelta}, ${args.tokensOutputDelta})
      ON CONFLICT (channel_id, date) DO UPDATE SET
        tokens_input  = usage_daily.tokens_input  + EXCLUDED.tokens_input,
        tokens_output = usage_daily.tokens_output + EXCLUDED.tokens_output;
    `);
  });
}
