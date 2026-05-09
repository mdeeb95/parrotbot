import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@parrot/db";
import { users } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";
import { clearSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ confirm_username: z.string() });

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
  if (parsed.data.confirm_username.toLowerCase() !== ctx.user.twitchLogin.toLowerCase()) {
    return NextResponse.json({ error: "username_mismatch" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, ctx.user.id));
  clearSession();
  return NextResponse.json({ ok: true });
}
