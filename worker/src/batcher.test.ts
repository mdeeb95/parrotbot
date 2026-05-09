import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBatcher } from "./batcher";
import type { ChatMessage } from "./types";

const m = (id: string): ChatMessage => ({
  id,
  author: "a",
  displayName: "A",
  text: "hi there?",
  isEmoteOnly: false,
  isModOrBroadcaster: false,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createBatcher", () => {
  it("flushes after windowMs", async () => {
    const onFlush = vi.fn(async () => {});
    const b = createBatcher({ windowMs: 1000, maxSize: 10, onFlush });
    b.onKeptMessage(m("1"));
    expect(onFlush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1001);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([m("1")]);
  });

  it("flushes early when maxSize is reached", () => {
    const onFlush = vi.fn();
    const b = createBatcher({ windowMs: 60_000, maxSize: 2, onFlush });
    b.onKeptMessage(m("1"));
    b.onKeptMessage(m("2"));
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([m("1"), m("2")]);
  });

  it("shutdown flushes a non-empty queue", () => {
    const onFlush = vi.fn();
    const b = createBatcher({ windowMs: 60_000, maxSize: 10, onFlush });
    b.onKeptMessage(m("1"));
    b.shutdown();
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it("shutdown is a noop on empty queue", () => {
    const onFlush = vi.fn();
    const b = createBatcher({ windowMs: 60_000, maxSize: 10, onFlush });
    b.shutdown();
    expect(onFlush).not.toHaveBeenCalled();
  });

  it("after flush, a new message restarts the window timer", () => {
    const onFlush = vi.fn();
    const b = createBatcher({ windowMs: 1000, maxSize: 10, onFlush });
    b.onKeptMessage(m("1"));
    vi.advanceTimersByTime(1001);
    expect(onFlush).toHaveBeenCalledTimes(1);
    b.onKeptMessage(m("2"));
    vi.advanceTimersByTime(500);
    expect(onFlush).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(501);
    expect(onFlush).toHaveBeenCalledTimes(2);
  });
});
