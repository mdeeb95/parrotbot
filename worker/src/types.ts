import type { KnowledgeBase } from "@parrot/db/schema";

export type ChatMessage = {
  id: string;
  author: string;
  displayName: string;
  text: string;
  isEmoteOnly: boolean;
  isModOrBroadcaster: boolean;
};

export type Group = {
  intent: string;
  message_ids: string[];
  answer: string | null;
  confidence: number;
};

export type LlmTokens = {
  input: number;
  cache_read: number;
  cache_creation: number;
  output: number;
};

export type LlmResult = {
  groups: Group[];
  tokens: LlmTokens;
  latency_ms: number;
  parse_error: string | null;
};

export type Batcher = {
  onKeptMessage: (msg: ChatMessage) => void;
  shutdown: () => void;
};

export type Cooldowns = {
  checkAuthor: (author: string) => boolean;
  markAuthor: (author: string) => void;
  checkIntent: (intent: string) => boolean;
  markIntent: (intent: string) => void;
  ignoreIntent: (intent: string, minutes?: number) => number;
};

export type StrikeTracker = {
  isBanned: (author: string) => boolean;
  recordStrike: (author: string) => { strikes: number; justBanned: boolean };
};

export type IntentVocab = {
  vocab: string[];
  descriptions: Record<string, string>;
};

export type ChannelState = {
  channelId: string;
  twitchChannel: string;
  kb: KnowledgeBase;
  kbHash: string;
  kbVersion: number;
  kbUrlAllowlist: Set<string>;
  intentVocab: IntentVocab;
  shadowMode: boolean;
  postingDisabled: boolean;
  batcher: Batcher;
  cooldowns: Cooldowns;
  strikes: StrikeTracker;
  bannedAuthors: Set<string>;
  stats: { seen: number; kept: number; posted: number; blocked: number };
};

export type BlockReason =
  | "null_answer"
  | "length"
  | "low_confidence"
  | "url_not_in_kb"
  | "mention_ban"
  | "verbatim_quote"
  | "slur_filter"
  | "intent_out_of_vocab"
  | "bot_off"
  | "shadow_mode"
  | "intent_cooldown"
  | "cap_exceeded"
  | "post_failed";
