"use client";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  Controller,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { kbSchema, type KbInput } from "@parrot/db/kb-schema";
import type { KnowledgeBase } from "@parrot/db/schema";

function toInput(kb: KnowledgeBase): KbInput {
  return {
    identity: { ...kb.identity },
    bio: kb.bio ?? "",
    game: kb.game ?? "",
    schedule: kb.schedule ?? "",
    links: (kb.links ?? []).map((l) => ({ ...l })),
    custom_fields: (kb.custom_fields ?? []).map((f) => ({ ...f })),
    custom_qa: (kb.custom_qa ?? []).map((q) => ({ ...q })),
  };
}

function relativeTime(date: Date): string {
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function collectErrorPaths(errors: FieldErrors<KbInput>): string[] {
  const out: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (!v || typeof v !== "object") return;
    const obj = v as Record<string, unknown>;
    if (typeof obj.message === "string") {
      out.push(path || "(root)");
      return;
    }
    for (const k of Object.keys(obj)) {
      if (k === "ref" || k === "types") continue;
      walk(obj[k], path ? `${path}.${k}` : k);
    }
  };
  walk(errors, "");
  return out;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-[12px] text-accent" role="alert">
      {msg}
    </p>
  );
}

const DEFAULT_OPEN = ["about", "bio", "custom_fields"];

