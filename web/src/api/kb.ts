import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { channels } from "@parrot/db/schema";
import { resolveAuthContext } from "../lib/auth.js";
import { validateKb } from "../lib/validate-kb.js";
import { requireSession, type SessionVars } from "../middleware/session.js";

export const kbRoutes = new Hono<{ Variables: SessionVars }>();

kbRoutes.use("*", requireSession("json"));

kbRoutes.get("/", async (c) => {
  const channelOverride = c.req.query("channel");
  const ctx = await resolveAuthContext(c.get("session"), channelOverride);
  if (!ctx) return c.json({ error: "no_channel" }, 404);
  return c.json({ kb: ctx.channel.kb, is_primary: ctx.isPrimary, twitch_channel: ctx.channel.twitchChannel });
});

kbRoutes.put("/", async (c) => {
  const ctx = await resolveAuthContext(c.get("session"));
  if (!ctx) return c.json({ error: "no_channel" }, 404);
  if (!ctx.isPrimary) return c.json({ error: "read_only" }, 403);

  const body = await c.req.json().catch(() => null);
  const result = validateKb(body);
  if (!result.ok) return c.json({ error: "invalid_body", errors: result.errors }, 400);

  await db
    .update(channels)
    .set({ kb: result.data, updatedAt: new Date() })
    .where(eq(channels.id, ctx.channel.id));

  return c.json({ ok: true });
});
