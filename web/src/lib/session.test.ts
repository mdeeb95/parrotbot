import { beforeAll, describe, expect, it } from "vitest";
import {
  buildOAuthStateCookie,
  buildSessionCookie,
  clearOAuthStateCookie,
  clearSessionCookie,
  parseOAuthState,
  parseSession,
  type Session,
} from "./session.js";

const session: Session = {
  twitch_id: "12345",
  login: "aodeeb",
  display_name: "aodeeb",
  email: "a@b.test",
  profile_image_url: "https://example.test/avatar.png",
};

beforeAll(() => {
  process.env.SESSION_SECRET = "x".repeat(32);
});

describe("session cookies", () => {
  it("round-trips a signed session", () => {
    const cookie = buildSessionCookie(session);
    const value = cookie.split(";")[0]!.replace("parrot_session=", "");
    const header = `parrot_session=${value}`;
    expect(parseSession(header)).toEqual(session);
  });

  it("returns null for a missing cookie header", () => {
    expect(parseSession(undefined)).toBeNull();
    expect(parseSession("")).toBeNull();
    expect(parseSession("other=foo")).toBeNull();
  });

  it("returns null when the signature is tampered", () => {
    const cookie = buildSessionCookie(session);
    const value = cookie.split(";")[0]!.replace("parrot_session=", "");
    const [payload, sig] = value.split(".");
    const tampered = `parrot_session=${payload}.${sig!.slice(0, -1)}A`;
    expect(parseSession(tampered)).toBeNull();
  });

  it("returns null when the payload is tampered", () => {
    const cookie = buildSessionCookie(session);
    const sig = cookie.split(";")[0]!.replace("parrot_session=", "").split(".")[1];
    const altered = Buffer.from('{"twitch_id":"99","login":"x","display_name":"x","email":"x","profile_image_url":"x"}').toString("base64url");
    expect(parseSession(`parrot_session=${altered}.${sig}`)).toBeNull();
  });

  it("reads the right cookie when many are present", () => {
    const cookie = buildSessionCookie(session);
    const value = cookie.split(";")[0]!.replace("parrot_session=", "");
    const header = `theme=dark; parrot_session=${value}; tracking=1`;
    expect(parseSession(header)).toEqual(session);
  });

  it("builds a clear cookie that expires immediately", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
    expect(clearSessionCookie()).toContain("parrot_session=");
  });
});

describe("oauth state cookies", () => {
  it("round-trips a state token", () => {
    const cookie = buildOAuthStateCookie("abc123");
    const value = cookie.split(";")[0]!.replace("parrot_oauth_state=", "");
    expect(parseOAuthState(`parrot_oauth_state=${value}`)).toBe("abc123");
  });

  it("returns null when missing", () => {
    expect(parseOAuthState(undefined)).toBeNull();
    expect(parseOAuthState("other=foo")).toBeNull();
  });

  it("builds a clear cookie that expires immediately", () => {
    expect(clearOAuthStateCookie()).toContain("Max-Age=0");
    expect(clearOAuthStateCookie()).toContain("parrot_oauth_state=");
  });
});
