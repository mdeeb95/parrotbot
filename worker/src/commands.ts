import { db } from "@parrot/db";
import { channels, usageDaily, type KnowledgeBase } from "@parrot/db/schema";
import { kbSchema } from "@parrot/db/kb-schema";
import { eq, and } from "drizzle-orm";
import type { ChannelState } from "./types";
import { deriveIntents, extractKbUrls, hashKb } from "./kb";
import { invalidateCache } from "./llm";
import { logger } from "./logger";

const FIXED_PATHS = new Set([
  "identity.name",
  "identity.pronouns",
  "bio",
  "game",
  "schedule",
]);

type FixedPath =
  | "identity.name"
  | "identity.pronouns"
  | "bio"
  | "game"
  | "schedule";

type SetTarget =
  | { kind: "fixed"; path: FixedPath }
  | { kind: "field"; label: string }
  | { kind: "qa"; question: string }
  | { kind: "link"; label: string };

export type Command =
  | { kind: "on" }
  | { kind: "off" }
  | { kind: "stats" }
  | { kind: "set"; target: SetTarget; value: string }
  | { kind: "ignore"; intent: string; minutes?: number }
  | { kind: "ban"; username: string }
  | { kind: "unknown" }
  | { kind: "ignored" };

export type TmiTags = {
  badges?: Record<string, string> | null;
  mod?: boolean;
  username?: string;
  "display-name"?: string;
};

export function isAuthorized(tags: TmiTags): boolean {
  if (tags.mod === true) return true;
  const badges = tags.badges ?? {};
  if (badges?.broadcaster === "1") return true;
  if (badges?.moderator === "1") return true;
  return false;
}

// Strict parser: !bot <verb> <args>. Returns "ignored" for unauthorized
// or unknown verbs (silent, no chat output) per the brief.
export function parseCommand(text: string, tags: TmiTags): Command {
  const trimmed = text.trim();
  if (!trimmed.toLowerCase().startsWith("!bot")) return { kind: "ignored" };
  if (!isAuthorized(tags)) return { kind: "ignored" };

  const after = trimmed.slice(4).trim();
  if (!after) return { kind: "unknown" };

  // Tokenize but respect double-quoted strings.
  const tokens = tokenize(after);
  if (tokens.length === 0) return { kind: "unknown" };
  const [verb, ...rest] = tokens;
  const verbLower = verb.toLowerCase();

  switch (verbLower) {
    case "on":
      return { kind: "on" };
    case "off":
      return { kind: "off" };
    case "stats":
      return { kind: "stats" };
    case "ban": {
      const u = rest[0];
      if (!u) return { kind: "unknown" };
      return { kind: "ban", username: u.replace(/^@/, "").toLowerCase() };
    }
    case "ignore": {
      const intent = rest[0];
      if (!intent) return { kind: "unknown" };
      const minutesRaw = rest[1];
      const minutes = minutesRaw ? Number(minutesRaw) : undefined;
      return {
        kind: "ignore",
        intent,
        minutes: minutes && !Number.isNaN(minutes) ? minutes : undefined,
      };
    }
    case "set": {
      if (rest.length < 2) return { kind: "unknown" };
      const sub = rest[0].toLowerCase();
      if (sub === "field" || sub === "qa" || sub === "link") {
        const target = rest[1];
        const value = rest.slice(2).join(" ");
        if (!target || !value) return { kind: "unknown" };
        const setTarget: SetTarget =
          sub === "field"
            ? { kind: "field", label: target }
            : sub === "qa"
              ? { kind: "qa", question: target }
              : { kind: "link", label: target };
        return { kind: "set", target: setTarget, value };
      }
      // Fixed-path form: !bot set <path> <value...>
      const path = rest[0];
      const value = rest.slice(1).join(" ");
      if (!FIXED_PATHS.has(path)) return { kind: "unknown" };
      return {
        kind: "set",
        target: { kind: "fixed", path: path as FixedPath },
        value,
      };
    }
    default:
      return { kind: "unknown" };
  }
}

function tokenize(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    out.push(m[1] !== undefined ? m[1] : m[2]);
  }
  return out;
}

function applyFixedPath(kb: KnowledgeBase, path: FixedPath, value: string): KnowledgeBase {
  const next: KnowledgeBase = JSON.parse(JSON.stringify(kb));
  switch (path) {
    case "identity.name":
      next.identity.name = value;
      break;
    case "identity.pronouns":
      next.identity.pronouns = value;
      break;
    case "bio":
      next.bio = value;
      break;
    case "game":
      next.game = value;
      break;
    case "schedule":
      next.schedule = value;
      break;
  }
  return next;
}

function findLinkIndex(kb: KnowledgeBase, label: string): number[] {
  const want = label.toLowerCase();
  const hits: number[] = [];
  kb.links.forEach((l, i) => {
    if (l.label.toLowerCase() === want) hits.push(i);
  });
  return hits;
}

