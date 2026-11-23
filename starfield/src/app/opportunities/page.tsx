"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, DemoTag } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Input } from "@/components/ui/card";
import { api } from "@/lib/client";
import { STAGES, STAGE_LABEL } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";

type Opp = {
  id: string;
  name: string;
  companyName?: string;
  contactName?: string;
  source: string;
  industry: string;
  score: number;
  amount: number;
  probability: number;
  stage: string;
  nextAction?: string | null;
  expectedClose?: string | null;
  lastActivityAt?: string | null;
  riskTags: string[];
  isDemo: boolean;
};

export default function OpportunitiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Opp[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");

  async function load() {
    const res = await api<Opp[]>(`/api/opportunities${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (!res.ok) toast.error(res.error.message);
    else setRows(res.data);
  }

  useEffect(() => {
    load();
     
  }, []);

  async function move(id: string, stage: string) {
    const res = await api(`/api/opportunities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(`阶段已更新为「${STAGE_LABEL[stage]}」`);
    load();
  }

  const grouped = useMemo(() => {
    const map: Record<string, Opp[]> = {};
    for (const s of STAGES) map[s.id] = [];
    for (const o of rows) (map[o.stage] ?? (map[o.stage] = [])).push(o);
    return map;
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="机会池"
        subtitle="看板拖动会真实改阶段并写入阶段历史。列表模式适合手机。"
        extra={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setView(view === "kanban" ? "list" : "kanban")}>
              {view === "kanban" ? "列表模式" : "看板模式"}
            </Button>
            <Button onClick={() => router.push("/scan")}>从扫描创建</Button>
          </div>
        }
      />
      <div className="mb-3 flex gap-2">
        <Input placeholder="搜索机会" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <Button variant="secondary" onClick={load}>搜索</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="机会池是空的" hint="从信号中心加入，或搜索决策人后转化。" action={<Button onClick={() => router.push("/signals")}>去信号中心</Button>} />
      ) : view === "list" ? (
        <div className="space-y-2">
          {rows.map((o) => (
            <Card key={o.id} interactive onClick={() => router.push(`/opportunities/${o.id}`)}>
              <CardBody>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{o.name}{o.isDemo ? <DemoTag /> : null}</div>
                    <div className="text-xs text-muted">
                      {o.companyName} · {o.contactName ?? "未绑定联系人"} · {STAGE_LABEL[o.stage]}
                    </div>
                  </div>
                  <Badge>{o.score}分 · {o.probability}%</Badge>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div
              key={stage.id}
              className="w-[260px] shrink-0 rounded-[16px] border border-white/10 bg-[#07182c] p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/opp-id");
                if (id) move(id, stage.id);
              }}
            >
              <div className="flex items-center justify-between px-2 py-2 text-xs">
                <span style={{ color: stage.color }}>{stage.label}</span>
                <span className="text-muted">{grouped[stage.id]?.length ?? 0}</span>
              </div>
              <div className="space-y-2">
                {(grouped[stage.id] ?? []).map((o) => (
                  <article
                    key={o.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/opp-id", o.id)}
                    className="rounded-[14px] border border-white/10 bg-card p-3"
                  >
                    <button className="text-left w-full" onClick={() => router.push(`/opportunities/${o.id}`)}>
                      <div className="text-sm font-medium">{o.name}{o.isDemo ? <DemoTag /> : null}</div>
                      <div className="mt-1 text-xs text-muted">{o.companyName}</div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span>{formatMoney(o.amount)}</span>
                        <span className="text-cyan">{o.probability}%</span>
                      </div>
                      {o.riskTags[0] ? <Badge tone="danger" className="mt-2">{o.riskTags[0]}</Badge> : null}
                    </button>
                    <select
                      className="mt-2 min-h-11 w-full rounded-[12px] border border-white/10 bg-white/5 text-xs"
                      value={o.stage}
                      onChange={(e) => move(o.id, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
