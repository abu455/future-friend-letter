"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, EmptyState, Input } from "@/components/ui/card";
import { MarketRadar } from "@/components/radar/market-radar";
import { TrendPanel } from "@/components/radar/trend-panel";
import { Sheet } from "@/components/ui/overlay";
import { SignalActions } from "@/components/signals/signal-actions";
import { api } from "@/lib/client";
import { INDUSTRIES, SIGNAL_GRADES } from "@/lib/constants";

type Signal = {
  id: string;
  title: string;
  companyName: string;
  region: string;
  industry: string;
  aiScore: number;
  demandStrength: number;
  grade: string;
  summary: string;
  source: string;
  isDemo: boolean;
};

export default function RadarPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [industry, setIndustry] = useState(params.get("industry") ?? "");
  const [region, setRegion] = useState("");
  const [grade, setGrade] = useState("");
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [trendRange, setTrendRange] = useState<7 | 30 | 90>(30);
  const [trendIndustry, setTrendIndustry] = useState<string | undefined>();
  const [series, setSeries] = useState<
    {
      industry: string;
      heat: number;
      change: number;
      direction: string;
      signalCount: number;
      points: { date: string; value: number }[];
    }[]
  >([]);
  const [active, setActive] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (industry) qs.set("industry", industry);
    if (region) qs.set("region", region);
    if (grade) qs.set("grade", grade);
    qs.set("range", range);
    const res = await api<Signal[]>(`/api/signals?${qs.toString()}`);
    setLoading(false);
    if (!res.ok) toast.error(res.error.message);
    else setSignals(res.data);
  }

  async function loadTrend() {
    const qs = new URLSearchParams({ range: String(trendRange) });
    if (trendIndustry) qs.set("industry", trendIndustry);
    const res = await api<{ series: [] }>(`/api/trends?${qs.toString()}`);
    if (res.ok) setSeries(res.data.series);
  }

  useEffect(() => {
    load();
     
  }, [industry, region, grade, range]);

  useEffect(() => {
    loadTrend();
     
  }, [trendRange, trendIndustry]);

  const filtered = useMemo(() => signals, [signals]);

  return (
    <div>
      <PageHeader
        title="市场需求雷达"
        subtitle="光点越靠近中心，机会评分越高。扫描扇区持续旋转，新信号带脉冲。"
        extra={
          <Button onClick={() => router.push("/scan")}>开始扫描</Button>
        }
      />
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <select
            className="min-h-11 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">全部行业</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <Input placeholder="地区" value={region} onChange={(e) => setRegion(e.target.value)} className="sm:max-w-40" />
          <select
            className="min-h-11 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option value="">全部等级</option>
            {SIGNAL_GRADES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            className="min-h-11 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value as "7" | "30" | "90")}
          >
            <option value="7">近 7 天</option>
            <option value="30">近 30 天</option>
            <option value="90">近 90 天</option>
          </select>
        </CardBody>
      </Card>
      {loading ? (
        <p className="text-sm text-muted">正在加载雷达信号…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="当前筛选下没有信号"
          hint="放宽地区或行业，或重新发起一次市场扫描。"
          action={<Button onClick={() => router.push("/scan")}>去扫描</Button>}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <MarketRadar
            signals={filtered}
            onSelect={(id) => setActive(filtered.find((s) => s.id === id) ?? null)}
          />
          <TrendPanel
            series={series}
            range={trendRange}
            industry={trendIndustry}
            onRange={setTrendRange}
            onIndustry={setTrendIndustry}
            onOpenIndustry={(name) => {
              setIndustry(name);
              toast.message(`已筛选行业：${name}`);
            }}
          />
        </div>
      )}
      <Sheet open={Boolean(active)} onOpenChange={(v) => !v && setActive(null)} title={active?.title ?? "信号"}>
        {active ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted">{active.summary}</p>
            <p>
              {active.companyName} · {active.region} · 评分 {active.aiScore}
            </p>
            <SignalActions signal={active} onDone={() => setActive(null)} />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
