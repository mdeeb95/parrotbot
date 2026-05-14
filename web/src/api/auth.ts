import { Hono } from "hono";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@parrot/db";
import { users, channels, DEFAULT_KB } from "@parrot/db/schema";
import {
  buildOAuthStateCookie,
  buildSessionCookie,
  clearOAuthStateCookie,
  clearSessionCookie,
  parseOAuthState,
} from "../lib/session.js";
import { buildAuthorizeUrl, exchangeCodeForToken, fetchTwitchUser } from "../lib/twitch.js";

const TEST_TWITCH_ID = "e2e-twitch-id";
const TEST_LOGIN = "e2e_user";

export const authRoutes = new Hono();

authRoutes.get("/twitch", (c) => {
  const state = crypto.randomUUID();
  c.header("Set-Cookie", buildOAuthStateCookie(state));
  return c.redirect(buildAuthorizeUrl(state));
});

authRoutes.get("/callback/twitch", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const expectedState = parseOAuthState(c.req.header("cookie"));

  c.header("Set-Cookie", clearOAuthStateCookie());

  if (!code || !state || !expectedState || state !== expectedState) {
    return c.redirect("/?error=auth_failed");
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const twitchUser = await fetchTwitchUser(accessToken);

    const [userRow] = await db
      .insert(users)
      .values({
        twitchId: twitchUser.id,
        twitchLogin: twitchUser.login,
        displayName: twitchUser.display_name,
        email: twitchUser.email || null,
        avatarUrl: twitchUser.profile_image_url || null,
      })
      .onConflictDoUpdate({
        target: users.twitchId,
        set: {
          twitchLogin: twitchUser.login,
          displayName: twitchUser.display_name,
          email: twitchUser.email || null,
          avatarUrl: twitchUser.profile_image_url || null,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!userRow) throw new Error("User upsert returned no row");

    const existing = await db
      .select()
      .from(channels)
      .where(eq(channels.userId, userRow.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(channels).values({
        userId: userRow.id,
        twitchChannel: twitchUser.login.toLowerCase(),
        kb: DEFAULT_KB,
      });
    }

    c.header(
      "Set-Cookie",
      buildSessionCookie({
        twitch_id: twitchUser.id,
        login: twitchUser.login,
        display_name: twitchUser.display_name,
        email: twitchUser.email,
        profile_image_url: twitchUser.profile_image_url,
      }),
      { append: true },
    );
    return c.redirect("/dashboard");
  } catch (err) {
    console.error("[oauth callback]", err);
    return c.redirect("/?error=auth_failed");
  }
});

authRoutes.post("/signout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.redirect("/", 303);
});

// Belt-and-suspenders: both env var AND non-prod required. Useful for local
// browser testing without going through real Twitch OAuth.
function devLoginEnabled(): boolean {
  return process.env.E2E_BYPASS_AUTH === "1" && process.env.NODE_ENV !== "production";
}

authRoutes.get("/dev/available", (c) =>
  devLoginEnabled() ? c.json({ ok: true }) : c.json({ ok: false }, 404),
);

authRoutes.post("/dev/test-login", async (c) => {
  if (!devLoginEnabled()) return c.json({ error: "disabled" }, 404);

  let [user] = await db.select().from(users).where(eq(users.twitchId, TEST_TWITCH_ID)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        twitchId: TEST_TWITCH_ID,
        twitchLogin: TEST_LOGIN,
        displayName: "E2E User",
        email: null,
        avatarUrl: null,
      })
      .returning();
  }
  if (!user) throw new Error("Test user upsert returned no row");

  const [existing] = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, user.id))
    .limit(1);
  if (!existing) {
    await db.insert(channels).values({
      userId: user.id,
      twitchChannel: TEST_LOGIN,
      kb: DEFAULT_KB,
    });
  }

  c.header(
    "Set-Cookie",
    buildSessionCookie({
      twitch_id: TEST_TWITCH_ID,
      login: TEST_LOGIN,
      display_name: "E2E User",
      email: "",
      profile_image_url: "",
    }),
  );
  return c.json({ ok: true });
});
