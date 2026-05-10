import { and, asc, eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { users, channels, type ChannelRow, type UserRow } from "@parrot/db/schema";
import { getSession } from "@/lib/session";

export type AuthContext = {
  user: UserRow;
  channel: ChannelRow;
  // True when `channel` is the user's primary (matching their twitch_login).
  // False when viewing another channel they own (read-only mode).
  isPrimary: boolean;
  // All channels this user owns, oldest first. Used to render a switcher.
  allChannels: ChannelRow[];
};

export async function getAuthContext(
  twitchChannelOverride?: string,
): Promise<AuthContext | null> {
  const session = getSession();
  if (!session) return null;

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
    allChannels.find((c) => c.twitchChannel === user.twitchLogin) ??
    allChannels[0];

  let channel = primary;
  if (twitchChannelOverride) {
    // Filter MUST include user.id — never trust the query param alone.
    const [override] = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.userId, user.id),
          eq(channels.twitchChannel, twitchChannelOverride),
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
