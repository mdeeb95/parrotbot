import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-border bg-bg px-3 py-2 text-[14px] text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1.5 block text-[13px] font-medium text-text", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";
