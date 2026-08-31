"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, DemoTag } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Input, Skeleton } from "@/components/ui/card";
import { BottomDrawer } from "@/components/ui/overlay";
import { SignalActions } from "@/components/signals/signal-actions";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import { INDUSTRIES } from "@/lib/constants";

type Signal = {
  id: string;
  title: string;
  source: string;
  industry: string;
  region: string;
  companyName: string;
  summary: string;
  publishedAt: string;
  keywords: string[];
  demandStrength: number;
  urgency: number;
  credibility: number;
  aiScore: number;
  recommendedAction: string;
  isDemo: boolean;
  status: string;
  sourceUrl?: string | null;
};

export default function SignalsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState<Signal[]>([]);
  const [view, setView] = useState<"card" | "list">("card");
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [sort, setSort] = useState("score");
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (industry) qs.set("industry", industry);
    if (sort) qs.set("sort", sort);
    if (params.get("range")) qs.set("range", params.get("range")!);
    if (params.get("focus")) qs.set("ids", params.get("focus")!);
    const res = await api<Signal[]>(`/api/signals?${qs.toString()}`);
    setLoading(false);
    if (!res.ok) toast.error(res.error.message);
    else setRows(res.data);
  }

  useEffect(() => {
    load();
     
  }, [industry, sort]);

  const visible = useMemo(() => rows.filter((r) => r.status !== "ignored"), [rows]);

  async function batchConvert() {
    if (selected.length === 0) return toast.error("请先勾选信号");
    for (const id of selected) {
      await api(`/api/signals/${id}/opportunity`, { method: "POST", body: "{}" });
    }
    toast.success(`已将 ${selected.length} 条转入机会池`);
    setSelected([]);
    router.push("/opportunities");
  }

  return (
    <div>
      <PageHeader
        title="市场信号中心"
        subtitle="卡片 / 列表双视图。搜索、筛选、批量转入机会池都是真实写入。"
        extra={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setView(view === "card" ? "list" : "card")}>
              {view === "card" ? "列表视图" : "卡片视图"}
            </Button>
            <Button className="lg:hidden" variant="secondary" onClick={() => setFiltersOpen(true)}>
              筛选
            </Button>
          </div>
        }
      />
      <div className="mb-4 hidden gap-2 lg:flex">
        <Input placeholder="搜索标题 / 企业" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <select className="min-h-11 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm" value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">行业</option>
          {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
        </select>
        <select className="min-h-11 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="score">按评分</option>
          <option value="time">按时间</option>
          <option value="strength">按强度</option>
          <option value="urgency">按紧迫度</option>
        </select>
        <Button variant="secondary" onClick={load}>搜索</Button>
        <Button onClick={batchConvert}>批量加入机会池</Button>
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState title="没有信号" hint="先做一次市场扫描，或放宽筛选条件。" action={<Button onClick={() => router.push("/scan")}>去扫描</Button>} />
      ) : view === "card" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((s) => (
            <Card key={s.id}>
              <CardBody className="space-y-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={selected.includes(s.id)}
                    onChange={(e) =>
                      setSelected((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                    }
                  />
                  <div>
                    <div className="font-medium">
                      {s.title}
                      {s.isDemo ? <DemoTag /> : null}
                    </div>
                    <div className="text-xs text-muted">
                      {s.source} · {s.industry} · {s.region} · {s.companyName} · {formatDateTime(s.publishedAt)}
                    </div>
                  </div>
                </label>
                <p className="text-sm text-muted">{s.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {s.keywords.map((k) => (
                    <Badge key={k} tone="muted">{k}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <Score n={s.demandStrength} l="强度" />
                  <Score n={s.urgency} l="紧迫" />
                  <Score n={s.credibility} l="可信" />
                  <Score n={s.aiScore} l="AI分" />
                </div>
                <p className="text-xs text-cyan">推荐：{s.recommendedAction}</p>
                <SignalActions signal={s} onDone={load} />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((s) => (
            <Card key={s.id}>
              <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium">{s.title}{s.isDemo ? <DemoTag /> : null}</div>
                  <div className="text-xs text-muted">{s.companyName} · {s.aiScore}分 · {s.region}</div>
                </div>
                <Button size="sm" onClick={() => router.push(`/radar?industry=${encodeURIComponent(s.industry)}`)}>看雷达</Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <BottomDrawer open={filtersOpen} onOpenChange={setFiltersOpen} title="筛选信号">
        <Input placeholder="关键词" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button className="mt-3 w-full" onClick={() => { setFiltersOpen(false); load(); }}>应用</Button>
      </BottomDrawer>
    </div>
  );
}

function Score({ n, l }: { n: number; l: string }) {
  return (
    <div className="rounded-[12px] bg-white/4 py-2">
      <div className="font-mono">{n}</div>
      <div className="text-muted">{l}</div>
    </div>
  );
}
