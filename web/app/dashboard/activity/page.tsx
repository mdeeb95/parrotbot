import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@parrot/db";
import { answersLog } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const ctx = (await getAuthContext())!;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(answersLog)
    .where(eq(answersLog.channelId, ctx.channel.id));

  const rows = await db
    .select()
    .from(answersLog)
    .where(eq(answersLog.channelId, ctx.channel.id))
    .orderBy(desc(answersLog.ts))
    .limit(PAGE_SIZE)
    .offset(offset);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold">Activity</h1>
        <p className="text-[14px] text-text-muted">
          What Parrot has been answering, newest first.
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <p className="text-[14px] text-text-muted">
            Once your bot answers questions, they'll appear here. The Activity log
            helps you spot questions Parrot is missing — if you see weird intents or
            low-confidence skips, head to your{" "}
            <Link href="/dashboard/kb" className="text-accent underline-offset-4 hover:underline">
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
                  <th className="px-4 py-3 font-medium">Intent</th>
                  <th className="px-4 py-3 font-medium">Answer</th>
                  <th className="px-4 py-3 font-medium text-right">Askers</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-b-0 align-top"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                      {r.ts.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded bg-bg px-2 py-0.5 text-[12px] text-accent">
                        {r.intent ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.answerText ?? ""}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-text-muted">
                      {r.askerCount}
                    </td>
                  </tr>
                ))}
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
                href={`/dashboard/activity?page=${page - 1}`}
                className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 hover:border-text-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/activity?page=${page + 1}`}
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
