import type { ChatMessage } from "./types.js";

const BOT_AUTHORS = new Set([
  "nightbot",
  "streamelements",
  "moobot",
  "fossabot",
  "streamlabs",
  "wizebot",
  "parrotbot",
]);

const SPAM_EXACT = new Set([
  "pog",
  "pogchamp",
  "lul",
  "lulw",
  "kekw",
  "omegalul",
  "pepega",
  "lol",
  "lmao",
  "same",
  "true",
  "+1",
  "this",
  "^",
]);

const QUESTION_STARTERS = [
  "what",
  "why",
  "when",
  "where",
  "how",
  "which",
  "who",
  "is",
  "are",
  "does",
  "can",
  "did",
  "do",
  "will",
  "should",
];

const URL_RE = /(https?:\/\/|www\.)/i;

export function shouldKeep(msg: ChatMessage, botUsername?: string): boolean {
  if (msg.isEmoteOnly) return false;
  if (msg.text.length < 6) return false;
  const lowerAuthor = msg.author.toLowerCase();
  if (BOT_AUTHORS.has(lowerAuthor)) return false;
  if (botUsername && lowerAuthor === botUsername.toLowerCase()) return false;
  if (URL_RE.test(msg.text)) return false;

  const lower = msg.text.toLowerCase().trim();
  if (SPAM_EXACT.has(lower)) return false;

  if (msg.text.includes("?")) return true;

  const firstWord = lower.split(/\s+/)[0];
  if (QUESTION_STARTERS.includes(firstWord)) return true;

  if (lower.includes("anyone know")) return true;
  if (lower.includes("anyone playing")) return true;

  return false;
}
