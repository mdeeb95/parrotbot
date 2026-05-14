import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { channels } from "@parrot/db/schema";
import { resolveAuthContext } from "../lib/auth.js";
import { requireSession, type SessionVars } from "../middleware/session.js";

export const channelRoutes = new Hono<{ Variables: SessionVars }>();

channelRoutes.use("*", requireSession("json"));

channelRoutes.post("/toggle", async (c) => {
  const ctx = await resolveAuthContext(c.get("session"));
  if (!ctx) return c.json({ error: "no_channel" }, 404);
  if (!ctx.isPrimary) return c.json({ error: "read_only" }, 403);

  const body = (await c.req.json().catch(() => null)) as { is_active?: unknown } | null;
  if (typeof body?.is_active !== "boolean") return c.json({ error: "invalid_body" }, 400);

  if (body.is_active) {
    const hasIdentity = Boolean(ctx.channel.kb.identity?.name?.trim());
    if (!ctx.channel.isModded || !hasIdentity) {
      return c.json({ error: "setup_incomplete" }, 400);
    }
  }

  await db
    .update(channels)
    .set({ isActive: body.is_active, updatedAt: new Date() })
    .where(eq(channels.id, ctx.channel.id));

  return c.json({ ok: true, is_active: body.is_active });
});

channelRoutes.post("/mod-confirm", async (c) => {
  const ctx = await resolveAuthContext(c.get("session"));
  if (!ctx) return c.json({ error: "no_channel" }, 404);
  if (!ctx.isPrimary) return c.json({ error: "read_only" }, 403);

  await db
    .update(channels)
    .set({ isModded: true, updatedAt: new Date() })
    .where(eq(channels.id, ctx.channel.id));

  return c.json({ ok: true });
});
