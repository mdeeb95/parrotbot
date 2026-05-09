import "./env";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import tmi from "tmi.js";
import type { ChannelRow } from "@parrot/db/schema";
import { logger } from "./logger";
import type { ChannelState } from "./types";
import { createBatcher } from "./batcher";
import { createCooldowns } from "./cooldowns";
import { createStrikeTracker, loadBlocklist } from "./safety";
import { hashKb, deriveIntents, extractKbUrls } from "./kb";
import { createPipeline } from "./pipeline";
import { startReconcileLoop } from "./reconcile";
import { startHealthServer } from "./health";
import {
  initR2,
  startR2FlushLoop,
  drainAllDbQueues,
} from "./log";
import { invalidateCache } from "./llm";

function fail(msg: string): never {
  logger.fatal(msg);
  process.exit(1);
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) fail("ANTHROPIC_API_KEY is not set");
if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set");

const botUsername = process.env.BOT_USERNAME;
const botOauth = process.env.BOT_OAUTH;
if (!botUsername || !botOauth || botOauth.includes("xxxx")) {
  fail("BOT_USERNAME and a real BOT_OAUTH are required");
}

const model = process.env.MODEL ?? "claude-haiku-4-5-20251001";
const batchWindowMs = parseInt(process.env.BATCH_WINDOW_MS ?? "30000", 10);
const batchMaxSize = parseInt(process.env.BATCH_MAX_SIZE ?? "10", 10);
const confidenceThreshold = parseFloat(
  process.env.CONFIDENCE_THRESHOLD ?? "0.8",
);
const dailyTokenCap = parseInt(
  process.env.DAILY_TOKEN_CAP_PER_CHANNEL ?? "200000",
  10,
);
const intentCooldownMin = parseInt(process.env.INTENT_COOLDOWN_MIN ?? "5", 10);
const authorRateLimitSec = parseInt(
  process.env.AUTHOR_RATE_LIMIT_SEC ?? "60",
  10,
);
const injectionStrikeLimit = parseInt(
  process.env.INJECTION_STRIKE_LIMIT ?? "3",
  10,
);
const port = parseInt(process.env.PORT ?? "3001", 10);

const postAllowlistRaw = process.env.ALLOWED_POST_CHANNELS?.trim();
const postAllowlist = postAllowlistRaw
  ? new Set(
      postAllowlistRaw
        .split(",")
        .map((s) => s.trim().replace(/^#/, "").toLowerCase())
        .filter((s) => s.length > 0),
    )
  : null;
if (postAllowlist) {
  logger.warn(
    { allowed: [...postAllowlist] },
    "ALLOWED_POST_CHANNELS set — posts to other channels will be refused",
  );
}

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const blocklistPath = process.env.BLOCKLIST_PATH ?? join(__dirname, "..", "blocklist.txt");
const blocklist = loadBlocklist(blocklistPath);
logger.info({ size: blocklist.length, path: blocklistPath }, "blocklist loaded");

initR2({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
});

const client = new tmi.Client({
  options: { debug: false },
  connection: { reconnect: true, secure: true },
  identity: { username: botUsername!, password: botOauth! },
  channels: [],
});

const joined = new Map<string, ChannelState>();

const pipeline = createPipeline({
  client,
  model,
  confidenceThreshold,
  blocklist,
  dailyTokenCap,
  botUsername: botUsername!,
  postAllowlist,
});

function buildState(row: ChannelRow): ChannelState {
  const state: ChannelState = {
    channelId: row.id,
    twitchChannel: row.twitchChannel.toLowerCase(),
    kb: row.kb,
    kbHash: hashKb(row.kb),
    kbVersion: 1,
    kbUrlAllowlist: extractKbUrls(row.kb),
    intentVocab: deriveIntents(row.kb),
    shadowMode: (row.settings as { shadow_mode?: boolean })?.shadow_mode === true,
    postingDisabled: false,
    batcher: createBatcher({
      windowMs: batchWindowMs,
      maxSize: batchMaxSize,
      onFlush: (msgs) => pipeline.processBatch(state, msgs),
    }),
    cooldowns: createCooldowns({ authorRateLimitSec, intentCooldownMin }),
    strikes: createStrikeTracker({ strikeLimit: injectionStrikeLimit }),
    bannedAuthors: new Set(),
    stats: { seen: 0, kept: 0, posted: 0, blocked: 0 },
  };
  return state;
}

function disposeState(state: ChannelState): void {
  state.batcher.shutdown();
  invalidateCache(state.channelId);
}

client.on("connected", (addr, port) => {
  logger.info({ addr, port, bot: botUsername }, "connected to twitch");
});

client.on("disconnected", (reason) => {
  logger.warn({ reason }, "disconnected from twitch");
});

client.on("reconnect", () => {
  logger.info("reconnecting to twitch");
});

client.on("message", (channel, tags, text, self) => {
  const key = channel.replace(/^#/, "").toLowerCase();
  logger.debug(
    { twitchChannel: key, author: tags.username, self, text: text.slice(0, 80) },
    "irc message received",
  );
  const state = joined.get(key);
  if (!state) {
    logger.warn({ twitchChannel: key }, "message for unjoined channel, dropping");
    return;
  }
  pipeline.handleMessage(state, tags, text, self).catch((err) => {
    logger.error({ err, twitchChannel: key }, "handleMessage threw");
  });
});

const stopReconcile = startReconcileLoop({
  client,
  joined,
  buildState,
  disposeState,
});

const stopR2Flush = startR2FlushLoop(60_000);

const healthServer = startHealthServer({
  client,
  channelCount: () => joined.size,
  port,
});

client.connect().catch((err) => fail(`tmi connect failed: ${err?.message ?? err}`));

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  try {
    stopReconcile();
    for (const state of joined.values()) state.batcher.shutdown();
    await stopR2Flush();
    await drainAllDbQueues();
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
    healthServer.close();
  } catch (err) {
    logger.error({ err }, "shutdown error");
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandled rejection");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaught exception");
});

logger.info("worker started");
