import { describe, it, expect } from "vitest";
import { parseCommand, type TmiTags } from "./commands";

const modTags: TmiTags = { mod: true, badges: {} };
const broadcasterTags: TmiTags = { mod: false, badges: { broadcaster: "1" } };
const viewerTags: TmiTags = { mod: false, badges: {} };

describe("parseCommand — auth", () => {
  it("ignored when not authorized", () => {
    expect(parseCommand("!bot on", viewerTags).kind).toBe("ignored");
  });

  it("allows broadcaster badge", () => {
    expect(parseCommand("!bot on", broadcasterTags).kind).toBe("on");
  });

  it("allows moderator badge", () => {
    expect(parseCommand("!bot on", { mod: false, badges: { moderator: "1" } }).kind).toBe("on");
  });

  it("ignored when not !bot", () => {
    expect(parseCommand("hello!", modTags).kind).toBe("ignored");
  });
});

describe("parseCommand — verbs", () => {
  it("on/off/stats/help", () => {
    expect(parseCommand("!bot on", modTags).kind).toBe("on");
    expect(parseCommand("!bot off", modTags).kind).toBe("off");
    expect(parseCommand("!bot stats", modTags).kind).toBe("stats");
    expect(parseCommand("!bot help", modTags).kind).toBe("help");
  });

  it("ban with @prefix and lowercased", () => {
    const r = parseCommand("!bot ban @Alice", modTags);
    expect(r.kind).toBe("ban");
    if (r.kind === "ban") expect(r.username).toBe("alice");
  });

  it("ban without args is unknown", () => {
    expect(parseCommand("!bot ban", modTags).kind).toBe("unknown");
  });

  it("ignore with intent only", () => {
    const r = parseCommand("!bot ignore bio", modTags);
    expect(r.kind).toBe("ignore");
    if (r.kind === "ignore") {
      expect(r.intent).toBe("bio");
      expect(r.minutes).toBeUndefined();
    }
  });

  it("ignore with intent + minutes", () => {
    const r = parseCommand("!bot ignore bio 30", modTags);
    expect(r.kind).toBe("ignore");
    if (r.kind === "ignore") {
      expect(r.intent).toBe("bio");
      expect(r.minutes).toBe(30);
    }
  });

  it("unknown verb", () => {
    expect(parseCommand("!bot frobnicate", modTags).kind).toBe("unknown");
  });
});

describe("parseCommand — set", () => {
  it("fixed-path bio", () => {
    const r = parseCommand('!bot set bio "I am xyz"', modTags);
    expect(r.kind).toBe("set");
    if (r.kind === "set") {
      expect(r.target.kind).toBe("fixed");
      if (r.target.kind === "fixed") expect(r.target.path).toBe("bio");
      expect(r.value).toBe("I am xyz");
    }
  });

  it("fixed-path identity.name", () => {
    const r = parseCommand("!bot set identity.name Alice", modTags);
    expect(r.kind).toBe("set");
    if (r.kind === "set" && r.target.kind === "fixed") {
      expect(r.target.path).toBe("identity.name");
    }
  });

  it("field subverb", () => {
    const r = parseCommand('!bot set field "Build" https://wago.io/abc', modTags);
    expect(r.kind).toBe("set");
    if (r.kind === "set" && r.target.kind === "field") {
      expect(r.target.label).toBe("Build");
      expect(r.value).toBe("https://wago.io/abc");
    }
  });

  it("qa subverb", () => {
    const r = parseCommand('!bot set qa "Setup?" 3090, 5800X', modTags);
    expect(r.kind).toBe("set");
    if (r.kind === "set" && r.target.kind === "qa") {
      expect(r.target.question).toBe("Setup?");
      expect(r.value).toBe("3090, 5800X");
    }
  });

  it("link subverb", () => {
    const r = parseCommand('!bot set link "Twitter" https://x.com/me', modTags);
    expect(r.kind).toBe("set");
    if (r.kind === "set" && r.target.kind === "link") {
      expect(r.target.label).toBe("Twitter");
      expect(r.value).toBe("https://x.com/me");
    }
  });

  it("unknown when set fixed-path is no longer supported (links.twitter)", () => {
    const r = parseCommand("!bot set links.twitter https://x.com/me", modTags);
    expect(r.kind).toBe("unknown");
  });

  it("unknown when set has too few tokens", () => {
    expect(parseCommand("!bot set bio", modTags).kind).toBe("unknown");
  });
});
