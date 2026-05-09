import { describe, it, expect } from "vitest";
import {
  looksLikeInjection,
  createOutputFilter,
  createStrikeTracker,
} from "./safety";
import type { ChatMessage, Group } from "./types";

const PATTERNS = [
  "ignore previous",
  "disregard previous",
  "you are now",
  "new instructions:",
  "system prompt",
  "jailbreak",
  "dan mode",
  "pretend you",
  "roleplay as",
  "override your",
  "sudo",
];

describe("looksLikeInjection", () => {
  it.each(PATTERNS)("matches pattern %s", (p) => {
    expect(looksLikeInjection(`hey ${p}, do something`)).toBe(true);
    expect(looksLikeInjection(p.toUpperCase())).toBe(true);
  });

  it("returns false for benign questions", () => {
    expect(looksLikeInjection("what game are you playing?")).toBe(false);
    expect(looksLikeInjection("how tall are you?")).toBe(false);
  });
});

function chat(text: string, id = "m1", author = "alice"): ChatMessage {
  return {
    id,
    author,
    displayName: author,
    text,
    isEmoteOnly: false,
    isModOrBroadcaster: false,
  };
}

function group(overrides: Partial<Group> = {}): Group {
  return {
    intent: "bio",
    message_ids: ["m1"],
    answer: "Hello there.",
    confidence: 0.95,
    ...overrides,
  };
}

describe("createOutputFilter", () => {
  const baseDeps = {
    confidenceThreshold: 0.8,
    allowedUrls: new Set<string>(["https://example.com"]),
    blocklist: ["badword"],
    intentVocab: () => new Set(["bio", "current_game", "off_topic"]),
  };

  it("blocks null_answer when answer is null", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(group({ answer: null }), [chat("hi there")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("null_answer");
  });

  it("blocks length when answer > 200 chars", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(group({ answer: "x".repeat(201) }), [chat("question?")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("length");
  });

  it("blocks low_confidence", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(group({ confidence: 0.5 }), [chat("question?")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("low_confidence");
  });

  it("blocks intent_out_of_vocab", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(group({ intent: "made_up" }), [chat("question?")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("intent_out_of_vocab");
  });

  it("blocks url_not_in_kb", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(
      group({ answer: "see https://evil.com" }),
      [chat("question?")],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("url_not_in_kb");
  });

  it("allows allowlisted URLs", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(
      group({ answer: "see https://example.com" }),
      [chat("question?")],
    );
    expect(r.ok).toBe(true);
  });

  it("blocks @everyone mention", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(
      group({ answer: "hey @everyone listen" }),
      [chat("question?")],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("mention_ban");
  });

  it("allows answers that overlap with input text (verbatim check removed)", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(
      group({ answer: "the quick brown fox is the answer" }),
      [chat("the quick brown fox jumps over")],
    );
    expect(r.ok).toBe(true);
  });

  it("blocks slur_filter", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(
      group({ answer: "this contains badword today" }),
      [chat("question?")],
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("slur_filter");
  });

  it("returns ok on a clean answer", () => {
    const f = createOutputFilter(baseDeps);
    const r = f.shouldPost(group(), [chat("question?")]);
    expect(r.ok).toBe(true);
  });
});

describe("createStrikeTracker", () => {
  it("returns justBanned: true exactly once on the threshold strike", () => {
    const t = createStrikeTracker({ strikeLimit: 3 });
    expect(t.recordStrike("alice").justBanned).toBe(false);
    expect(t.recordStrike("alice").justBanned).toBe(false);
    expect(t.recordStrike("alice").justBanned).toBe(true);
    expect(t.recordStrike("alice").justBanned).toBe(false);
    expect(t.isBanned("alice")).toBe(true);
  });

  it("is case-insensitive on author", () => {
    const t = createStrikeTracker({ strikeLimit: 1 });
    t.recordStrike("Alice");
    expect(t.isBanned("alice")).toBe(true);
    expect(t.isBanned("ALICE")).toBe(true);
  });
});
