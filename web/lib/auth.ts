import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { users, channels, type ChannelRow, type UserRow } from "@parrot/db/schema";
import { getSession } from "@/lib/session";

export type AuthContext = { user: UserRow; channel: ChannelRow };

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.twitchId, session.twitch_id))
    .limit(1);
  if (!user) return null;

  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, user.id))
    .limit(1);
  if (!channel) return null;

  return { user, channel };
}
