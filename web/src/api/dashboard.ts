import { Hono } from "hono";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@parrot/db";
import { usageDaily, answersLog, blocksSummary } from "@parrot/db/schema";
import { resolveAuthContext } from "../lib/auth.js";
import { categorize, labelFor } from "../lib/block-reasons.js";
import { requireSession, type SessionVars } from "../middleware/session.js";

const FREE_LIMIT = 500;

export const dashboardRoutes = new Hono<{ Variables: SessionVars }>();

dashboardRoutes.use("*", requireSession("json"));

dashboardRoutes.get("/", async (c) => {
  const channelOverride = c.req.query("channel");
  const ctx = await resolveAuthContext(c.get("session"), channelOverride);
  if (!ctx) return c.json({ error: "no_channel" }, 404);

  const { channel, user, isPrimary, allChannels } = ctx;
  const today = todayDateString();
  const monthStart = monthStartString();

  const [monthRow] = await db
    .select({ total: sql<number>`coalesce(sum(${usageDaily.answersPosted}), 0)::int` })
    .from(usageDaily)
    .where(and(eq(usageDaily.channelId, channel.id), sql`${usageDaily.date} >= ${monthStart}`));

  const [todayRow] = await db
    .select()
    .from(usageDaily)
    .where(and(eq(usageDaily.channelId, channel.id), eq(usageDaily.date, today)))
    .limit(1);

  const topIntent = await db
    .select({ intent: answersLog.intent, count: sql<number>`count(*)::int` })
    .from(answersLog)
    .where(and(eq(answersLog.channelId, channel.id), sql`${answersLog.ts} >= current_date`))
    .groupBy(answersLog.intent)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const todayBlocks = await db
    .select()
    .from(blocksSummary)
    .where(and(eq(blocksSummary.channelId, channel.id), eq(blocksSummary.date, today)));

  const monthAnswers = monthRow?.total ?? 0;
  const todayAnswers = todayRow?.answersPosted ?? 0;
  const hasIdentity = Boolean(channel.kb.identity?.name?.trim());

  return c.json({
    user: { display_name: user.displayName },
    channel: {
      twitch_channel: channel.twitchChannel,
      is_active: channel.isActive,
      is_modded: channel.isModded,
    },
    all_channels: allChannels.map((c) => ({ twitch_channel: c.twitchChannel })),
    is_primary: isPrimary,
    setup: { is_modded: channel.isModded, has_identity: hasIdentity },
    usage: {
      month: monthAnswers,
      today: todayAnswers,
      limit: FREE_LIMIT,
      top_intent: topIntent[0]?.intent ?? null,
    },
    today_blocks: todayBlocks
      .map((r) => {
        const { title, explainer } = labelFor(r.blockReason);
        return {
          reason: r.blockReason,
          count: r.count,
          title,
          explainer,
          category: categorize(r.blockReason),
        };
      })
      .sort((a, b) => b.count - a.count),
  });
});

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function monthStartString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
