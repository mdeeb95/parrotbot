import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@parrot/db";
import { channels } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";
import { parseKbBody } from "@/lib/kb-body";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(ctx.channel.kb);
}

export async function PUT(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const result = parseKbBody(body);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  await db
    .update(channels)
    .set({ kb: result.data, updatedAt: new Date() })
    .where(eq(channels.id, ctx.channel.id));

  return NextResponse.json({ ok: true });
}
