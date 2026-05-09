import { randomUUID } from "node:crypto";
import type { Client, ChatUserstate } from "tmi.js";
import type {
  ChannelState,
  ChatMessage,
  BlockReason,
  Group,
  LlmTokens,
} from "./types";
import { shouldKeep } from "./filter";
import { looksLikeInjection, createOutputFilter } from "./safety";
import { answerBatch } from "./llm";
import { formatReply } from "./reply";
import { isOverCap, addTokens } from "./cap";
import {
  appendJsonl,
  recordPostedAnswer,
  recordTokenUsageOnly,
} from "./log";
import { parseCommand, handleCommand } from "./commands";
import { logger } from "./logger";

export type PipelineDeps = {
  client: Client;
  model: string;
  confidenceThreshold: number;
  blocklist: string[];
  dailyTokenCap: number;
  botUsername: string;
  // Optional allowlist of twitch channels (lowercase) the worker is allowed
  // to post in. If null/empty, all channels are allowed. If set, posts to
  // any channel not in the set are refused (logged as block_reason: post_failed).
  postAllowlist: Set<string> | null;
};

function isModOrBroadcaster(tags: ChatUserstate): boolean {
  if (tags.mod === true) return true;
  const badges = (tags.badges as Record<string, string> | undefined) ?? {};
  return badges?.broadcaster === "1" || badges?.moderator === "1";
}

