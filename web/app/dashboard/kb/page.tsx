import { getAuthContext } from "@/lib/auth";
import { KbForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function KbPage({
  searchParams,
}: {
  searchParams: { channel?: string };
}) {
  const ctx = (await getAuthContext(searchParams.channel))!;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold">Knowledge base</h1>
        <p className="text-[14px] text-text-muted">
          What Parrot knows about your stream. Update anytime — including mid-stream.
        </p>
      </div>
      {ctx.isPrimary ? (
        <KbForm initial={ctx.channel.kb} />
      ) : (
        <div className="rounded-xl border border-border bg-bg-elevated p-6">
          <p className="text-[14px] text-text-muted">
            Read-only view of <strong className="text-text">{ctx.channel.twitchChannel}</strong>'s
            KB. Editing is disabled outside your primary channel.
          </p>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-4 text-[12px] text-text-muted">
            {JSON.stringify(ctx.channel.kb, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
