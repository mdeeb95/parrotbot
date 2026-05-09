import { describe, it, expect } from "vitest";
import { deriveIntents, extractKbUrls, hashKb } from "./kb";
import type { KnowledgeBase } from "@parrot/db/schema";

const empty: KnowledgeBase = {
  identity: { name: "", pronouns: "" },
  bio: "",
  game: "",
  schedule: "",
  links: [],
  custom_fields: [],
  custom_qa: [],
};

describe("deriveIntents", () => {
  it("includes built-ins only when fields are non-empty", () => {
    const { vocab } = deriveIntents(empty);
    expect(vocab).toEqual(["off_topic"]);
  });

  it("includes identity when name or pronouns set", () => {
    const { vocab } = deriveIntents({
      ...empty,
      identity: { name: "x", pronouns: "" },
    });
    expect(vocab).toContain("identity");
  });

  it("produces opaque link:link_<i> IDs per non-empty link", () => {
    const { vocab } = deriveIntents({
      ...empty,
      links: [
        { label: "Twitter", url: "https://x.com/x" },
        { label: "YouTube", url: "https://yt.com/x" },
        { label: "", url: "" },
      ],
    });
    expect(vocab).toContain("link:link_0");
    expect(vocab).toContain("link:link_1");
    expect(vocab).not.toContain("link:link_2");
  });

  it("produces custom_field:cf_<i> and custom_qa:qa_<i>", () => {
    const { vocab, descriptions } = deriveIntents({
      ...empty,
      custom_fields: [{ label: "Build", value: "v" }],
      custom_qa: [{ question: "Setup?", answer: "a" }],
    });
    expect(vocab).toContain("custom_field:cf_0");
    expect(vocab).toContain("custom_qa:qa_0");
    expect(descriptions["custom_field:cf_0"]).toMatch(/Build/);
    expect(descriptions["custom_qa:qa_0"]).toMatch(/Setup\?/);
  });

  it("always includes off_topic", () => {
    const { vocab } = deriveIntents(empty);
    expect(vocab).toContain("off_topic");
  });
});

describe("extractKbUrls", () => {
  it("extracts URLs from links, bio, schedule, custom_fields, custom_qa", () => {
    const urls = extractKbUrls({
      ...empty,
      bio: "i stream at https://twitch.tv/me",
      schedule: "see www.example.com for times",
      links: [{ label: "X", url: "https://x.com/me" }],
      custom_fields: [{ label: "build", value: "https://wago.io/abc" }],
      custom_qa: [{ question: "q", answer: "see https://yt.com/v?id=1" }],
    });
    expect(urls.has("https://twitch.tv/me")).toBe(true);
    expect(urls.has("www.example.com")).toBe(true);
    expect(urls.has("https://x.com/me")).toBe(true);
    expect(urls.has("https://wago.io/abc")).toBe(true);
    expect(urls.has("https://yt.com/v?id=1")).toBe(true);
  });

  it("lowercases and trims trailing punctuation", () => {
    const urls = extractKbUrls({
      ...empty,
      bio: "Find me at HTTPS://X.com/Aodeeb).",
    });
    expect([...urls]).toContain("https://x.com/aodeeb");
  });
});

describe("hashKb", () => {
  it("is deterministic for identical input", () => {
    expect(hashKb(empty)).toBe(hashKb(empty));
  });

  it("differs for content changes", () => {
    expect(hashKb(empty)).not.toBe(hashKb({ ...empty, bio: "x" }));
  });
});
