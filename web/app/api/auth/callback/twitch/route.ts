import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { consumeOAuthState, setSession } from "@/lib/session";
import { exchangeCodeForToken, fetchTwitchUser } from "@/lib/twitch";
import { db } from "@parrot/db";
import { users, channels, DEFAULT_KB } from "@parrot/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  const failure = NextResponse.redirect(`${appUrl}/?error=auth_failed`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = consumeOAuthState();

  if (!code || !state || !expectedState || state !== expectedState) {
    return failure;
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

    setSession({
      twitch_id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      email: twitchUser.email,
      profile_image_url: twitchUser.profile_image_url,
    });
    return NextResponse.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    console.error("[oauth callback]", err);
    return failure;
  }
}
