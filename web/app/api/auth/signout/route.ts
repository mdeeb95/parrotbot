import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  clearSession();
  const appUrl = process.env.APP_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(`${appUrl}/`, { status: 303 });
}
