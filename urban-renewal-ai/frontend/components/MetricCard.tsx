import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: number | string;
  suffix?: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ label, value, suffix = "", detail, icon: Icon }: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-cyan-400/10" />
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
        <Icon size={20} />
      </div>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{typeof value === "number" ? formatNumber(value) : value}{suffix}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </Card>
  );
}
