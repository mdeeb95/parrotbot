import type { Cooldowns } from "./types";

export function createCooldowns(deps: {
  authorRateLimitSec: number;
  intentCooldownMin: number;
}): Cooldowns {
  const lastAccepted = new Map<string, number>();
  const lastPosted = new Map<string, number>();
  const ignored = new Map<string, number>();

  function checkAuthor(author: string): boolean {
    const last = lastAccepted.get(author) ?? 0;
    return Date.now() - last >= deps.authorRateLimitSec * 1000;
  }

  function markAuthor(author: string): void {
    lastAccepted.set(author, Date.now());
  }

  function checkIntent(intent: string): boolean {
    const now = Date.now();
    const ignoredUntil = ignored.get(intent) ?? 0;
    if (now < ignoredUntil) return false;
    const last = lastPosted.get(intent) ?? 0;
    return now - last >= deps.intentCooldownMin * 60 * 1000;
  }

  function markIntent(intent: string): void {
    lastPosted.set(intent, Date.now());
  }

  function ignoreIntent(intent: string, minutes?: number): number {
    const m = typeof minutes === "number" && minutes > 0 ? minutes : deps.intentCooldownMin;
    ignored.set(intent, Date.now() + m * 60 * 1000);
    return m;
  }

  return { checkAuthor, markAuthor, checkIntent, markIntent, ignoreIntent };
}
