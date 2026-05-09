import { getAuthContext } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { DeleteAccountDialog } from "./_delete-dialog";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = (await getAuthContext())!;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold">Settings</h1>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-[16px] font-semibold">Account</h2>
        <Row label="Twitch username" value={ctx.user.twitchLogin} />
        <Row label="Email" value={ctx.user.email ?? "—"} />
        <Row label="Plan" value="Free" />
        <p className="mt-3 text-[12px] text-text-muted">Pro plan coming soon.</p>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-2 text-[16px] font-semibold">Bot account</h2>
        <p className="mb-3 text-[14px] text-text-muted">
          Parrot posts as <strong className="text-text">@parrotparrotbot</strong>. It needs
          mod status so Twitch doesn't drop its messages during Slow / Sub-only / Follower-only
          mode. It can only post — no banning, deleting, or whispers.
        </p>
        <p className="mb-3 text-[14px] text-text-muted">If it's been un-modded, re-add with:</p>
        <code className="block w-fit rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[13px] text-accent">
          /mod parrotparrotbot
        </code>
      </Card>

      <Card className="border-[#5a2020]">
        <h2 className="mb-2 text-[16px] font-semibold text-[#ff8a8a]">Danger zone</h2>
        <p className="mb-4 text-[14px] text-text-muted">
          Delete your account and all associated data. This can't be undone.
        </p>
        <DeleteAccountDialog twitchLogin={ctx.user.twitchLogin} />
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <span className="text-[13px] text-text-muted">{label}</span>
      <span className="text-[14px]">{value}</span>
    </div>
  );
}