export function createPipeline(deps: PipelineDeps) {
  async function handleMessage(
    state: ChannelState,
    tags: ChatUserstate,
    text: string,
    self: boolean,
  ): Promise<void> {
    if (self) return;
    state.stats.seen += 1;

    const author = (tags.username ?? "unknown").toLowerCase();
    const displayName = tags["display-name"] ?? tags.username ?? "unknown";
    const msg: ChatMessage = {
      id: tags.id ?? randomUUID(),
      author,
      displayName,
      text,
      isEmoteOnly: tags["emote-only"] === true,
      isModOrBroadcaster: isModOrBroadcaster(tags),
    };

    const log = logger.child({
      channelId: state.channelId,
      twitchChannel: state.twitchChannel,
    });

    // Commands first (broadcaster/mod only).
    if (text.trim().toLowerCase().startsWith("!bot")) {
      const cmd = parseCommand(text, {
        badges: (tags.badges as Record<string, string> | undefined) ?? {},
        mod: tags.mod === true,
        username: tags.username,
        "display-name": tags["display-name"],
      });
      if (cmd.kind !== "ignored") {
        const outcome = await handleCommand(state, cmd).catch((err) => {
          log.error({ err }, "command handler threw");
          return { result: "error" as const, reply: `error: ${(err as Error).message}` };
        });
        if (outcome.reply) {
          appendJsonl(state.twitchChannel, {
            ts: new Date().toISOString(),
            type: "command",
            channel: state.twitchChannel,
            author: msg.author,
            command_kind: cmd.kind,
            result: outcome.result,
            reply: outcome.reply,
          });
          const allowed =
            !deps.postAllowlist || deps.postAllowlist.has(state.twitchChannel);
          if (!state.shadowMode && !state.postingDisabled && allowed) {
            try {
              await deps.client.say(
                "#" + state.twitchChannel,
                `@${displayName} ${outcome.reply}`,
              );
            } catch (err) {
              log.warn({ err }, "command reply post failed");
            }
          } else if (!allowed) {
            log.warn(
              { twitchChannel: state.twitchChannel },
              "command reply blocked by post_allowlist",
            );
          }
        }
        return;
      }
    }

    if (state.bannedAuthors.has(author)) return;
    if (state.strikes.isBanned(author)) return;

    if (looksLikeInjection(text)) {
      const { strikes, justBanned } = state.strikes.recordStrike(author);
      appendJsonl(state.twitchChannel, {
        ts: new Date().toISOString(),
        type: "injection_attempt",
        channel: state.twitchChannel,
        author,
        text,
        strikes,
      });
      if (justBanned) {
        appendJsonl(state.twitchChannel, {
          ts: new Date().toISOString(),
          type: "author_banned",
          channel: state.twitchChannel,
          author,
        });
      }
      return;
    }

    if (!shouldKeep(msg, deps.botUsername)) return;
    if (!state.cooldowns.checkAuthor(author)) return;
    state.cooldowns.markAuthor(author);

    state.stats.kept += 1;
    state.batcher.onKeptMessage(msg);
  }

  async function processBatch(
    state: ChannelState,
    messages: ChatMessage[],
  ): Promise<void> {
    const batchId = randomUUID();
    const log = logger.child({
      channelId: state.channelId,
      twitchChannel: state.twitchChannel,
      batch_id: batchId,
    });
    const inputMessages = messages.map((m) => ({
      id: m.id,
      author: m.author,
      text: m.text,
    }));

    // Pre-LLM cap check.
    if (isOverCap(state.channelId, deps.dailyTokenCap)) {
      const groups: Group[] = [];
      const blocked = inputMessages.map((_, i) => ({
        group_index: i,
        reason: "cap_exceeded" as BlockReason,
      }));
      appendJsonl(state.twitchChannel, {
        ts: new Date().toISOString(),
        type: "batch",
        channel: state.twitchChannel,
        batch_id: batchId,
        input_messages: inputMessages,
        groups,
        tokens: { input: 0, cache_read: 0, cache_creation: 0, output: 0 },
        latency_ms: 0,
        posted: [],
        blocked,
        parse_error: null,
        reason: "cap_exceeded",
      });
      state.stats.blocked += inputMessages.length;
      log.info({ size: messages.length }, "batch skipped: cap exceeded");
      return;
    }

    const outputFilter = createOutputFilter({
      confidenceThreshold: deps.confidenceThreshold,
      allowedUrls: state.kbUrlAllowlist,
      blocklist: deps.blocklist,
      intentVocab: () => new Set(state.intentVocab.vocab),
    });

    let result: Awaited<ReturnType<typeof answerBatch>>;
    try {
      result = await answerBatch(state, messages, deps.model);
    } catch (err) {
      log.error({ err, size: messages.length }, "llm call failed");
      appendJsonl(state.twitchChannel, {
        ts: new Date().toISOString(),
        type: "batch",
        channel: state.twitchChannel,
        batch_id: batchId,
        input_messages: inputMessages,
        groups: [],
        tokens: { input: 0, cache_read: 0, cache_creation: 0, output: 0 },
        latency_ms: 0,
        posted: [],
        blocked: [],
        parse_error: `llm_error: ${(err as Error).message}`,
      });
      return;
    }

    const tokens: LlmTokens = result.tokens;
    const tokenTotal =
      tokens.input + tokens.cache_read + tokens.cache_creation + tokens.output;
    addTokens(state.channelId, tokenTotal);

    const posted: { group_index: number; post_text: string }[] = [];
    const blocked: { group_index: number; reason: BlockReason }[] = [];

    let postedThisBatch = false;
    for (let i = 0; i < result.groups.length; i++) {
      const g = result.groups[i];
      const ids = Array.isArray(g.message_ids) ? g.message_ids : [];
      const groupMsgs = ids
        .map((id) => messages.find((m) => m.id === id))
        .filter((x): x is ChatMessage => Boolean(x));
      const distinctDisplayNames = [
        ...new Set(groupMsgs.map((m) => m.displayName)),
      ];

      const outcome = outputFilter.shouldPost(g, messages);
      if (!outcome.ok) {
        blocked.push({ group_index: i, reason: outcome.reason });
        state.stats.blocked += 1;
        continue;
      }
      if (state.postingDisabled) {
        blocked.push({ group_index: i, reason: "bot_off" });
        state.stats.blocked += 1;
        continue;
      }
      if (state.shadowMode) {
        blocked.push({ group_index: i, reason: "shadow_mode" });
        state.stats.blocked += 1;
        continue;
      }
      if (!state.cooldowns.checkIntent(g.intent)) {
        blocked.push({ group_index: i, reason: "intent_cooldown" });
        state.stats.blocked += 1;
        continue;
      }
      if (deps.postAllowlist && !deps.postAllowlist.has(state.twitchChannel)) {
        log.warn(
          { twitchChannel: state.twitchChannel, group_index: i },
          "post blocked by post_allowlist",
        );
        blocked.push({ group_index: i, reason: "post_failed" });
        state.stats.blocked += 1;
        continue;
      }

      const postText = formatReply(g.answer as string, distinctDisplayNames);
      try {
        await deps.client.say("#" + state.twitchChannel, postText);
      } catch (err) {
        log.warn({ err, group_index: i }, "post failed");
        blocked.push({ group_index: i, reason: "post_failed" });
        state.stats.blocked += 1;
        continue;
      }
      state.cooldowns.markIntent(g.intent);
      posted.push({ group_index: i, post_text: postText });
      state.stats.posted += 1;
      postedThisBatch = true;

      // DB write (queued, fire-and-log).
      recordPostedAnswer({
        channelId: state.channelId,
        intent: g.intent,
        answer: g.answer as string,
        askerCount: distinctDisplayNames.length,
        confidence: g.confidence,
        tokensInputDelta: tokens.input + tokens.cache_read + tokens.cache_creation,
        tokensOutputDelta: tokens.output,
      });
    }

    // If nothing posted but tokens were spent, still record token usage so
    // the cap reflects reality across restarts.
    if (!postedThisBatch && tokenTotal > 0) {
      recordTokenUsageOnly({
        channelId: state.channelId,
        tokensInputDelta: tokens.input + tokens.cache_read + tokens.cache_creation,
        tokensOutputDelta: tokens.output,
      });
    }

    appendJsonl(state.twitchChannel, {
      ts: new Date().toISOString(),
      type: "batch",
      channel: state.twitchChannel,
      batch_id: batchId,
      input_messages: inputMessages,
      groups: result.groups,
      tokens: result.tokens,
      latency_ms: result.latency_ms,
      posted,
      blocked,
      parse_error: result.parse_error,
    });

    log.info(
      {
        size: messages.length,
        groups: result.groups.length,
        posted: posted.length,
        blocked: blocked.length,
        latency_ms: result.latency_ms,
      },
      "batch processed",
    );
  }

  return { handleMessage, processBatch };
}
