import { readFileSync } from "node:fs";
import type { ChatMessage, BlockReason, Group, StrikeTracker } from "./types";

const INJECTION_PATTERNS = [
  "ignore previous",
  "ignore prior",
  "ignore all instruction",
  "ignore the instruction",
  "disregard previous",
  "disregard your",
  "forget your",
  "forget previous",
  "you are now",
  "new instructions:",
  "new instructions are",
  "system prompt",
  "your prompt",
  "your instructions",
  "jailbreak",
  "dan mode",
  "developer mode",
  "pretend you",
  "pretend to be",
  "roleplay as",
  "act as if",
  "override your",
  "sudo",
];

export function looksLikeInjection(text: string): boolean {
  const t = text.toLowerCase();
  return INJECTION_PATTERNS.some((p) => t.includes(p));
}

const URL_RE = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;

const MENTION_BANS = ["@everyone", "@here", "@channel"];

export function loadBlocklist(path: string): string[] {
  try {
    const raw = readFileSync(path, "utf8");
    return raw
      .split(/\r?\n/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && !s.startsWith("#"));
  } catch {
    return [];
  }
}

// 10-char rolling window match against any input message.
// Off-by-one here silently disables verbatim-quote protection — be careful.
function hasVerbatimQuote(answer: string, batch: ChatMessage[]): boolean {
  const a = answer.toLowerCase();
  const WINDOW = 10;
  if (a.length < WINDOW) return false;
  for (const msg of batch) {
    const m = msg.text.toLowerCase();
    if (m.length < WINDOW) continue;
    for (let i = 0; i + WINDOW <= m.length; i++) {
      const slice = m.slice(i, i + WINDOW);
      if (a.includes(slice)) return true;
    }
  }
  return false;
}

export type OutputFilterResult =
  | { ok: true; reason: null }
  | { ok: false; reason: BlockReason };

export type OutputFilter = {
  shouldPost: (group: Group, batch: ChatMessage[]) => OutputFilterResult;
};

export function createOutputFilter(deps: {
  confidenceThreshold: number;
  allowedUrls: Set<string>;
  blocklist: string[];
  intentVocab: () => Set<string>;
}): OutputFilter {
  function shouldPost(group: Group, batch: ChatMessage[]): OutputFilterResult {
    const answer = group.answer;
    if (answer == null) return { ok: false, reason: "null_answer" };
    if (typeof answer !== "string") return { ok: false, reason: "null_answer" };
    if (answer.length === 0) return { ok: false, reason: "null_answer" };
    if (answer.length > 200) return { ok: false, reason: "length" };

    if (
      typeof group.confidence !== "number" ||
      group.confidence < deps.confidenceThreshold
    ) {
      return { ok: false, reason: "low_confidence" };
    }

    const vocab = deps.intentVocab();
    if (!vocab.has(group.intent)) {
      return { ok: false, reason: "intent_out_of_vocab" };
    }

    const matches = answer.match(URL_RE) ?? [];
    for (const u of matches) {
      const cleaned = u.replace(/[),.;]+$/, "").toLowerCase();
      if (!deps.allowedUrls.has(cleaned)) {
        return { ok: false, reason: "url_not_in_kb" };
      }
    }

    const lower = answer.toLowerCase();
    for (const m of MENTION_BANS) {
      if (lower.includes(m)) return { ok: false, reason: "mention_ban" };
    }

    if (hasVerbatimQuote(answer, batch)) {
      return { ok: false, reason: "verbatim_quote" };
    }

    for (const phrase of deps.blocklist) {
      if (lower.includes(phrase)) return { ok: false, reason: "slur_filter" };
    }

    return { ok: true, reason: null };
  }

  return { shouldPost };
}

export function createStrikeTracker(deps: { strikeLimit: number }): StrikeTracker {
  const strikes = new Map<string, number>();
  const banned = new Set<string>();

  function isBanned(author: string): boolean {
    return banned.has(author.toLowerCase());
  }

  function recordStrike(author: string): { strikes: number; justBanned: boolean } {
    const key = author.toLowerCase();
    const next = (strikes.get(key) ?? 0) + 1;
    strikes.set(key, next);
    let justBanned = false;
    if (next >= deps.strikeLimit && !banned.has(key)) {
      banned.add(key);
      justBanned = true;
    }
    return { strikes: next, justBanned };
  }

  return { isBanned, recordStrike };
}

export { hasVerbatimQuote };
