import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { setOAuthState } from "@/lib/session";
import { buildAuthorizeUrl } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomUUID();
  setOAuthState(state);
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
