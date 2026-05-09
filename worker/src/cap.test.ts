import { describe, it, expect, beforeEach } from "vitest";
import { isOverCap, addTokens, getTokens, disposeCap } from "./cap";

beforeEach(() => {
  disposeCap("c1");
  disposeCap("c2");
});

describe("cap (in-memory)", () => {
  it("isOverCap is false when no state", () => {
    expect(isOverCap("c1", 100)).toBe(false);
  });

  it("addTokens accumulates within a day", () => {
    addTokens("c1", 50);
    addTokens("c1", 25);
    expect(getTokens("c1")).toBe(75);
  });

  it("isOverCap fires once total >= limit", () => {
    addTokens("c1", 100);
    expect(isOverCap("c1", 99)).toBe(true);
    expect(isOverCap("c1", 100)).toBe(true);
    expect(isOverCap("c1", 101)).toBe(false);
  });

  it("disposeCap removes the entry", () => {
    addTokens("c1", 50);
    disposeCap("c1");
    expect(getTokens("c1")).toBe(0);
  });
});
