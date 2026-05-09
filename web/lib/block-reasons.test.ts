import { describe, it, expect } from "vitest";
import {
  categorize,
  labelFor,
  REASON_LABELS,
  ALL_BLOCK_REASONS,
} from "./block-reasons";

describe("categorize", () => {
  it("classifies streamer-actionable reasons", () => {
    expect(categorize("low_confidence")).toBe("actionable");
    expect(categorize("intent_out_of_vocab")).toBe("actionable");
    expect(categorize("null_answer")).toBe("actionable");
    expect(categorize("cap_exceeded")).toBe("actionable");
  });

  it("classifies operational reasons", () => {
    expect(categorize("intent_cooldown")).toBe("operational");
    expect(categorize("bot_off")).toBe("operational");
    expect(categorize("shadow_mode")).toBe("operational");
  });

  it("classifies safety/dev reasons", () => {
    expect(categorize("url_not_in_kb")).toBe("safety");
    expect(categorize("verbatim_quote")).toBe("safety");
    expect(categorize("slur_filter")).toBe("safety");
    expect(categorize("post_failed")).toBe("safety");
  });

  it("defaults unknown reasons to safety", () => {
    expect(categorize("not_a_real_reason")).toBe("safety");
    expect(categorize("")).toBe("safety");
  });
});

describe("labelFor", () => {
  it("returns the label for a known reason", () => {
    const r = labelFor("low_confidence");
    expect(r.title).toBe("Low confidence");
    expect(r.explainer).toMatch(/KB/);
  });

  it("falls back gracefully for unknown reasons", () => {
    const r = labelFor("frobnicate");
    expect(r.title).toBe("frobnicate");
    expect(r.explainer).toMatch(/Unknown/i);
  });
});

describe("REASON_LABELS coverage", () => {
  it("has an entry for every BlockReason", () => {
    for (const reason of ALL_BLOCK_REASONS) {
      expect(REASON_LABELS[reason]).toBeDefined();
      expect(REASON_LABELS[reason].title.length).toBeGreaterThan(0);
      expect(REASON_LABELS[reason].explainer.length).toBeGreaterThan(0);
    }
  });
});
