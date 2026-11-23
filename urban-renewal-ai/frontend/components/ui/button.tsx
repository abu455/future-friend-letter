import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition",
        "focus:outline-none focus:ring-2 focus:ring-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-gradient-to-r from-cyan-400 to-violet-500 text-white shadow-glow hover:scale-[1.02]",
        variant === "ghost" && "bg-white/5 text-slate-100 hover:bg-white/10",
        variant === "outline" && "border border-white/15 bg-transparent text-slate-100 hover:bg-white/10",
        className
      )}
      {...props}
    />
  );
}
