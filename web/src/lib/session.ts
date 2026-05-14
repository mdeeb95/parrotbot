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
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const STATE_MAX_AGE_SECONDS = 60 * 10;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to a string of at least 32 characters");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(value: string): Session | null {
  const dot = value.indexOf(".");
  if (dot === -1) return null;
  const payload = value.slice(0, dot);
  const sig = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(sig, expected)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const prefix = `${name}=`;
  for (const part of header.split("; ")) {
    if (part.startsWith(prefix)) return part.slice(prefix.length);
  }
  return null;
}

function cookieString(name: string, value: string, maxAgeSeconds: number): string {
  const flags = [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") flags.push("Secure");
  return flags.join("; ");
}

export function parseSession(cookieHeader: string | undefined): Session | null {
  const value = readCookie(cookieHeader, SESSION_COOKIE);
  return value ? decode(value) : null;
}

export function buildSessionCookie(session: Session): string {
  return cookieString(SESSION_COOKIE, encode(session), SESSION_MAX_AGE_SECONDS);
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

export function parseOAuthState(cookieHeader: string | undefined): string | null {
  return readCookie(cookieHeader, STATE_COOKIE);
}

export function buildOAuthStateCookie(state: string): string {
  return cookieString(STATE_COOKIE, state, STATE_MAX_AGE_SECONDS);
}

export function clearOAuthStateCookie(): string {
  return `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
