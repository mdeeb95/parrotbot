import { describe, it, expect } from "vitest";
import { shouldKeep } from "./filter";
import type { ChatMessage } from "./types";

function msg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "id",
    author: "alice",
    displayName: "Alice",
    text: "what time is it?",
    isEmoteOnly: false,
    isModOrBroadcaster: false,
    ...overrides,
  };
}

describe("shouldKeep", () => {
  it("drops emote-only messages", () => {
    expect(shouldKeep(msg({ isEmoteOnly: true }))).toBe(false);
  });

  it("drops messages under 6 chars", () => {
    expect(shouldKeep(msg({ text: "huh?" }))).toBe(false);
  });

  it("drops known bot logins", () => {
    for (const a of [
      "nightbot",
      "streamelements",
      "moobot",
      "fossabot",
      "streamlabs",
      "wizebot",
      "parrotbot",
    ]) {
      expect(shouldKeep(msg({ author: a }))).toBe(false);
    }
  });

  it("drops messages from BOT_USERNAME passed in", () => {
    expect(shouldKeep(msg({ author: "MyBot" }), "mybot")).toBe(false);
    expect(shouldKeep(msg({ author: "mybot" }), "MyBot")).toBe(false);
  });

  it("drops URL-containing messages", () => {
    expect(shouldKeep(msg({ text: "check https://example.com" }))).toBe(false);
    expect(shouldKeep(msg({ text: "see www.example.com" }))).toBe(false);
  });

  it("drops the spam-exact list", () => {
    for (const t of ["pog", "lul", "kekw", "lmao", "+1", "this", "^"]) {
      expect(shouldKeep(msg({ text: t.padEnd(6, "x") }))).toBe(false);
    }
    // Exact match (after trim+lower)
    expect(shouldKeep(msg({ text: "pogchamp" }))).toBe(false);
  });

  it("keeps messages with `?`", () => {
    expect(shouldKeep(msg({ text: "right?? yeah" }))).toBe(true);
  });

  it("keeps messages starting with question words", () => {
    for (const w of ["what", "why", "when", "how", "does", "can", "should"]) {
      expect(shouldKeep(msg({ text: `${w} you doing` }))).toBe(true);
    }
  });

  it("keeps `anyone know` / `anyone playing`", () => {
    expect(shouldKeep(msg({ text: "anyone know good builds" }))).toBe(true);
    expect(shouldKeep(msg({ text: "anyone playing solo" }))).toBe(true);
  });

  it("drops everything else", () => {
    expect(shouldKeep(msg({ text: "i love this game" }))).toBe(false);
  });
});
