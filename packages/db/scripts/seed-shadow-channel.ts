import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { users, channels, type KnowledgeBase } from "../src/schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Seeds a channel in shadow mode: the worker reads its chat and logs what it
// would have answered, but never posts. Useful for evaluating answer quality
// against real chat volume before a streamer opts in.
//   DATABASE_URL=... tsx packages/db/scripts/seed-shadow-channel.ts <twitch_login>
const CHANNEL_LOGIN = process.argv[2]?.toLowerCase();
if (!CHANNEL_LOGIN) {
  console.error("usage: seed-shadow-channel.ts <twitch_login>");
  process.exit(1);
}
const SHADOW_USER_LOGIN = `_shadow_${CHANNEL_LOGIN}_owner`;

// Example knowledge base. Replace with facts about the channel being shadowed.
const KB: KnowledgeBase = {
  identity: { name: "ExampleStreamer", pronouns: "they/them" },
  bio: "Variety streamer focused on WoW Classic Hardcore challenge runs.",
  game: "WoW Classic Hardcore — self-found challenge run.",
  schedule:
    "Streams weekdays, around 6 hours per session. Typically goes live around 9am Pacific.",
  links: [
    { label: "YouTube", url: "https://youtube.com/@examplestreamer" },
    { label: "Discord", url: "https://discord.gg/examplestreamer" },
  ],
  custom_fields: [
    { label: "Server", value: "Example Realm" },
    { label: "Run rules", value: "Self-found, no dungeons before 20" },
  ],
  custom_qa: [
    {
      question: "What server are you on?",
      answer: "Example Realm — WoW Classic Hardcore.",
    },
    {
      question: "What are the rules of this run?",
      answer: "Self-found, Hardcore (one life), no dungeons before 20.",
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
          twitchId: `shadow-${CHANNEL_LOGIN}`,
          twitchLogin: SHADOW_USER_LOGIN,
          displayName: `Shadow Owner (${CHANNEL_LOGIN})`,
          email: null,
          avatarUrl: null,
          plan: "free",
        })
        .returning();
      userId = created.id;
      console.log(`created shadow user: ${userId}`);
    }

    // 2. Find-or-update the channel row.
    const [existingChannel] = await db
      .select()
      .from(channels)
      .where(eq(channels.twitchChannel, CHANNEL_LOGIN))
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
        `updated existing ${CHANNEL_LOGIN} channel: ${existingChannel.id} (shadow_mode=true)`,
      );
    } else {
      const [created] = await db
        .insert(channels)
        .values({
          userId,
          twitchChannel: CHANNEL_LOGIN,
          isActive: true,
          isModded: true,
          kb: KB,
          settings: { shadow_mode: true },
        })
        .returning();
      console.log(`created ${CHANNEL_LOGIN} channel: ${created.id} (shadow_mode=true)`);
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
