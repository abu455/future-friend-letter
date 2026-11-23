"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-medium transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] min-h-11 px-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-[0_0_18px_rgba(22,119,255,0.28)] hover:bg-primary-bright",
        secondary:
          "bg-white/5 text-foreground border border-white/10 hover:border-cyan/40 hover:bg-white/8",
        ghost: "bg-transparent text-muted hover:text-foreground hover:bg-white/5",
        danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
        success: "bg-success/15 text-success border border-success/30 hover:bg-success/25",
        cyan: "bg-cyan/15 text-cyan border border-cyan/30 hover:bg-cyan/25",
      },
      size: {
        md: "min-h-11 text-sm",
        sm: "min-h-11 px-3 text-xs",
        lg: "min-h-12 px-5 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  loading,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Comp>
  );
}

export { buttonVariants };