function findCustomFieldIndex(kb: KnowledgeBase, label: string): number[] {
  const want = label.toLowerCase();
  const hits: number[] = [];
  kb.custom_fields.forEach((f, i) => {
    if (f.label.toLowerCase() === want) hits.push(i);
  });
  return hits;
}

function findCustomQaIndex(kb: KnowledgeBase, question: string): number[] {
  const want = question.toLowerCase();
  const hits: number[] = [];
  kb.custom_qa.forEach((qa, i) => {
    if (qa.question.toLowerCase() === want) hits.push(i);
  });
  return hits;
}

export type CommandOutcome = {
  result: "ok" | "error" | "noop";
  reply: string | null;
};

export async function handleCommand(
  state: ChannelState,
  cmd: Command,
): Promise<CommandOutcome> {
  switch (cmd.kind) {
    case "on": {
      state.postingDisabled = false;
      return { result: "ok", reply: "parrot is on" };
    }
    case "off": {
      state.postingDisabled = true;
      return { result: "ok", reply: "parrot is off" };
    }
    case "stats": {
      const today = new Date().toISOString().slice(0, 10);
      const rows = await db
        .select()
        .from(usageDaily)
        .where(
          and(eq(usageDaily.channelId, state.channelId), eq(usageDaily.date, today)),
        )
        .limit(1);
      const r = rows[0];
      const tokens = r ? Number(r.tokensInput) + Number(r.tokensOutput) : 0;
      const reply = `seen=${state.stats.seen} kept=${state.stats.kept} posted=${state.stats.posted} blocked=${state.stats.blocked} tokens=${tokens} today`;
      return { result: "ok", reply };
    }
    case "ban": {
      state.bannedAuthors.add(cmd.username);
      return { result: "ok", reply: `${cmd.username} ignored` };
    }
    case "ignore": {
      if (!state.intentVocab.vocab.includes(cmd.intent)) {
        return { result: "error", reply: `unknown intent: ${cmd.intent}` };
      }
      const m = state.cooldowns.ignoreIntent(cmd.intent, cmd.minutes);
      return { result: "ok", reply: `ignoring ${cmd.intent} for ${m} min` };
    }
    case "set":
      return handleSet(state, cmd);
    case "unknown":
    case "ignored":
      return { result: "noop", reply: null };
  }
}

async function handleSet(
  state: ChannelState,
  cmd: Extract<Command, { kind: "set" }>,
): Promise<CommandOutcome> {
  let nextKb: KnowledgeBase;
  let label: string;

  if (cmd.target.kind === "fixed") {
    nextKb = applyFixedPath(state.kb, cmd.target.path, cmd.value);
    label = cmd.target.path;
  } else if (cmd.target.kind === "field") {
    const hits = findCustomFieldIndex(state.kb, cmd.target.label);
    if (hits.length === 0) {
      return { result: "error", reply: `unknown field: ${cmd.target.label}` };
    }
    if (hits.length > 1) {
      return {
        result: "error",
        reply: `ambiguous field; please edit in dashboard`,
      };
    }
    nextKb = JSON.parse(JSON.stringify(state.kb));
    nextKb.custom_fields[hits[0]].value = cmd.value;
    label = `field "${cmd.target.label}"`;
  } else if (cmd.target.kind === "qa") {
    const hits = findCustomQaIndex(state.kb, cmd.target.question);
    if (hits.length === 0) {
      return { result: "error", reply: `unknown qa: ${cmd.target.question}` };
    }
    if (hits.length > 1) {
      return {
        result: "error",
        reply: `ambiguous qa; please edit in dashboard`,
      };
    }
    nextKb = JSON.parse(JSON.stringify(state.kb));
    nextKb.custom_qa[hits[0]].answer = cmd.value;
    label = `qa "${cmd.target.question}"`;
  } else {
    const hits = findLinkIndex(state.kb, cmd.target.label);
    if (hits.length === 0) {
      return { result: "error", reply: `unknown link: ${cmd.target.label}` };
    }
    if (hits.length > 1) {
      return {
        result: "error",
        reply: `ambiguous link; please edit in dashboard`,
      };
    }
    nextKb = JSON.parse(JSON.stringify(state.kb));
    nextKb.links[hits[0]].url = cmd.value;
    label = `link "${cmd.target.label}"`;
  }

  const parsed = kbSchema.safeParse(nextKb);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "invalid value";
    return { result: "error", reply: `validation: ${msg}` };
  }

  try {
    await db
      .update(channels)
      .set({ kb: parsed.data as KnowledgeBase, updatedAt: new Date() })
      .where(eq(channels.id, state.channelId));
  } catch (err) {
    logger.error({ err, channelId: state.channelId }, "!bot set db update failed");
    return { result: "error", reply: "error: db update failed" };
  }

  state.kb = parsed.data as KnowledgeBase;
  state.kbHash = hashKb(state.kb);
  state.kbVersion += 1;
  state.kbUrlAllowlist = extractKbUrls(state.kb);
  state.intentVocab = deriveIntents(state.kb);
  invalidateCache(state.channelId);

  return { result: "ok", reply: `set ${label} ok` };
}
