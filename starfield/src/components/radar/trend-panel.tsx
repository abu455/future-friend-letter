"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";
import { Badge, Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/constants";

type Series = {
  industry: string;
  heat: number;
  change: number;
  direction: string;
  signalCount: number;
  points: { date: string; value: number }[];
};

export function TrendPanel({
  series,
  range,
  industry,
  onRange,
  onIndustry,
  onOpenIndustry,
}: {
  series: Series[];
  range: 7 | 30 | 90;
  industry?: string;
  onRange: (r: 7 | 30 | 90) => void;
  onIndustry: (v?: string) => void;
  onOpenIndustry: (industry: string) => void;
}) {
  const reduce = useReducedMotion();
  const current = series[0];
  const chartData = useMemo(() => {
    if (!current) return [];
    return current.points.map((p) => {
      const row: Record<string, string | number> = { date: p.date.slice(5) };
      for (const s of series) {
        const hit = s.points.find((x) => x.date === p.date);
        row[s.industry] = hit?.value ?? 0;
      }
      return row;
    });
  }, [series, current]);

  const colors = ["#3DDCFF", "#2F9BFF", "#38D996", "#FFB547", "#1677FF", "#86A3C3"];

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">市场浮动需求</div>
            <div className="text-xs text-muted">热度随时间变化 · 演示序列</div>
          </div>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "primary" : "secondary"}
                onClick={() => onRange(r)}
              >
                {r}天
              </Button>
            ))}
          </div>
        </div>
        {current ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="当前热度" value={String(current.heat)} />
            <Metric
              label="环比变化"
              value={`${current.change > 0 ? "+" : ""}${current.change}%`}
              tone={current.change >= 0 ? "success" : "danger"}
            />
            <Metric label="信号数量" value={String(current.signalCount)} />
            <Metric
              label="趋势方向"
              value={current.direction === "up" ? "上升" : current.direction === "down" ? "下降" : "波动"}
            />
          </div>
        ) : null}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant={!industry ? "cyan" : "secondary"} onClick={() => onIndustry(undefined)}>
            全部行业
          </Button>
          {INDUSTRIES.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={industry === name ? "cyan" : "secondary"}
              onClick={() => onIndustry(name)}
            >
              {name}
            </Button>
          ))}
        </div>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid stroke="rgba(47,155,255,0.08)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#86A3C3", fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: "#86A3C3", fontSize: 11 }} axisLine={false} width={28} />
              <Tooltip
                contentStyle={{
                  background: "#0B1F36",
                  border: "1px solid rgba(61,220,255,0.2)",
                  borderRadius: 12,
                }}
              />
              {series.map((s, i) => (
                <Area
                  key={s.industry}
                  type="monotone"
                  dataKey={s.industry}
                  stroke={colors[i % colors.length]}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={!reduce}
                  onClick={() => onOpenIndustry(s.industry)}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {series.map((s, i) => (
            <button key={s.industry} onClick={() => onOpenIndustry(s.industry)}>
              <Badge tone="muted" className="hover:border-cyan/40">
                <span
                  className="mr-1 inline-block size-2 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                {s.industry}
              </Badge>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[12px] bg-white/4 px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`tabular text-lg ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : ""}`}>
        {value}
      </div>
    </div>
  );
}
