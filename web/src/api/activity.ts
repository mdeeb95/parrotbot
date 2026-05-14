import { Hono } from "hono";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@parrot/db";
import { answersLog, blocksSummary } from "@parrot/db/schema";
import { resolveAuthContext } from "../lib/auth.js";
import { STREAMER_ACTIONABLE_REASONS, categorize, labelFor } from "../lib/block-reasons.js";
import { requireSession, type SessionVars } from "../middleware/session.js";

const PAGE_SIZE = 25;
const ACTIONABLE: readonly string[] = STREAMER_ACTIONABLE_REASONS;

export const activityRoutes = new Hono<{ Variables: SessionVars }>();

activityRoutes.use("*", requireSession("json"));

activityRoutes.get("/", async (c) => {
  const channelOverride = c.req.query("channel");
  const ctx = await resolveAuthContext(c.get("session"), channelOverride);
  if (!ctx) return c.json({ error: "no_channel" }, 404);

  const mode = c.req.query("show") === "all" ? "all" : "actionable";
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const channelId = ctx.channel.id;

  const filter =
    mode === "all"
      ? eq(answersLog.channelId, channelId)
      : and(
          eq(answersLog.channelId, channelId),
          or(isNull(answersLog.blockReason), inArray(answersLog.blockReason, [...ACTIONABLE])),
        );

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(answersLog)
    .where(filter);
  const total = totalRows[0]?.total ?? 0;

  const rows = await db
    .select()
    .from(answersLog)
    .where(filter)
    .orderBy(desc(answersLog.ts))
    .limit(PAGE_SIZE)
    .offset(offset);

  const today = new Date().toISOString().slice(0, 10);
  const summaryRows = await db
    .select()
    .from(blocksSummary)
    .where(and(eq(blocksSummary.channelId, channelId), eq(blocksSummary.date, today)));

  return c.json({
    mode,
    page,
    page_size: PAGE_SIZE,
    total,
    total_pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    is_primary: ctx.isPrimary,
    rows: rows.map((r) => {
      const blocked = r.blockReason != null;
      const inputs = r.inputMessages ?? [];
      const firstInput = inputs[0]?.text ?? "—";
      const label = blocked ? labelFor(r.blockReason!) : null;
      return {
        id: r.id,
        ts: r.ts.toISOString(),
        intent: r.intent,
        answer_text: r.answerText,
        asker_count: r.askerCount,
        first_input: firstInput,
        block: blocked
          ? {
              reason: r.blockReason!,
              category: categorize(r.blockReason!),
              title: label!.title,
              explainer: label!.explainer,
            }
          : null,
      };
    }),
    today_blocks: summaryRows
      .map((r) => {
        const label = labelFor(r.blockReason);
        return {
          reason: r.blockReason,
          count: r.count,
          category: categorize(r.blockReason),
          title: label.title,
          explainer: label.explainer,
        };
      })
      .sort((a, b) => b.count - a.count),
  });
});
