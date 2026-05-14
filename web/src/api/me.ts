import { Hono } from "hono";
import { resolveAuthContext } from "../lib/auth.js";
import { requireSession, type SessionVars } from "../middleware/session.js";

export const meRoutes = new Hono<{ Variables: SessionVars }>();

meRoutes.use("*", requireSession("json"));

meRoutes.get("/", async (c) => {
  const channelOverride = c.req.query("channel");
  const ctx = await resolveAuthContext(c.get("session"), channelOverride);
  if (!ctx) return c.json({ error: "no_channel" }, 404);

  return c.json({
    user: {
      display_name: ctx.user.displayName,
      twitch_login: ctx.user.twitchLogin,
      avatar_url: ctx.user.avatarUrl,
    },
    primary_login: ctx.user.twitchLogin,
    all_channels: ctx.allChannels.map((c) => ({ twitch_channel: c.twitchChannel })),
    active_channel: ctx.channel.twitchChannel,
    is_primary: ctx.isPrimary,
  });
});
