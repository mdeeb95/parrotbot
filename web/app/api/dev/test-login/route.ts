import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { users, channels, DEFAULT_KB } from "@parrot/db/schema";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const TEST_TWITCH_ID = "e2e-twitch-id";
const TEST_LOGIN = "e2e_user";

export async function POST() {
  // Hard refusal in production. Belt-and-suspenders: env gate AND NODE_ENV gate.
  if (process.env.E2E_BYPASS_AUTH !== "1") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  // Idempotent upsert of test user.
  let user = (
    await db.select().from(users).where(eq(users.twitchId, TEST_TWITCH_ID)).limit(1)
  )[0];
  if (!user) {
    user = (
      await db
        .insert(users)
        .values({
          twitchId: TEST_TWITCH_ID,
          twitchLogin: TEST_LOGIN,
          displayName: "E2E User",
          email: null,
          avatarUrl: null,
        })
        .returning()
    )[0];
  }

  // Idempotent upsert of test channel for this user.
  const existing = (
    await db.select().from(channels).where(eq(channels.userId, user.id)).limit(1)
  )[0];
  if (!existing) {
    await db.insert(channels).values({
      userId: user.id,
      twitchChannel: TEST_LOGIN,
      isActive: false,
      isModded: false,
      kb: DEFAULT_KB,
      settings: {},
    });
  }

  setSession({
    twitch_id: TEST_TWITCH_ID,
    login: TEST_LOGIN,
    display_name: "E2E User",
    email: "",
    profile_image_url: "",
  });

  return NextResponse.json({ ok: true });
}
