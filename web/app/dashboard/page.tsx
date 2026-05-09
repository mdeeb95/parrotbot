import Link from "next/link";
import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@parrot/db";
import { usageDaily, answersLog, blocksSummary } from "@parrot/db/schema";
import { getAuthContext } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { SetupChecklist } from "./_components/setup-checklist";
import { StatusToggle } from "./_components/status-toggle";
import { cn } from "@/lib/utils";
import { categorize, labelFor } from "@/lib/block-reasons";

export const dynamic = "force-dynamic";

const FREE_LIMIT = 500;

function todayDateString() {
  // YYYY-MM-DD in local time
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function OverviewPage() {
  const ctx = (await getAuthContext())!;
  const { channel } = ctx;

  const [monthRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${usageDaily.answersPosted}), 0)::int`,
    })
    .from(usageDaily)
    .where(
      and(
        eq(usageDaily.channelId, channel.id),
        sql`${usageDaily.date} >= ${monthStartString()}`,
      ),
    );

  const [todayRow] = await db
    .select()
    .from(usageDaily)
    .where(
      and(
        eq(usageDaily.channelId, channel.id),
        eq(usageDaily.date, todayDateString()),
      ),
    )
    .limit(1);

  const topIntent = await db
    .select({
      intent: answersLog.intent,
      count: sql<number>`count(*)::int`,
    })
    .from(answersLog)
    .where(
      and(
        eq(answersLog.channelId, channel.id),
        sql`${answersLog.ts} >= current_date`,
      ),
    )
    .groupBy(answersLog.intent)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const todayBlocks = await db
    .select()
    .from(blocksSummary)
    .where(
      and(
        eq(blocksSummary.channelId, channel.id),
        eq(blocksSummary.date, todayDateString()),
      ),
    );
  const todayBlockedTotal = todayBlocks.reduce((acc, r) => acc + r.count, 0);

  const monthlyAnswers = monthRow?.total ?? 0;
  const todayAnswers = todayRow?.answersPosted ?? 0;
  const usagePct = Math.min(100, (monthlyAnswers / FREE_LIMIT) * 100);
  const overCap = monthlyAnswers >= FREE_LIMIT;
  const warn = usagePct >= 80;

  const hasIdentity = !!channel.kb.identity?.name?.trim();
  const setupDone = channel.isModded && hasIdentity;
  const canActivate = setupDone;
  const hasAnyUsage = monthlyAnswers > 0 || todayAnswers > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold">Overview</h1>
        <p className="text-[14px] text-text-muted">
          Welcome back, {ctx.user.displayName}.
        </p>
      </div>

      {!setupDone && (
        <SetupChecklist isModded={channel.isModded} hasIdentity={hasIdentity} />
      )}

      <Card className="mb-6">
        <StatusToggle
          isActive={channel.isActive}
          canActivate={canActivate}
          twitchChannel={channel.twitchChannel}
        />
      </Card>

      <Card className="mb-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-[14px] text-text-muted">This month</div>
            <div className="text-[24px] font-bold">
              {monthlyAnswers}
              <span className="text-[16px] font-medium text-text-muted">
                {" "}
                / {FREE_LIMIT} answers
              </span>
            </div>
          </div>
          <div className="text-[13px] text-text-muted">Free tier</div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg">
          <div
            className={cn(
              "h-full transition-all",
              warn ? "bg-accent" : "bg-green",
            )}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        {overCap && (
          <p className="mt-3 text-[13px] text-accent">
            Free tier limit reached. Pro tier coming soon.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-[16px] font-semibold">Today</h2>
        {hasAnyUsage || todayBlockedTotal > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Answers posted" value={String(todayAnswers)} />
              <Stat
                label="Top question"
                value={topIntent[0]?.intent || "—"}
              />
              <Stat label="Active" value={channel.isActive ? "Yes" : "No"} />
            </div>
            {todayBlockedTotal > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[13px] text-text-muted">
                    {todayBlockedTotal} blocked today
                  </div>
                  <Link
                    href="/dashboard/activity?show=actionable"
                    className="text-[12px] text-accent underline-offset-4 hover:underline"
                  >
                    View activity →
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayBlocks
                    .sort((a, b) => b.count - a.count)
                    .map((r) => {
                      const label = labelFor(r.blockReason);
                      const cat = categorize(r.blockReason);
                      return (
                        <span
                          key={r.blockReason}
                          title={label.explainer}
                          className={`rounded-full border px-2.5 py-0.5 text-[12px] ${
                            cat === "actionable"
                              ? "border-[#5c4017] bg-[#241a0e] text-[#f0b35a]"
                              : cat === "operational"
                                ? "border-border bg-bg text-text-muted"
                                : "border-[#5a2020] bg-[#2a1010] text-[#ff8a8a]"
                          }`}
                        >
                          {label.title} · {r.count}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-[14px] text-text-muted">
            Once your bot starts answering, you'll see stats here.
          </p>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[13px] text-text-muted">{label}</div>
      <div className="truncate text-[18px] font-semibold">{value}</div>
    </div>
  );
}
