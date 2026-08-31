"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, DemoTag } from "@/components/layout/app-shell";
import { Badge, Card, CardBody, EmptyState, Skeleton } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarketRadar, type RadarBlip } from "@/components/radar/market-radar";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/constants";

type Dash = {
  stats: {
    todaySignals: number;
    highPotential: number;
    apolloTargets: number;
    pipelineAmount: number;
    avgProb: number;
    openTasks: number;
  };
  ranking: { id: string; name: string; score: number; amount: number; stage: string; companyName?: string }[];
  recentSignals: RadarBlip[];
  riskOpps: { id: string; name: string; riskTags: string[]; companyName?: string }[];
  aiTasks: { id: string; title: string; opportunityName?: string }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  async function load() {
    const res = await api<Dash>("/api/dashboard");
    if (!res.ok) setError(res.error.message);
    else setData(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function startScan() {
    setScanning(true);
    const res = await api("/api/radar/scan", {
      method: "POST",
      body: JSON.stringify({
        query:
          "寻找德国100—500人的汽车内饰工厂，重点寻找采购总监、生产总监或工厂负责人，客户可能有柔性材料裁切自动化升级需求。",
      }),
    });
    setScanning(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    toast.success("已启动市场扫描");
    router.push("/scan?running=1");
  }

  if (error) {
    return (
      <EmptyState
        title="工作台加载失败"
        hint={error}
        action={<Button onClick={load}>重试</Button>}
      />
    );
  }
  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "今日新增需求", value: data.stats.todaySignals, href: "/signals?range=7" },
    { label: "高潜机会", value: data.stats.highPotential, href: "/opportunities?grade=high" },
    { label: "Apollo 目标客户", value: data.stats.apolloTargets, href: "/search" },
    { label: "预计机会金额", value: formatMoney(data.stats.pipelineAmount), href: "/opportunities" },
    { label: "平均成交概率", value: `${data.stats.avgProb}%`, href: "/opportunities" },
    { label: "待处理行动", value: data.stats.openTasks, href: "/actions" },
  ];

  return (
    <div>
      <PageHeader
        title="总览工作台"
        subtitle="需求雷达与成交智能体共用同一套企业、联系人、机会和跟进。"
        extra={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/scan")}>
              快速创建需求
            </Button>
            <Button loading={scanning} onClick={startScan}>
              启动扫描
            </Button>
          </div>
        }
      />
      <div className="mb-4 text-xs text-warning">
        当前为演示模式，所有 Seed 记录均带「演示数据」标记，未伪装成实时抓取。
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} interactive onClick={() => router.push(c.href)}>
            <CardBody>
              <div className="text-xs text-muted">{c.label}</div>
              <div className="mt-2 font-mono text-2xl tabular">{c.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <MarketRadar
          signals={data.recentSignals}
          scanning={scanning}
          onSelect={(id) => router.push(`/signals?focus=${id}`)}
        />
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="mb-3 text-sm font-medium">高潜机会排行</div>
              {data.ranking.length === 0 ? (
                <EmptyState
                  title="还没有高潜机会"
                  hint="从雷达或信号中心把匹配客户加入机会池。"
                  action={<Button onClick={() => router.push("/signals")}>去信号中心</Button>}
                />
              ) : (
                <div className="space-y-2">
                  {data.ranking.map((o) => (
                    <button
                      key={o.id}
                      className="flex min-h-11 w-full items-center justify-between rounded-[12px] bg-white/4 px-3 text-left hover:bg-white/8"
                      onClick={() => router.push(`/opportunities/${o.id}`)}
                    >
                      <div>
                        <div className="text-sm">
                          {o.name}
                          <DemoTag />
                        </div>
                        <div className="text-xs text-muted">
                          {o.companyName} · {STAGE_LABEL[o.stage]}
                        </div>
                      </div>
                      <Badge tone="success">{o.score}分</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="mb-3 text-sm font-medium">今日 AI 建议</div>
              {data.aiTasks.map((t) => (
                <button
                  key={t.id}
                  className="mb-2 block w-full rounded-[12px] bg-white/4 px-3 py-2 text-left text-sm hover:bg-white/8"
                  onClick={() => router.push("/actions")}
                >
                  {t.title}
                  <div className="text-xs text-muted">{t.opportunityName}</div>
                </button>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="mb-3 text-sm font-medium">风险机会提醒</div>
              {data.riskOpps.length === 0 ? (
                <p className="text-sm text-muted">暂无风险标签。继续保持跟进节奏。</p>
              ) : (
                data.riskOpps.map((o) => (
                  <button
                    key={o.id}
                    className="mb-2 flex min-h-11 w-full items-center justify-between rounded-[12px] bg-danger/8 px-3 text-left hover:bg-danger/14"
                    onClick={() => router.push(`/opportunities/${o.id}`)}
                  >
                    <span className="text-sm">{o.name}</span>
                    <Badge tone="danger">{o.riskTags[0]}</Badge>
                  </button>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
