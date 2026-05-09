"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function StatusToggle({
  isActive,
  canActivate,
  twitchChannel,
}: {
  isActive: boolean;
  canActivate: boolean;
  twitchChannel: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(isActive);

  const onChange = async (next: boolean) => {
    setPending(true);
    setActive(next); // optimistic
    try {
      const res = await fetch("/api/channels/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Parrot is on." : "Parrot is off.");
      router.refresh();
    } catch {
      setActive(!next);
      toast.error("Couldn't update. Try again.");
    } finally {
      setPending(false);
    }
  };

  const disabled = !canActivate || pending;
  const swatch = (
    <Switch
      checked={active}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label="Toggle Parrot"
    />
  );

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[20px] font-semibold">
          Parrot is{" "}
          <span className={active ? "text-accent" : "text-text-muted"}>
            {active ? "on" : "off"}
          </span>
        </div>
        <p className="text-[14px] text-text-muted">
          Connected to twitch.tv/{twitchChannel}
        </p>
      </div>
      {disabled && !canActivate ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-not-allowed">{swatch}</span>
            </TooltipTrigger>
            <TooltipContent>Complete setup first</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        swatch
      )}
    </div>
  );
}
