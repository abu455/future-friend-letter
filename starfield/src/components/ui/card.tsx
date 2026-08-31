import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[16px] bg-card border border-white/10 glow-line",
        interactive &&
          "cursor-pointer transition-all hover:border-cyan/35 hover:-translate-y-0.5 active:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function Badge({
  className,
  tone = "blue",
  ...props
}: React.ComponentProps<"span"> & { tone?: "blue" | "cyan" | "success" | "warning" | "danger" | "muted" }) {
  const tones = {
    blue: "bg-primary/15 text-primary-bright border-primary/25",
    cyan: "bg-cyan/12 text-cyan border-cyan/25",
    success: "bg-success/12 text-success border-success/25",
    warning: "bg-warning/12 text-warning border-warning/25",
    danger: "bg-danger/12 text-danger border-danger/25",
    muted: "bg-white/5 text-muted border-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex min-h-11 w-full rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20 disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-[14px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-foreground placeholder:text-muted/70 outline-none transition focus:border-cyan/50 focus:ring-2 focus:ring-cyan/20 disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-xs text-muted mb-1.5 block", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[12px] bg-white/8", className)} />;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-white/12 bg-card/60 px-6 py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {hint ? <p className="text-sm text-muted max-w-sm">{hint}</p> : null}
      {action}
    </div>
  );
}
