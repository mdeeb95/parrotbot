import { and, asc, eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { users, channels, type ChannelRow, type UserRow } from "@parrot/db/schema";
import type { Session } from "./session.js";

export type AuthContext = {
  user: UserRow;
  channel: ChannelRow;
  isPrimary: boolean;
  allChannels: ChannelRow[];
};

export async function resolveAuthContext(
  session: Session,
  channelOverride?: string,
): Promise<AuthContext | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.twitchId, session.twitch_id))
    .limit(1);
  if (!user) return null;

  const allChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.userId, user.id))
    .orderBy(asc(channels.createdAt));
  if (allChannels.length === 0) return null;

  const primary =
    allChannels.find((c) => c.twitchChannel === user.twitchLogin) ?? allChannels[0]!;

  let channel = primary;
  if (channelOverride) {
    const [override] = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.userId, user.id),
          eq(channels.twitchChannel, channelOverride),
        ),
      )
      .limit(1);
    if (override) channel = override;
  }

  return {
    user,
    channel,
    isPrimary: channel.id === primary.id,
    allChannels,
  };
}
