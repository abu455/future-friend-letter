"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RadarBlip = {
  id: string;
  title: string;
  companyName: string;
  region: string;
  industry: string;
  aiScore: number;
  demandStrength: number;
  grade: string;
  isDemo?: boolean;
};

function hashAngle(id: string) {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 360;
  return n;
}

export function MarketRadar({
  signals,
  onSelect,
  scanning,
}: {
  signals: RadarBlip[];
  onSelect: (id: string) => void;
  scanning?: boolean;
}) {
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState<RadarBlip | null>(null);
  const [pulseIds, setPulseIds] = useState<string[]>([]);

  useEffect(() => {
    if (signals.length === 0) return;
    const newest = signals.slice(0, 3).map((s) => s.id);
    setPulseIds(newest);
    const t = setTimeout(() => setPulseIds([]), 2400);
    return () => clearTimeout(t);
  }, [signals]);

  const points = useMemo(
    () =>
      signals.map((s) => {
        const angle = (hashAngle(s.id) * Math.PI) / 180;
        const dist = 0.18 + (1 - s.aiScore / 100) * 0.72;
        return {
          ...s,
          x: 50 + Math.cos(angle) * dist * 46,
          y: 50 + Math.sin(angle) * dist * 46,
          r: 3.2 + (s.demandStrength / 100) * 4.2,
        };
      }),
    [signals],
  );

  const color = (grade: string) =>
    grade === "high" ? "#38D996" : grade === "medium" ? "#2F9BFF" : "#86A3C3";

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <div className="text-sm font-medium">市场需求雷达</div>
          <div className="text-xs text-muted">高潜靠近中心 · 光点大小=需求强度</div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={() => setPlaying((v) => !v)} aria-label="播放或暂停">
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <Button variant="secondary" size="icon" onClick={() => setPulseIds(signals.map((s) => s.id))} aria-label="重新扫描动画">
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>
      <div className="relative mx-auto aspect-square w-full max-w-[520px] p-3">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3DDCFF" stopOpacity="0.18" />
              <stop offset="70%" stopColor="#1677FF" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#061426" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3DDCFF" stopOpacity="0" />
              <stop offset="55%" stopColor="#2F9BFF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3DDCFF" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#radarGlow)" />
          {[12, 24, 36, 46].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(61,220,255,0.18)" strokeWidth="0.35" />
          ))}
          <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(47,155,255,0.12)" strokeWidth="0.3" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="rgba(47,155,255,0.12)" strokeWidth="0.3" />
          {(playing && !reduce) || scanning ? (
            <motion.g
              style={{ originX: "50px", originY: "50px" }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: reduce ? 0 : 8, ease: "linear" }}
            >
              <path d="M50 50 L50 6 A44 44 0 0 1 86 28 Z" fill="url(#sweep)" />
              <line x1="50" y1="50" x2="50" y2="5" stroke="#3DDCFF" strokeWidth="0.45" />
            </motion.g>
          ) : (
            <path d="M50 50 L50 6 A44 44 0 0 1 72 12 Z" fill="url(#sweep)" opacity="0.4" />
          )}
          {points.map((p) => (
            <g key={p.id}>
              {pulseIds.includes(p.id) && !reduce ? (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill="none"
                  stroke={color(p.grade)}
                  strokeWidth="0.4"
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 3.2 }}
                  transition={{ duration: 1.6, repeat: 1 }}
                />
              ) : null}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={color(p.grade)}
                fillOpacity="0.9"
                className="cursor-pointer"
                onClick={() => onSelect(p.id)}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}
          <circle cx="50" cy="50" r="1.6" fill="#3DDCFF" />
        </svg>
        {hover ? (
          <div className="pointer-events-none absolute left-4 right-4 bottom-4 rounded-[14px] border border-cyan/25 bg-[#061426]/90 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{hover.companyName}</span>
              <Badge tone={hover.grade === "high" ? "success" : hover.grade === "medium" ? "blue" : "muted"}>
                {hover.aiScore}分
              </Badge>
            </div>
            <div className="mt-1 text-muted">
              {hover.region} · {hover.industry} · {hover.title}
            </div>
          </div>
        ) : (
          <div className="absolute left-4 bottom-4 text-[11px] text-muted">点击光点查看需求详情</div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 px-4 pb-4 text-[11px] text-muted">
        <span className={cn("flex items-center gap-1")}><i className="size-2 rounded-full bg-success inline-block" />高潜</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-primary-bright inline-block" />一般</span>
        <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-muted inline-block" />观察</span>
      </div>
    </Card>
  );
}
