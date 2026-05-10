"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function ChannelSwitcher({
  channels,
  primaryLogin,
}: {
  channels: { twitchChannel: string }[];
  primaryLogin: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("channel") ?? primaryLogin;

  const onChange = (next: string) => {
    const newParams = new URLSearchParams(params.toString());
    if (next === primaryLogin) newParams.delete("channel");
    else newParams.set("channel", next);
    const qs = newParams.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="mt-6">
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-text-muted">
        Channel
      </div>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text"
      >
        {channels.map((c) => (
          <option key={c.twitchChannel} value={c.twitchChannel}>
            {c.twitchChannel === primaryLogin
              ? `${c.twitchChannel} (yours)`
              : `${c.twitchChannel} (read-only)`}
          </option>
        ))}
      </select>
    </div>
  );
}
