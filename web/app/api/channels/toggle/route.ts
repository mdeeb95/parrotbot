import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@parrot/db";
import { channels } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Body = z.object({ is_active: z.boolean() });

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const isActive = parsed.data.is_active;
  if (isActive) {
    const hasIdentity = !!ctx.channel.kb.identity?.name?.trim();
    if (!ctx.channel.isModded || !hasIdentity) {
      return NextResponse.json({ error: "setup_incomplete" }, { status: 400 });
    }
  }

  await db
    .update(channels)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(channels.id, ctx.channel.id));

  return NextResponse.json({ ok: true, is_active: isActive });
}
