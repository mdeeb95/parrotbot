import { describe, expect, it } from "vitest";
import { validateKb, type KbInput } from "./validate-kb.js";

const valid: KbInput = {
  identity: { name: "Aodeeb", pronouns: "he/him" },
  bio: "Plays games.",
  game: "Just Chatting",
  schedule: "Mon-Fri 8pm ET",
  links: [{ label: "YouTube", url: "https://youtube.com/aodeeb" }],
  custom_fields: [{ label: "Setup", value: "M1 MacBook" }],
  custom_qa: [{ question: "How tall?", answer: "5'10" }],
};

describe("validateKb", () => {
  it("accepts a fully-valid body", () => {
    const r = validateKb(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(valid);
  });

  it("rejects non-object input", () => {
    expect(validateKb(null).ok).toBe(false);
    expect(validateKb("string").ok).toBe(false);
    expect(validateKb(42).ok).toBe(false);
    expect(validateKb([]).ok).toBe(false);
  });

  it("trims string fields", () => {
    const r = validateKb({ ...valid, bio: "  hello  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.bio).toBe("hello");
  });

  it("reports per-field errors when strings exceed max length", () => {
    const r = validateKb({ ...valid, bio: "x".repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.bio).toMatch(/2000/);
  });

  it("rejects links without a label", () => {
    const r = validateKb({ ...valid, links: [{ label: "", url: "https://x.test" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors["links.0.label"]).toBe("Required");
  });

  it("rejects links with an invalid URL", () => {
    const r = validateKb({ ...valid, links: [{ label: "site", url: "not-a-url" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors["links.0.url"]).toMatch(/valid URL/);
  });

  it("accepts http and https URLs case-insensitively", () => {
    const r = validateKb({
      ...valid,
      links: [
        { label: "a", url: "http://a.test" },
        { label: "b", url: "HTTPS://b.test" },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("enforces the 20-link cap", () => {
    const links = Array.from({ length: 21 }, (_, i) => ({
      label: `l${i}`,
      url: `https://${i}.test`,
    }));
    const r = validateKb({ ...valid, links });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.links).toMatch(/20/);
  });

  it("rejects missing identity fields", () => {
    const r = validateKb({ ...valid, identity: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors["identity.name"]).toBe("Required");
      expect(r.errors["identity.pronouns"]).toBe("Required");
    }
  });

  it("accepts empty arrays for links, fields, and qa", () => {
    const r = validateKb({ ...valid, links: [], custom_fields: [], custom_qa: [] });
    expect(r.ok).toBe(true);
  });
});
