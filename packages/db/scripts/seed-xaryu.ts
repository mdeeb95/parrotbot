import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users, channels, type KnowledgeBase } from "../src/schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const XARYU_TWITCH_LOGIN = "xaryu";
const XARYU_TWITCH_ID = "32085830";
const SHADOW_USER_LOGIN = "_shadow_xaryu_owner";

const KB: KnowledgeBase = {
  identity: { name: "Xaryu", pronouns: "he/him" },
  bio: "Real name Josh Lujan. Multi-Rank-1 Mage and longtime WoW streamer (since 2012). Known for fitness/health content alongside gaming.",
  game: "WoW Classic Hardcore — currently doing a Gnome-only, no-healers challenge run on Skull Rock.",
  schedule:
    "Streams almost daily, around 8 hours per session. Typically goes live around 9am Pacific (12pm Eastern / 5pm UK). No fixed off-days.",
  links: [
    { label: "Twitter / X", url: "https://twitter.com/xaryu" },
    { label: "YouTube", url: "https://youtube.com/user/xaryutv" },
    { label: "TikTok", url: "https://tiktok.com/@xaryu" },
    { label: "Instagram", url: "https://instagram.com/joshlujan" },
    { label: "Discord", url: "https://discord.gg/xaryu" },
    { label: "Store", url: "https://xaryu.tv" },
  ],
  custom_fields: [
    { label: "Server", value: "Skull Rock" },
    { label: "Character", value: "Xaryulocked (Gnome)" },
    { label: "Run rules", value: "Gnome-only, no healers" },
  ],
  custom_qa: [
    {
      question: "What server are you on?",
      answer: "Skull Rock — WoW Classic Hardcore.",
    },
    {
      question: "What's your character name?",
      answer: "Xaryulocked, a gnome on Skull Rock.",
    },
    {
      question: "What are the rules of this run?",
      answer: "Gnome-only, no healers, Hardcore (one life). Skull Rock server.",
    },
    {
      question: "How long have you been streaming?",
      answer: "Since 2012 — over a decade on Twitch.",
    },
  ],
};

async function main() {
  const client = postgres(url!, { prepare: false });
  const db = drizzle(client);

  try {
    // 1. Find-or-create the shadow owner user.
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.twitchLogin, SHADOW_USER_LOGIN))
      .limit(1);

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      console.log(`shadow user already exists: ${userId}`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          twitchId: `shadow-${XARYU_TWITCH_ID}`,
          twitchLogin: SHADOW_USER_LOGIN,
          displayName: "Shadow Owner (Xaryu)",
          email: null,
          avatarUrl: null,
          plan: "free",
        })
        .returning();
      userId = created.id;
      console.log(`created shadow user: ${userId}`);
    }

    // 2. Find-or-update the xaryu channel row.
    const [existingChannel] = await db
      .select()
      .from(channels)
      .where(eq(channels.twitchChannel, XARYU_TWITCH_LOGIN))
      .limit(1);

    if (existingChannel) {
      await db
        .update(channels)
        .set({
          isActive: true,
          isModded: true,
          kb: KB,
          settings: { shadow_mode: true },
        })
        .where(eq(channels.id, existingChannel.id));
      console.log(
        `updated existing xaryu channel: ${existingChannel.id} (shadow_mode=true)`,
      );
    } else {
      const [created] = await db
        .insert(channels)
        .values({
          userId,
          twitchChannel: XARYU_TWITCH_LOGIN,
          isActive: true,
          isModded: true,
          kb: KB,
          settings: { shadow_mode: true },
        })
        .returning();
      console.log(`created xaryu channel: ${created.id} (shadow_mode=true)`);
    }

    console.log("done.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
