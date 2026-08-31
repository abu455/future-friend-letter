"use client";

import { ArrowDownRight, ArrowUpRight, Radio } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { TREND_SERIES } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const industries = [
  { key: "automotive", label: "汽车内饰", color: "#3DDCFF", change: 18.6, signals: 42 },
  { key: "cutting", label: "柔性材料裁切", color: "#1677FF", change: 21.2, signals: 38 },
  { key: "automation", label: "工业自动化", color: "#38D996", change: 12.8, signals: 51 },
  { key: "packaging", label: "包装设备", color: "#FFB547", change: -2.4, signals: 24 },
] as const;

type Range = keyof typeof TREND_SERIES;
type IndustryKey = (typeof industries)[number]["key"];

export function MarketTrend({
  onExplore,
}: {
  onExplore?: (industry: string) => void;
}) {
  const [range, setRange] = useState<Range>("7d");
  const [industry, setIndustry] = useState<IndustryKey>("automotive");
  const active = industries.find((item) => item.key === industry)!;
  const data = useMemo(
    () =>
      TREND_SERIES[range].map((point) => ({
        label: point.label,
        value: point[industry],
      })),
    [range, industry],
  );
  const current = data.at(-1)?.value ?? 0;

  return (
    <div className="flex h-full min-h-[360px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#3DDCFF]">
            <Radio className="size-3.5" />
            市场浮动需求
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold tracking-tight">{current}</span>
            <span className="mb-1 text-xs text-[#86A3C3]">热度指数</span>
          </div>
        </div>
        <div className="flex rounded-xl border border-white/[0.07] bg-[#061426]/60 p-1">
          {(["7d", "30d", "90d"] as Range[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setRange(item)}
              className={cn(
                "min-h-9 rounded-lg px-3 text-xs font-medium transition",
                range === item
                  ? "bg-[#1677FF] text-white shadow-[0_0_16px_rgba(22,119,255,.24)]"
                  : "text-[#86A3C3] hover:bg-white/5 hover:text-white",
              )}
            >
              {item === "7d" ? "7天" : item === "30d" ? "30天" : "90天"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {industries.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setIndustry(item.key)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3 text-xs transition",
              industry === item.key
                ? "border-[#3DDCFF]/25 bg-[#3DDCFF]/10 text-[#B9F4FF]"
                : "border-white/[0.07] text-[#86A3C3] hover:border-white/15",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="mt-4 min-h-0 flex-1 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => onExplore?.(active.label)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onExplore?.(active.label);
        }}
        aria-label={`查看${active.label}需求信号`}
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={active.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={active.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(134,163,195,.09)"
              strokeDasharray="3 4"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6E8BAA", fontSize: 10 }}
              dy={8}
            />
            <YAxis
              domain={[20, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6E8BAA", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "#0B1F36",
                border: "1px solid rgba(61,220,255,.18)",
                borderRadius: 12,
                color: "#F2F7FF",
                fontSize: 12,
              }}
              formatter={(value) => [`${value}`, "市场热度"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={active.color}
              strokeWidth={2.5}
              fill="url(#trendFill)"
              strokeDasharray="7 2"
              className="market-flow"
              activeDot={{ r: 5, fill: active.color, stroke: "#061426", strokeWidth: 2 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <p className="text-[10px] text-[#6E8BAA]">环比变化</p>
          <p
            className={cn(
              "mt-1 flex items-center text-sm font-semibold",
              active.change > 0 ? "text-[#38D996]" : "text-[#FF647C]",
            )}
          >
            {active.change > 0 ? (
              <ArrowUpRight className="mr-1 size-3.5" />
            ) : (
              <ArrowDownRight className="mr-1 size-3.5" />
            )}
            {Math.abs(active.change)}%
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <p className="text-[10px] text-[#6E8BAA]">需求信号</p>
          <p className="mt-1 text-sm font-semibold text-white">{active.signals}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <p className="text-[10px] text-[#6E8BAA]">趋势方向</p>
          <p className="mt-1 text-sm font-semibold text-[#8CCBFF]">
            {active.change > 0 ? "持续上升" : "短期回落"}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-2 h-10 text-xs text-[#72C8FF]"
        onClick={() => onExplore?.(active.label)}
      >
        查看对应需求信号 →
      </Button>
    </div>
  );
}
