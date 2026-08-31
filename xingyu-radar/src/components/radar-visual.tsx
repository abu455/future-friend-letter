"use client";

import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MarketSignal } from "@/lib/domain";
import { cn } from "@/lib/utils";

type RadarVisualProps = {
  signals: MarketSignal[];
  selectedId?: string;
  onSelect: (signal: MarketSignal) => void;
  onRescan?: () => void;
  compact?: boolean;
};

const levelColor = {
  HIGH: "#38D996",
  MEDIUM: "#3DDCFF",
  LOW: "#FFB547",
};

export function RadarVisual({
  signals,
  selectedId,
  onSelect,
  onRescan,
  compact = false,
}: RadarVisualProps) {
  const [running, setRunning] = useState(true);
  const [scanKey, setScanKey] = useState(0);
  const rawId = useId();
  const id = rawId.replace(/:/g, "");

  function restart() {
    setScanKey((value) => value + 1);
    setRunning(true);
    onRescan?.();
  }

  return (
    <div className="flex h-full flex-col" data-testid="market-radar">
      <div className="relative mx-auto aspect-square w-full max-w-[520px]">
        <div className="pointer-events-none absolute inset-[13%] rounded-full bg-[#1677ff]/10 blur-3xl" />
        <svg
          key={scanKey}
          viewBox="0 0 100 100"
          className="relative h-full w-full overflow-visible"
          role="img"
          aria-label={`市场需求雷达，显示 ${signals.length} 条信号`}
        >
          <defs>
            <radialGradient id={`radar-bg-${id}`}>
              <stop offset="0%" stopColor="#1677FF" stopOpacity=".17" />
              <stop offset="72%" stopColor="#061426" stopOpacity=".08" />
              <stop offset="100%" stopColor="#061426" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`sweep-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3DDCFF" stopOpacity="0" />
              <stop offset="75%" stopColor="#2F9BFF" stopOpacity=".04" />
              <stop offset="100%" stopColor="#3DDCFF" stopOpacity=".72" />
            </linearGradient>
            <filter id={`glow-${id}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="50" cy="50" r="46" fill={`url(#radar-bg-${id})`} />
          {[11.5, 23, 34.5, 46].map((radius, index) => (
            <circle
              key={radius}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#5EA8E8"
              strokeOpacity={index === 3 ? ".24" : ".16"}
              strokeWidth=".35"
              strokeDasharray={index % 2 ? "1.5 2" : undefined}
            />
          ))}
          <g stroke="#5EA8E8" strokeOpacity=".11" strokeWidth=".3">
            <line x1="4" y1="50" x2="96" y2="50" />
            <line x1="50" y1="4" x2="50" y2="96" />
            <line x1="17.5" y1="17.5" x2="82.5" y2="82.5" />
            <line x1="82.5" y1="17.5" x2="17.5" y2="82.5" />
          </g>

          <g className={cn("radar-sweep", !running && "paused")}>
            <path
              d="M50 50 L50 4 A46 46 0 0 1 82.5 17.5 Z"
              fill={`url(#sweep-${id})`}
            />
            <line
              x1="50"
              y1="50"
              x2="82.5"
              y2="17.5"
              stroke="#63E7FF"
              strokeWidth=".65"
              strokeOpacity=".9"
              filter={`url(#glow-${id})`}
            />
          </g>

          <circle
            cx="50"
            cy="50"
            r="2.2"
            fill="#3DDCFF"
            fillOpacity=".9"
            filter={`url(#glow-${id})`}
          />

          {signals.map((signal, index) => {
            const color = levelColor[signal.level];
            const active = selectedId === signal.id;
            const radius = 0.8 + signal.intensity / 85;
            return (
              <g
                key={signal.id}
                role="button"
                tabIndex={0}
                aria-label={`${signal.companyName}，${signal.title}，评分 ${signal.score}`}
                className="cursor-pointer outline-none"
                onClick={() => onSelect(signal)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(signal);
                  }
                }}
              >
                <title>
                  {signal.companyName} · {signal.region} · {signal.title} ·{" "}
                  {signal.score}分
                </title>
                <circle
                  cx={signal.x}
                  cy={signal.y}
                  r={radius * 2.4}
                  fill={color}
                  fillOpacity={active ? ".22" : ".08"}
                  className="radar-dot"
                  style={{ animationDelay: `${index * 170}ms` }}
                />
                <circle
                  cx={signal.x}
                  cy={signal.y}
                  r={active ? radius * 1.25 : radius}
                  fill={color}
                  stroke={active ? "#F2F7FF" : color}
                  strokeWidth={active ? ".55" : ".2"}
                  filter={`url(#glow-${id})`}
                />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-5 text-center">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#3DDCFF]/70">
            LIVE SIGNALS
          </p>
          <p className="mt-1 text-xs font-semibold text-white">
            {signals.length} 个需求信号
          </p>
        </div>
      </div>

      {!compact && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#86A3C3]">
            <span className="flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#38D996]" /> 高潜
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#3DDCFF]" /> 中潜
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2 rounded-full bg-[#FFB547]" /> 一般
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 border-white/10 bg-white/[0.03]"
              onClick={() => setRunning((value) => !value)}
            >
              {running ? <Pause /> : <Play />}
              {running ? "暂停" : "继续"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 border-[#2F9BFF]/25 bg-[#1677FF]/10 text-[#8CCBFF]"
              onClick={restart}
            >
              <RotateCcw />
              重新扫描
            </Button>
          </div>
        </motion.div>
      )}

      {compact && (
        <button
          type="button"
          onClick={restart}
          className="mx-auto mt-1 flex min-h-10 items-center gap-2 text-xs text-[#72C8FF] transition hover:text-white"
        >
          <Sparkles className="size-3.5" />
          雷达持续发现新信号
        </button>
      )}
    </div>
  );
}
