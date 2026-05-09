import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-[#1a0d09] hover:bg-accent-hover hover:-translate-y-px",
        twitch: "bg-twitch text-white hover:bg-twitch-hover hover:-translate-y-px",
        ghost:
          "bg-bg-elevated text-text border border-border hover:border-text-muted",
        danger:
          "bg-[#3a1414] text-[#ff8a8a] border border-[#5a2020] hover:bg-[#4a1818]",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-[15px]",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-12 px-6 text-[16px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
