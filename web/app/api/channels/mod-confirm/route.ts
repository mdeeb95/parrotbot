import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { channels } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await db
    .update(channels)
    .set({ isModded: true, updatedAt: new Date() })
    .where(eq(channels.id, ctx.channel.id));

  return NextResponse.json({ ok: true });
}
