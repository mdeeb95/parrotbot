import { db } from "@parrot/db";
import { usageDaily } from "@parrot/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger.js";

type CapState = { tokens: number; date: string };

const cap = new Map<string, CapState>();

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function reloadCapForChannel(channelId: string): Promise<void> {
  const today = todayUtc();
  const rows = await db
    .select({
      tokensInput: usageDaily.tokensInput,
      tokensOutput: usageDaily.tokensOutput,
    })
    .from(usageDaily)
    .where(and(eq(usageDaily.channelId, channelId), eq(usageDaily.date, today)))
    .limit(1);
  const total = rows.length
    ? Number(rows[0].tokensInput ?? 0) + Number(rows[0].tokensOutput ?? 0)
    : 0;
  cap.set(channelId, { tokens: total, date: today });
}

export async function reloadCaps(channelIds: string[]): Promise<void> {
  for (const id of channelIds) {
    try {
      await reloadCapForChannel(id);
    } catch (err) {
      logger.warn({ err, channelId: id }, "cap reload failed");
    }
  }
}

export function isOverCap(channelId: string, limit: number): boolean {
  const today = todayUtc();
  const state = cap.get(channelId);
  if (!state || state.date !== today) {
    cap.set(channelId, { tokens: 0, date: today });
    return false;
  }
  return state.tokens >= limit;
}

export function addTokens(channelId: string, n: number): void {
  const today = todayUtc();
  const state = cap.get(channelId);
  if (!state || state.date !== today) {
    cap.set(channelId, { tokens: n, date: today });
    return;
  }
  state.tokens += n;
}

export function getTokens(channelId: string): number {
  const today = todayUtc();
  const state = cap.get(channelId);
  if (!state || state.date !== today) return 0;
  return state.tokens;
}

export function disposeCap(channelId: string): void {
  cap.delete(channelId);
}
