import { db } from "@parrot/db";
import { channels, type ChannelRow } from "@parrot/db/schema";
import { channelSettingsSchema } from "@parrot/db/kb-schema";
import { eq, and } from "drizzle-orm";
import type { Client } from "tmi.js";
import type { ChannelState } from "./types.js";
import { hashKb, deriveIntents, extractKbUrls } from "./kb.js";
import { invalidateCache } from "./llm.js";
import { reloadCapForChannel, disposeCap } from "./cap.js";
import { logger } from "./logger.js";

const RECONCILE_INTERVAL_MS = 30_000;
const JOIN_RATE = 18;
const JOIN_REFILL_MS = 10_000;

class TokenBucket {
  private tokens: number;
  constructor(private capacity: number, private refillMs: number) {
    this.tokens = capacity;
    setInterval(() => {
      this.tokens = capacity;
    }, refillMs).unref();
  }
  async take(): Promise<void> {
    while (this.tokens <= 0) {
      await new Promise((r) => setTimeout(r, 250));
    }
    this.tokens -= 1;
  }
}

const joinBucket = new TokenBucket(JOIN_RATE, JOIN_REFILL_MS);

async function fetchActiveChannels(): Promise<ChannelRow[]> {
  return db
    .select()
    .from(channels)
    .where(and(eq(channels.isActive, true), eq(channels.isModded, true)));
}

export type ReconcileDeps = {
  client: Client;
  joined: Map<string, ChannelState>;
  buildState: (row: ChannelRow) => ChannelState;
  disposeState: (state: ChannelState) => void;
};

async function joinThrottled(
  client: Client,
  twitchChannel: string,
): Promise<boolean> {
  await joinBucket.take();
  try {
    await client.join("#" + twitchChannel);
    logger.info({ twitchChannel }, "joined channel");
    return true;
  } catch (err) {
    logger.warn({ err, twitchChannel }, "join failed");
    return false;
  }
}

async function partChannel(client: Client, twitchChannel: string): Promise<void> {
  try {
    await client.part("#" + twitchChannel);
    logger.info({ twitchChannel }, "parted channel");
  } catch (err) {
    logger.warn({ err, twitchChannel }, "part failed");
  }
}

async function reconcileOnce(deps: ReconcileDeps): Promise<void> {
  // Bail if the IRC client isn't actually connected — joins will fail with
  // "Not connected to server." and leave stale entries in the joined map.
  let ircState: string;
  try {
    ircState = deps.client.readyState();
  } catch {
    ircState = "CLOSED";
  }
  if (ircState !== "OPEN") {
    logger.debug({ ircState }, "reconcile skipped: irc not connected");
    return;
  }

  let rows: ChannelRow[];
  try {
    rows = await fetchActiveChannels();
  } catch (err) {
    logger.error({ err }, "reconcile query failed");
    return;
  }

  const seen = new Set<string>();
  const joinTasks: Promise<unknown>[] = [];

  for (const row of rows) {
    const key = row.twitchChannel.toLowerCase();
    seen.add(key);
    const existing = deps.joined.get(key);
    if (!existing) {
      const state = deps.buildState(row);
      deps.joined.set(key, state);
      joinTasks.push(
        joinThrottled(deps.client, key)
          .then((ok) => {
            if (ok) return reloadCapForChannel(state.channelId);
            // Roll back so the next reconcile tick retries the join.
            if (deps.joined.get(key) === state) {
              deps.disposeState(state);
              deps.joined.delete(key);
            }
          }),
      );
      continue;
    }

    // Hot reload: KB changed?
    const newHash = hashKb(row.kb);
    if (newHash !== existing.kbHash) {
      existing.kb = row.kb;
      existing.kbHash = newHash;
      existing.kbVersion += 1;
      existing.kbUrlAllowlist = extractKbUrls(row.kb);
      existing.intentVocab = deriveIntents(row.kb);
      invalidateCache(existing.channelId);
      logger.info(
        { channelId: existing.channelId, twitchChannel: key },
        "kb reloaded",
      );
    }

    // Settings (shadow_mode).
    const parsed = channelSettingsSchema.safeParse(row.settings);
    if (!parsed.success) {
      logger.warn(
        { channelId: existing.channelId, twitchChannel: key },
        "channels.settings malformed; defaulting to {}",
      );
      existing.shadowMode = false;
    } else {
      existing.shadowMode = parsed.data.shadow_mode === true;
    }
  }

  // Part anything no longer active.
  for (const [key, state] of deps.joined.entries()) {
    if (seen.has(key)) continue;
    deps.joined.delete(key);
    deps.disposeState(state);
    disposeCap(state.channelId);
    await partChannel(deps.client, key);
  }

  await Promise.allSettled(joinTasks);
}

export function startReconcileLoop(deps: ReconcileDeps): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const tick = async () => {
    if (stopped) return;
    try {
      await reconcileOnce(deps);
    } catch (err) {
      logger.error({ err }, "reconcile tick failed");
    }
    if (!stopped) {
      timer = setTimeout(tick, RECONCILE_INTERVAL_MS);
    }
  };

  // First tick runs immediately and awaits the initial join queue drain
  // before scheduling further ticks (handled by tick() chaining).
  tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
