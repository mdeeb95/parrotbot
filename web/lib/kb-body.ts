import { kbSchema, type KbInput } from "@parrot/db/kb-schema";

export type ParseResult =
  | { ok: true; data: KbInput }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        issues: ReturnType<typeof flattenIssues>;
      };
    };

function flattenIssues(parsed: ReturnType<typeof kbSchema.safeParse>) {
  if (parsed.success) return null;
  return parsed.error.flatten();
}

export function parseKbBody(raw: unknown): ParseResult {
  const parsed = kbSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_body", issues: parsed.error.flatten() },
    };
  }
  return { ok: true, data: parsed.data };
}
