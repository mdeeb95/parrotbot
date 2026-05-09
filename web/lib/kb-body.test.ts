import { describe, it, expect } from "vitest";
import { parseKbBody } from "./kb-body";

const validKb = {
  identity: { name: "x", pronouns: "" },
  bio: "",
  game: "",
  schedule: "",
  links: [],
  custom_fields: [],
  custom_qa: [],
};

describe("parseKbBody", () => {
  it("ok=true on a valid body", () => {
    const r = parseKbBody(validKb);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.identity.name).toBe("x");
  });

  it("ok=false with fieldErrors when a link has empty label", () => {
    const r = parseKbBody({
      ...validKb,
      links: [{ label: "", url: "https://x.example.com" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.body.error).toBe("invalid_body");
      expect(r.body.issues).toBeDefined();
    }
  });

  it("ok=false on an invalid URL inside links", () => {
    const r = parseKbBody({
      ...validKb,
      links: [{ label: "Twitter", url: "not-a-url" }],
    });
    expect(r.ok).toBe(false);
  });

  it("ok=false on missing top-level keys", () => {
    const r = parseKbBody({});
    expect(r.ok).toBe(false);
  });

  it("ok=false on overflow bio", () => {
    const r = parseKbBody({ ...validKb, bio: "x".repeat(2001) });
    expect(r.ok).toBe(false);
  });
});
