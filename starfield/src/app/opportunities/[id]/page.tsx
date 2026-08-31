"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Skeleton } from "@/components/ui/card";
import { api } from "@/lib/client";
import { STAGE_LABEL, STAGES } from "@/lib/constants";
import { formatMoney, formatDateTime } from "@/lib/utils";

type Detail = {
  id: string;
  name: string;
  score: number;
  amount: number;
  probability: number;
  stage: string;
  nextAction?: string | null;
  isDemo: boolean;
  company: { name: string; industry: string; region: string; summary: string; contacts: { id: string; fullName: string; title: string }[] };
  contact?: { fullName: string; title: string } | null;
  activities: { id: string; title: string; detail?: string | null; createdAt: string }[];
  stageHistory: { id: string; fromStage?: string | null; toStage: string; note?: string | null; createdAt: string }[];
  tasks: { id: string; title: string; status: string; dueAt: string }[];
};

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api<Detail>(`/api/opportunities/${id}`);
    if (!res.ok) toast.error(res.error.message);
    else setData(res.data);
  }

  useEffect(() => {
    load();
     
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    const res = await api(`/api/opportunities/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (!res.ok) return toast.error(res.error.message);
    toast.success("机会已更新");
    load();
  }

  async function runAgent() {
    setBusy(true);
    const res = await api(`/api/opportunities/${id}/agent`, { method: "POST", body: JSON.stringify({ type: "full" }) });
    setBusy(false);
    if (!res.ok) return toast.error(res.error.message);
    toast.success("成交智能体已完成分析并更新概率");
    router.push(`/agent?opportunityId=${id}`);
  }

  if (!data) return <Skeleton className="h-64" />;

  return (
    <div>
      <PageHeader
        title={data.name}
        subtitle={`${data.company.name} · ${data.company.region} · ${data.company.industry}`}
        extra={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/opportunities")}>返回看板</Button>
            <Button loading={busy} onClick={runAgent}>启动成交智能体</Button>
          </div>
        }
      />
      {data.isDemo ? <p className="mb-3 text-xs text-warning">该机会来自演示数据。</p> : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="评分" value={`${data.score}`} />
        <Stat label="金额" value={formatMoney(data.amount)} />
        <Stat label="成交概率" value={`${data.probability}%`} />
        <Stat label="阶段" value={STAGE_LABEL[data.stage]} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="space-y-3">
            <div className="text-sm font-medium">推进阶段</div>
            <select
              className="min-h-11 w-full rounded-[14px] border border-white/10 bg-white/5 px-3"
              value={data.stage}
              onChange={(e) => patch({ stage: e.target.value })}
            >
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <div className="text-sm font-medium">更新成交概率</div>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={data.probability}
              onMouseUp={(e) => patch({ probability: Number((e.target as HTMLInputElement).value) })}
              onTouchEnd={(e) => patch({ probability: Number((e.target as HTMLInputElement).value) })}
              className="w-full"
            />
            <p className="text-sm text-muted">下一步：{data.nextAction ?? "尚未设置"}</p>
            <p className="text-sm text-muted">{data.company.summary}</p>
            <div>
              <div className="text-sm font-medium mb-2">决策人</div>
              {data.company.contacts.length === 0 ? (
                <EmptyState title="还没有联系人" hint="去 Apollo / 演示搜索补齐决策链。" action={<Button onClick={() => router.push("/search")}>去搜索</Button>} />
              ) : (
                data.company.contacts.map((c) => (
                  <button
                    key={c.id}
                    className="mr-2 mb-2 min-h-11 rounded-[12px] bg-white/5 px-3 text-sm"
                    onClick={() => patch({ contactId: c.id })}
                  >
                    {c.fullName} · {c.title}
                    {data.contact?.fullName === c.fullName ? <Badge className="ml-2">当前</Badge> : null}
                  </button>
                ))
              )}
            </div>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-2">阶段历史</div>
              {data.stageHistory.map((h) => (
                <div key={h.id} className="mb-2 text-xs text-muted">
                  {formatDateTime(h.createdAt)} · {h.note || `${h.fromStage ?? "—"} → ${h.toStage}`}
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-sm font-medium mb-2">最近活动</div>
              {data.activities.map((a) => (
                <div key={a.id} className="mb-2 text-xs">
                  <div>{a.title}</div>
                  <div className="text-muted">{a.detail}</div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs text-muted">{label}</div>
        <div className="mt-1 font-mono text-xl">{value}</div>
      </CardBody>
    </Card>
  );
}
