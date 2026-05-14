// Shape and limits must match packages/db/src/kb-schema.ts. The worker re-validates
// with Zod on write, so divergence can't corrupt data — but staying aligned means
// users don't hit validation surprises on save.

export type KbLink = { label: string; url: string };
export type KbField = { label: string; value: string };
export type KbQa = { question: string; answer: string };

export type KbInput = {
  identity: { name: string; pronouns: string };
  bio: string;
  game: string;
  schedule: string;
  links: KbLink[];
  custom_fields: KbField[];
  custom_qa: KbQa[];
};

export type FieldErrors = Record<string, string>;

export type ValidateResult =
  | { ok: true; data: KbInput }
  | { ok: false; errors: FieldErrors };

const URL_RE = /^https?:\/\/.+/i;

function fail(errors: FieldErrors): { ok: false; errors: FieldErrors } {
  return { ok: false, errors };
}

function str(value: unknown, field: string, max: number, errors: FieldErrors, min = 0): string {
  if (typeof value !== "string") {
    errors[field] = "Required";
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length < min) errors[field] = "Required";
  else if (trimmed.length > max) errors[field] = `Must be ${max} characters or fewer`;
  return trimmed;
}

function array(value: unknown, field: string, max: number, errors: FieldErrors): unknown[] {
  if (!Array.isArray(value)) {
    errors[field] = "Must be a list";
    return [];
  }
  if (value.length > max) errors[field] = `At most ${max} items`;
  return value;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function validateKb(raw: unknown): ValidateResult {
  const errors: FieldErrors = {};

  if (!raw || typeof raw !== "object") return fail({ _: "Invalid body" });
  const r = asObject(raw);

  const identity = asObject(r.identity);
  const name = str(identity.name, "identity.name", 100, errors);
  const pronouns = str(identity.pronouns, "identity.pronouns", 50, errors);

  const bio = str(r.bio, "bio", 2000, errors);
  const game = str(r.game, "game", 200, errors);
  const schedule = str(r.schedule, "schedule", 2000, errors);

  const linksRaw = array(r.links, "links", 20, errors);
  const links: KbLink[] = linksRaw.map((item, i) => {
    const o = asObject(item);
    const label = str(o.label, `links.${i}.label`, 50, errors, 1);
    const url = str(o.url, `links.${i}.url`, 500, errors, 1);
    if (url && !URL_RE.test(url)) errors[`links.${i}.url`] = "Must be a valid URL";
    return { label, url };
  });

  const fieldsRaw = array(r.custom_fields, "custom_fields", 50, errors);
  const custom_fields: KbField[] = fieldsRaw.map((item, i) => {
    const o = asObject(item);
    return {
      label: str(o.label, `custom_fields.${i}.label`, 100, errors, 1),
      value: str(o.value, `custom_fields.${i}.value`, 1000, errors, 1),
    };
  });

  const qaRaw = array(r.custom_qa, "custom_qa", 50, errors);
  const custom_qa: KbQa[] = qaRaw.map((item, i) => {
    const o = asObject(item);
    return {
      question: str(o.question, `custom_qa.${i}.question`, 300, errors, 1),
      answer: str(o.answer, `custom_qa.${i}.answer`, 2000, errors, 1),
    };
  });

  if (Object.keys(errors).length > 0) return fail(errors);

  return {
    ok: true,
    data: {
      identity: { name, pronouns },
      bio,
      game,
      schedule,
      links,
      custom_fields,
      custom_qa,
    },
  };
}
