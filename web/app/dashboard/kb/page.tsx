import { getAuthContext } from "@/lib/auth";
import { KbForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function KbPage() {
  const ctx = (await getAuthContext())!;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold">Knowledge base</h1>
        <p className="text-[14px] text-text-muted">
          What Parrot knows about your stream. Update anytime — including mid-stream.
        </p>
      </div>
      <KbForm initial={ctx.channel.kb} />
    </div>
  );
}
