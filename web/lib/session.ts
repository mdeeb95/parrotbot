import { cookies } from "next/headers";
import crypto from "node:crypto";

export type Session = {
  twitch_id: string;
  login: string;
  display_name: string;
  email: string;
  profile_image_url: string;
};

const SESSION_COOKIE = "parrot_session";
const STATE_COOKIE = "parrot_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function decode(value: string): Session | null {
  const dot = value.indexOf(".");
  if (dot === -1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(payload);
  // timingSafeEqual requires equal-length buffers
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  const value = cookies().get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return decode(value);
}

export function setSession(session: Session) {
  cookies().set(SESSION_COOKIE, encode(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

export function setOAuthState(state: string) {
  cookies().set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
}

export function consumeOAuthState(): string | null {
  const value = cookies().get(STATE_COOKIE)?.value ?? null;
  cookies().delete(STATE_COOKIE);
  return value;
}
