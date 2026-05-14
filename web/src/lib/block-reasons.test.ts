import { describe, expect, it } from "vitest";
import { ALL_BLOCK_REASONS, categorize, labelFor } from "./block-reasons.js";

describe("categorize", () => {
  it("classifies actionable reasons", () => {
    expect(categorize("low_confidence")).toBe("actionable");
    expect(categorize("cap_exceeded")).toBe("actionable");
  });

  it("classifies operational reasons", () => {
    expect(categorize("bot_off")).toBe("operational");
    expect(categorize("shadow_mode")).toBe("operational");
  });

  it("treats unknown and explicit safety reasons as safety", () => {
    expect(categorize("slur_filter")).toBe("safety");
    expect(categorize("never_heard_of_it")).toBe("safety");
  });
});

describe("labelFor", () => {
  it("returns a label and explainer for every defined reason", () => {
    for (const r of ALL_BLOCK_REASONS) {
      const l = labelFor(r);
      expect(l.title.length).toBeGreaterThan(0);
      expect(l.explainer.length).toBeGreaterThan(0);
    }
  });

  it("falls back gracefully for unknown reasons", () => {
    const l = labelFor("mystery_block");
    expect(l.title).toBe("mystery_block");
    expect(l.explainer).toMatch(/unknown/i);
  });
});
