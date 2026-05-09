import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createCooldowns } from "./cooldowns";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createCooldowns", () => {
  it("checkAuthor: true on first call, false within window, true after window", () => {
    const c = createCooldowns({ authorRateLimitSec: 60, intentCooldownMin: 5 });
    expect(c.checkAuthor("alice")).toBe(true);
    c.markAuthor("alice");
    expect(c.checkAuthor("alice")).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(c.checkAuthor("alice")).toBe(true);
  });

  it("checkIntent honors markIntent", () => {
    const c = createCooldowns({ authorRateLimitSec: 60, intentCooldownMin: 5 });
    expect(c.checkIntent("bio")).toBe(true);
    c.markIntent("bio");
    expect(c.checkIntent("bio")).toBe(false);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(c.checkIntent("bio")).toBe(true);
  });

  it("ignoreIntent overrides for the requested duration", () => {
    const c = createCooldowns({ authorRateLimitSec: 60, intentCooldownMin: 5 });
    expect(c.ignoreIntent("bio", 10)).toBe(10);
    expect(c.checkIntent("bio")).toBe(false);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(c.checkIntent("bio")).toBe(true);
  });

  it("ignoreIntent uses default minutes when not provided", () => {
    const c = createCooldowns({ authorRateLimitSec: 60, intentCooldownMin: 5 });
    expect(c.ignoreIntent("bio")).toBe(5);
  });
});