export function KbForm({ initial }: { initial: KnowledgeBase }) {
  const router = useRouter();
  const defaultValues = useMemo(() => toInput(initial), [initial]);

  const form = useForm<KbInput>({
    resolver: zodResolver(kbSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { register, handleSubmit, control, formState, reset } = form;
  const fields = useFieldArray({ control, name: "custom_fields" });
  const qa = useFieldArray({ control, name: "custom_qa" });
  const links = useFieldArray({ control, name: "links" });

  const [accordionValue, setAccordionValue] = useState<string[]>(DEFAULT_OPEN);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [, setTick] = useState(0);
  const justSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1Hz tick so "Saved Xs ago" stays accurate within the first minute.
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  // Clear the just-saved timer on unmount.
  useEffect(() => {
    return () => {
      if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
    };
  }, []);

  const onValid = async (data: KbInput) => {
    try {
      const res = await fetch("/api/channels/kb", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const j = (await res.json()) as {
            issues?: { fieldErrors?: Record<string, string[]> };
          };
          const fe = j?.issues?.fieldErrors;
          if (fe) {
            const first = Object.entries(fe)[0];
            if (first && first[1]?.[0]) {
              detail = `: ${first[0]} — ${first[1][0]}`;
            }
          }
        } catch {
          // ignore parse errors
        }
        toast.error(`Couldn't save${detail}. Try again.`);
        return;
      }
      toast.success("Knowledge base saved.");
      reset(data);
      setLastSavedAt(new Date());
      setJustSaved(true);
      if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
      justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 1500);
      router.refresh();
    } catch {
      toast.error("Couldn't save. Try again.");
    }
  };

  const onInvalid = (errors: FieldErrors<KbInput>) => {
    const sections = Object.keys(errors);
    if (sections.length) {
      setAccordionValue((prev) => Array.from(new Set([...prev, ...sections])));
    }
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const onSubmit = handleSubmit(onValid, onInvalid);
  const errPaths =
    formState.isSubmitted && !formState.isValid
      ? collectErrorPaths(formState.errors)
      : [];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Accordion
        type="multiple"
        value={accordionValue}
        onValueChange={setAccordionValue}
        className="space-y-3"
      >
        <AccordionItem value="about">
          <AccordionTrigger>About you</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                error={formState.errors.identity?.name?.message}
                {...register("identity.name")}
              />
              <Field
                label="Pronouns"
                error={formState.errors.identity?.pronouns?.message}
                {...register("identity.pronouns")}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bio">
          <AccordionTrigger>Bio</AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-[13px] text-text-muted">
              Free-form context. Who you are, what you're streaming today, anything you want
              Parrot to know.
            </p>
            <Textarea
              rows={5}
              placeholder="I'm aoDeeb, variety streamer. Currently grinding Path of Exile, switching to WoW Classic on weekends."
              {...register("bio")}
            />
            <FieldError msg={formState.errors.bio?.message} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="game">
          <AccordionTrigger>Game</AccordionTrigger>
          <AccordionContent>
            <Label>What you're playing</Label>
            <Input
              placeholder="Path of Exile 2 — Hardcore SSF"
              {...register("game")}
            />
            <FieldError msg={formState.errors.game?.message} />
            <p className="mt-2 text-[13px] text-text-muted">
              Update this whenever you switch games. You can also change it mid-stream by typing{" "}
              <code className="rounded bg-bg px-1.5 py-px text-accent">!parrot set game X</code>{" "}
              in your own chat.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schedule">
          <AccordionTrigger>Schedule</AccordionTrigger>
          <AccordionContent>
            <Label>When you stream</Label>
            <Textarea
              placeholder="Mon/Wed/Fri 7pm-11pm PT, weekend mornings."
              {...register("schedule")}
            />
            <FieldError msg={formState.errors.schedule?.message} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="links">
          <AccordionTrigger>Links</AccordionTrigger>
          <AccordionContent>
            <p className="mb-4 text-[13px] text-text-muted">
              Twitter, YouTube, Discord, Bluesky, Patreon — anything chat asks for.
            </p>
            <div className="space-y-4">
              {links.fields.length === 0 && (
                <p className="text-[13px] text-text-muted">No links yet.</p>
              )}
              {links.fields.map((f, i) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-border bg-bg p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[13px] text-text-muted">Link #{i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => links.remove(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
                    <div>
                      <Label>Label</Label>
                      <Controller
                        control={control}
                        name={`links.${i}.label`}
                        render={({ field }) => (
                          <Input {...field} placeholder="Twitter" />
                        )}
                      />
                      <FieldError msg={formState.errors.links?.[i]?.label?.message} />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Controller
                        control={control}
                        name={`links.${i}.url`}
                        render={({ field }) => (
                          <Input {...field} placeholder="https://x.com/..." />
                        )}
                      />
                      <FieldError msg={formState.errors.links?.[i]?.url?.message} />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => links.append({ label: "", url: "" })}
              >
                <Plus className="h-4 w-4" /> Add another
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="custom_fields">
          <AccordionTrigger>Custom info</AccordionTrigger>
          <AccordionContent>
            <p className="mb-4 text-[13px] text-text-muted">
              Short labeled facts Parrot can quote. Build links, sponsor codes, server names —
              anything chat asks about.
            </p>
            <div className="space-y-4">
              {fields.fields.length === 0 && (
                <p className="text-[13px] text-text-muted">No custom fields yet.</p>
              )}
              {fields.fields.map((f, i) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-border bg-bg p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[13px] text-text-muted">Field #{i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fields.remove(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
                    <div>
                      <Label>Label</Label>
                      <Controller
                        control={control}
                        name={`custom_fields.${i}.label`}
                        render={({ field }) => (
                          <Input {...field} placeholder="Build link" />
                        )}
                      />
                      <FieldError msg={formState.errors.custom_fields?.[i]?.label?.message} />
                    </div>
                    <div>
                      <Label>Value</Label>
                      <Controller
                        control={control}
                        name={`custom_fields.${i}.value`}
                        render={({ field }) => (
                          <Input {...field} placeholder="https://wago.io/..." />
                        )}
                      />
                      <FieldError msg={formState.errors.custom_fields?.[i]?.value?.message} />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => fields.append({ label: "", value: "" })}
              >
                <Plus className="h-4 w-4" /> Add another
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="custom_qa">
          <AccordionTrigger>Custom Q&A</AccordionTrigger>
          <AccordionContent>
            <p className="mb-4 text-[13px] text-text-muted">
              Longer answers to questions chat asks all the time.
            </p>
            <div className="space-y-4">
              {qa.fields.length === 0 && (
                <p className="text-[13px] text-text-muted">No Q&amp;A yet.</p>
              )}
              {qa.fields.map((f, i) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-border bg-bg p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[13px] text-text-muted">Q&amp;A #{i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => qa.remove(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Question</Label>
                      <Controller
                        control={control}
                        name={`custom_qa.${i}.question`}
                        render={({ field }) => (
                          <Input {...field} placeholder="What's your setup?" />
                        )}
                      />
                      <FieldError msg={formState.errors.custom_qa?.[i]?.question?.message} />
                    </div>
                    <div>
                      <Label>Answer</Label>
                      <Controller
                        control={control}
                        name={`custom_qa.${i}.answer`}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="3090, AMD 5800X, 32GB RAM, dual 1440p monitors..."
                          />
                        )}
                      />
                      <FieldError msg={formState.errors.custom_qa?.[i]?.answer?.message} />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                onClick={() => qa.append({ question: "", answer: "" })}
              >
                <Plus className="h-4 w-4" /> Add another
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {errPaths.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-accent bg-bg-elevated p-3 text-[13px] text-accent"
        >
          {errPaths.length} error{errPaths.length === 1 ? "" : "s"} — {errPaths.join(", ")}
        </div>
      )}

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {lastSavedAt && (
          <span className="text-[12px] text-text-muted">
            Saved {relativeTime(lastSavedAt)}
          </span>
        )}
        <Button
          type="submit"
          disabled={!formState.isDirty || formState.isSubmitting}
        >
          {formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : justSaved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

const Field = forwardRef<
  HTMLInputElement,
  { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Field({ label, error, ...rest }, ref) {
  return (
    <div>
      <Label>{label}</Label>
      <Input ref={ref} {...rest} />
      <FieldError msg={error} />
    </div>
  );
});
