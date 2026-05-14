// Mirrors the BlockReason union in worker/src/types.ts. Keep in sync.

export const STREAMER_ACTIONABLE_REASONS = [
  "low_confidence",
  "intent_out_of_vocab",
  "null_answer",
  "cap_exceeded",
] as const;

export const OPERATIONAL_REASONS = ["intent_cooldown", "bot_off", "shadow_mode"] as const;

export const SAFETY_REASONS = [
  "url_not_in_kb",
  "mention_ban",
  "verbatim_quote",
  "slur_filter",
  "length",
  "post_failed",
] as const;

export const ALL_BLOCK_REASONS = [
  ...STREAMER_ACTIONABLE_REASONS,
  ...OPERATIONAL_REASONS,
  ...SAFETY_REASONS,
] as const;

export type BlockReason = (typeof ALL_BLOCK_REASONS)[number];
export type BlockCategory = "actionable" | "operational" | "safety";

const ACTIONABLE_SET = new Set<string>(STREAMER_ACTIONABLE_REASONS);
const OPERATIONAL_SET = new Set<string>(OPERATIONAL_REASONS);

export function categorize(reason: string): BlockCategory {
  if (ACTIONABLE_SET.has(reason)) return "actionable";
  if (OPERATIONAL_SET.has(reason)) return "operational";
  return "safety";
}

export const REASON_LABELS: Record<BlockReason, { title: string; explainer: string }> = {
  low_confidence: {
    title: "Low confidence",
    explainer: "The bot wasn't sure of the answer. Add this topic to your KB to fix.",
  },
  intent_out_of_vocab: {
    title: "Unknown intent",
    explainer:
      "The model invented an intent name we didn't recognize. Usually means the question doesn't fit any of your KB topics.",
  },
  null_answer: {
    title: "No answer",
    explainer:
      "The bot decided not to answer this. Often means the KB doesn't cover the question.",
  },
  cap_exceeded: {
    title: "Daily token cap hit",
    explainer: "Your channel used up its daily LLM budget. Resets at UTC midnight.",
  },
  intent_cooldown: {
    title: "Cooldown",
    explainer: "The bot already answered this topic recently. Working as intended.",
  },
  bot_off: {
    title: "Bot is off",
    explainer: "Posting was paused via !parrot off.",
  },
  shadow_mode: {
    title: "Shadow mode",
    explainer: "The bot is logging but not posting.",
  },
  url_not_in_kb: {
    title: "Unsanctioned URL",
    explainer: "The model tried to post a URL that's not in your KB. Blocked for safety.",
  },
  mention_ban: {
    title: "@ mention blocked",
    explainer: "Answer contained @everyone, @here, or @channel.",
  },
  verbatim_quote: {
    title: "Quoted chat verbatim",
    explainer: "Safety: the bot can't echo chat back word-for-word.",
  },
  slur_filter: {
    title: "Slur filter",
    explainer: "Answer contained a phrase from the blocklist.",
  },
  length: {
    title: "Too long",
    explainer: "Answer exceeded 200 characters.",
  },
  post_failed: {
    title: "Post failed",
    explainer: "Twitch rejected the post — usually means the bot isn't actually modded.",
  },
};

export function labelFor(reason: string): { title: string; explainer: string } {
  return (
    REASON_LABELS[reason as BlockReason] ?? {
      title: reason,
      explainer: "Unknown block reason.",
    }
  );
}
