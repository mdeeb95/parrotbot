import { createHash } from "node:crypto";
import type { KnowledgeBase } from "@parrot/db/schema";
import type { IntentVocab } from "./types";

const URL_RE = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;

export function deriveIntents(kb: KnowledgeBase): IntentVocab {
  const vocab: string[] = [];
  const descriptions: Record<string, string> = {};

  // Built-ins, only included when the field has content.
  if (kb.identity.name || kb.identity.pronouns) {
    vocab.push("identity");
    descriptions["identity"] = `streamer's name and pronouns: ${JSON.stringify(kb.identity)}`;
  }
  if (kb.bio) {
    vocab.push("bio");
    descriptions["bio"] = "streamer's general bio";
  }
  if (kb.game) {
    vocab.push("current_game");
    descriptions["current_game"] = `current game: ${kb.game}`;
  }
  if (kb.schedule) {
    vocab.push("schedule");
    descriptions["schedule"] = "streaming schedule";
  }
  kb.links.forEach((l, i) => {
    if (!l.label || !l.url) return;
    const id = `link:link_${i}`;
    vocab.push(id);
    descriptions[id] = `link to ${JSON.stringify(l.label)}: ${l.url}`;
  });

  kb.custom_fields.forEach((f, i) => {
    if (!f.label || !f.value) return;
    const id = `custom_field:cf_${i}`;
    vocab.push(id);
    descriptions[id] = `custom field labeled ${JSON.stringify(f.label)}`;
  });

  kb.custom_qa.forEach((qa, i) => {
    if (!qa.question || !qa.answer) return;
    const id = `custom_qa:qa_${i}`;
    vocab.push(id);
    descriptions[id] = `custom Q&A: ${JSON.stringify(qa.question)}`;
  });

  vocab.push("off_topic");
  descriptions["off_topic"] = "anything not covered by the knowledge base";

  return { vocab, descriptions };
}

export function extractKbUrls(kb: KnowledgeBase): Set<string> {
  const out = new Set<string>();
  function add(s: string | undefined | null) {
    if (!s) return;
    const matches = s.match(URL_RE) ?? [];
    for (const u of matches) {
      const cleaned = u.replace(/[),.;]+$/, "").toLowerCase();
      out.add(cleaned);
    }
  }
  for (const l of kb.links) add(l.url);
  add(kb.bio);
  add(kb.schedule);
  for (const f of kb.custom_fields) {
    add(f.value);
  }
  for (const qa of kb.custom_qa) {
    add(qa.answer);
  }
  return out;
}

export function renderKbForPrompt(kb: KnowledgeBase): string {
  // Stable JSON representation. JSON.stringify with a fixed key order via replacer
  // would matter for Anthropic's prompt cache hashing — but the KB shape is fixed,
  // so this serialization is already stable across calls.
  return JSON.stringify(kb, null, 2);
}

export function hashKb(kb: KnowledgeBase): string {
  return createHash("sha256").update(JSON.stringify(kb)).digest("hex");
}
