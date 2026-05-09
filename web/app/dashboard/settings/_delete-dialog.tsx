"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function DeleteAccountDialog({ twitchLogin }: { twitchLogin: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  const matches = confirm.toLowerCase() === twitchLogin.toLowerCase();

  const onDelete = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_username: confirm }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Couldn't delete account.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger">Delete my Parrot account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your Parrot data — channel settings, knowledge base, and activity log.
            You'll need to sign up again to use Parrot.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>
            Type <span className="text-text">{twitchLogin}</span> to confirm
          </Label>
          <Input
            autoFocus
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={twitchLogin}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="danger"
            disabled={!matches || pending}
            onClick={onDelete}
          >
            {pending ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
