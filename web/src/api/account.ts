import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { users } from "@parrot/db/schema";
import { resolveAuthContext } from "../lib/auth.js";
import { clearSessionCookie } from "../lib/session.js";
import { requireSession, type SessionVars } from "../middleware/session.js";

export const accountRoutes = new Hono<{ Variables: SessionVars }>();

accountRoutes.use("*", requireSession("json"));

accountRoutes.get("/", async (c) => {
  const ctx = await resolveAuthContext(c.get("session"));
  if (!ctx) return c.json({ error: "no_channel" }, 404);
  return c.json({
    twitch_login: ctx.user.twitchLogin,
    email: ctx.user.email,
    plan: ctx.user.plan,
  });
});

accountRoutes.post("/delete", async (c) => {
  const ctx = await resolveAuthContext(c.get("session"));
  if (!ctx) return c.json({ error: "no_channel" }, 404);

  const body = (await c.req.json().catch(() => null)) as { confirm_username?: unknown } | null;
  const confirm = typeof body?.confirm_username === "string" ? body.confirm_username : "";
  if (confirm.toLowerCase() !== ctx.user.twitchLogin.toLowerCase()) {
    return c.json({ error: "username_mismatch" }, 400);
  }

  await db.delete(users).where(eq(users.id, ctx.user.id));
  c.header("Set-Cookie", clearSessionCookie());
  return c.json({ ok: true });
});
