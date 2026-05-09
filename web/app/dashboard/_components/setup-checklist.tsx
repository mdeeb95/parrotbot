"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SetupChecklist({
  isModded,
  hasIdentity,
}: {
  isModded: boolean;
  hasIdentity: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const confirmMod = async () => {
    setConfirming(true);
    try {
      const res = await fetch("/api/channels/mod-confirm", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      toast.success("Marked as modded");
      router.refresh();
    } catch {
      toast.error("Couldn't update. Try again.");
    } finally {
      setConfirming(false);
    }
  };

  const copyMod = async () => {
    await navigator.clipboard.writeText("/mod parrotparrotbot");
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-[18px] font-semibold">Finish setup</h2>
      <p className="mb-5 text-[14px] text-text-muted">
        Two quick steps before Parrot can start answering.
      </p>

      <div className="space-y-4">
        <Step done={isModded} num={1} title="Mod the bot so it can post in any chat mode">
          {!isModded ? (
            <>
              <p className="mb-2 text-[14px] text-text-muted">
                Twitch silently drops unmodded posts when chat is in Slow / Sub-only / Follower-only mode. Modding Parrot keeps it working.
              </p>
              <p className="mb-3 text-[12px] text-text-muted">
                Parrot can only post answers. It cannot ban, time out, delete messages, or read whispers.
              </p>
              <p className="mb-3 text-[14px] text-text-muted">
                Type this in your Twitch chat:
              </p>
              <div className="mb-3 flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[13px] text-accent">
                  /mod parrotparrotbot
                </code>
                <Button variant="ghost" size="sm" onClick={copyMod}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
              </div>
              <Button onClick={confirmMod} disabled={confirming} size="sm">
                I've done this
              </Button>
            </>
          ) : (
            <p className="text-[14px] text-text-muted">Done.</p>
          )}
        </Step>

        <Step done={hasIdentity} num={2} title="Tell Parrot about your stream">
          {!hasIdentity ? (
            <>
              <p className="mb-3 text-[14px] text-text-muted">
                Set your name, server, build, addons, and links — about five minutes.
              </p>
              <Link href="/dashboard/kb">
                <Button size="sm">Open knowledge base</Button>
              </Link>
            </>
          ) : (
            <p className="text-[14px] text-text-muted">Done.</p>
          )}
        </Step>
      </div>
    </Card>
  );
}

function Step({
  num,
  title,
  done,
  children,
}: {
  num: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div
        className={
          done
            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[#1a0d09]"
            : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-[13px] font-semibold text-text-muted"
        }
      >
        {done ? <Check className="h-4 w-4" /> : num}
      </div>
      <div className="flex-1">
        <h3
          className={
            done
              ? "mb-1 text-[15px] font-semibold text-text-muted line-through"
              : "mb-1 text-[15px] font-semibold text-text"
          }
        >
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
