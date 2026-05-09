import Link from "next/link";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@parrot/db";
import { answersLog, blocksSummary } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import {
  STREAMER_ACTIONABLE_REASONS,
  categorize,
  labelFor,
} from "@/lib/block-reasons";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const ACTIONABLE: readonly string[] = STREAMER_ACTIONABLE_REASONS;

type Mode = "actionable" | "all";

function pageHref(mode: Mode, page: number): string {
  const params = new URLSearchParams();
  if (mode === "all") params.set("show", "all");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/dashboard/activity?${qs}` : "/dashboard/activity";
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string; show?: string };
}) {
  const ctx = (await getAuthContext())!;
  const mode: Mode = searchParams.show === "all" ? "all" : "actionable";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const filter =
    mode === "all"
      ? eq(answersLog.channelId, ctx.channel.id)
      : and(
          eq(answersLog.channelId, ctx.channel.id),
          or(
            isNull(answersLog.blockReason),
            inArray(answersLog.blockReason, [...ACTIONABLE]),
          ),
        );

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(answersLog)
    .where(filter);

  const rows = await db
    .select()
    .from(answersLog)
    .where(filter)
    .orderBy(desc(answersLog.ts))
    .limit(PAGE_SIZE)
    .offset(offset);

  // Today's block summary card.
  const today = todayUtc();
  const summaryRows = await db
    .select()
    .from(blocksSummary)
    .where(
      and(
        eq(blocksSummary.channelId, ctx.channel.id),
        eq(blocksSummary.date, today),
      ),
    );
  const totalBlockedToday = summaryRows.reduce((acc, r) => acc + r.count, 0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold">Activity</h1>
        <p className="text-[14px] text-text-muted">
          What Parrot answered, and what it didn't.
        </p>
      </div>

      {summaryRows.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-[14px] font-semibold text-text-muted">
            Today: {totalBlockedToday} blocked
          </h2>
          <div className="flex flex-wrap gap-2">
            {summaryRows
              .sort((a, b) => b.count - a.count)
              .map((r) => {
                const label = labelFor(r.blockReason);
                const cat = categorize(r.blockReason);
                return (
                  <span
                    key={r.blockReason}
                    title={label.explainer}
                    className={`rounded-full border px-2.5 py-0.5 text-[12px] ${badgeClass(cat)}`}
                  >
                    {label.title} · {r.count}
                  </span>
                );
              })}
          </div>
        </Card>
      )}

      <div className="mb-4 flex items-center gap-2 text-[13px]">
        <span className="text-text-muted">Show:</span>
        <Link
          href={pageHref("actionable", 1)}
          className={`rounded-lg border px-3 py-1.5 ${
            mode === "actionable"
              ? "border-accent bg-bg-elevated text-text"
              : "border-border bg-bg text-text-muted hover:border-text-muted"
          }`}
        >
          Actionable
        </Link>
        <Link
          href={pageHref("all", 1)}
          className={`rounded-lg border px-3 py-1.5 ${
            mode === "all"
              ? "border-accent bg-bg-elevated text-text"
              : "border-border bg-bg text-text-muted hover:border-text-muted"
          }`}
        >
          All
        </Link>
      </div>

      {total === 0 ? (
        <Card>
          <p className="text-[14px] text-text-muted">
            Once your chat asks questions, they'll appear here. Use the Activity
            log to spot questions Parrot is missing — head to your{" "}
            <Link
              href="/dashboard/kb"
              className="text-accent underline-offset-4 hover:underline"
            >
              Knowledge Base
            </Link>{" "}
            and add them.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-border text-left text-[12px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Question</th>
                  <th className="px-4 py-3 font-medium">Answer / Intent</th>
                  <th className="px-4 py-3 text-right font-medium">Askers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isPosted = r.blockReason == null;
                  const cat = isPosted ? null : categorize(r.blockReason!);
                  const label = isPosted ? null : labelFor(r.blockReason!);
                  const inputs = (r.inputMessages as { author: string; text: string }[]) ?? [];
                  const firstInput = inputs[0]?.text ?? "—";
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-b-0 align-top"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                        {r.ts.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {isPosted ? (
                          <span className="rounded-full border border-[#1f4d2a] bg-[#0f2415] px-2.5 py-0.5 text-[12px] text-[#7ee2a3]">
                            Posted
                          </span>
                        ) : (
                          <span
                            title={label!.explainer}
                            className={`rounded-full border px-2.5 py-0.5 text-[12px] ${badgeClass(cat!)}`}
                          >
                            {label!.title}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {truncate(firstInput, 80)}
                      </td>
                      <td className="px-4 py-3">
                        {isPosted ? (
                          r.answerText ?? ""
                        ) : (
                          <span className="text-[13px] text-text-muted">
                            {r.intent ?? "(no intent)"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-text-muted">
                        {r.askerCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[13px] text-text-muted">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(mode, page - 1)}
                className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 hover:border-text-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(mode, page + 1)}
                className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 hover:border-text-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function badgeClass(cat: "actionable" | "operational" | "safety"): string {
  switch (cat) {
    case "actionable":
      return "border-[#5c4017] bg-[#241a0e] text-[#f0b35a]";
    case "operational":
      return "border-border bg-bg text-text-muted";
    case "safety":
      return "border-[#5a2020] bg-[#2a1010] text-[#ff8a8a]";
  }
}
