"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/overlay";
import { api } from "@/lib/client";
import { TASK_CATEGORIES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  category: string;
  dueAt: string;
  status: string;
  opportunityId?: string | null;
  opportunityName?: string;
  companyName?: string;
  recommended: boolean;
  aiGenerated: boolean;
};

export default function ActionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Task[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [cat, setCat] = useState("all");
  const [confirmBatch, setConfirmBatch] = useState(false);

  async function load() {
    const res = await api<Task[]>("/api/tasks");
    if (!res.ok) toast.error(res.error.message);
    else setRows(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((t) => (cat === "all" ? true : t.category === cat) && t.status !== "done"),
    [rows, cat],
  );

  async function complete(id: string) {
    const res = await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) });
    if (!res.ok) return toast.error(res.error.message);
    toast.success("任务已完成");
    load();
  }

  async function snooze(id: string) {
    const due = new Date(Date.now() + 2 * 86400000).toISOString();
    const res = await api(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "snoozed", dueAt: due }),
    });
    if (!res.ok) return toast.error(res.error.message);
    toast.success("已延期 2 天");
    load();
  }

  async function batch() {
    const res = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ ids: selected, action: "complete" }),
    });
    setConfirmBatch(false);
    if (!res.ok) return toast.error(res.error.message);
    toast.success("批量完成");
    setSelected([]);
    load();
  }

  return (
    <div>
      <PageHeader
        title="行动中心"
        subtitle="今日跟进、超时、等待回复/报价/样品/会议、高风险与 AI 推荐都在这里处理。"
        extra={<Button variant="secondary" onClick={() => setConfirmBatch(true)} disabled={selected.length === 0}>批量完成</Button>}
      />
      <div className="mb-3 flex gap-2 overflow-x-auto">
        <Button size="sm" variant={cat === "all" ? "primary" : "secondary"} onClick={() => setCat("all")}>全部</Button>
        {TASK_CATEGORIES.map((c) => (
          <Button key={c.id} size="sm" variant={cat === c.id ? "primary" : "secondary"} onClick={() => setCat(c.id)}>
            {c.label}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="这一类没有待办"
          hint="去机会池推进阶段，或让成交智能体生成下一步任务。"
          action={<Button onClick={() => router.push("/agent")}>打开智能体</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={selected.includes(t.id)}
                    onChange={(e) =>
                      setSelected((p) => (e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id)))
                    }
                  />
                  <div>
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted">
                      {t.companyName} · {t.opportunityName} · 截止 {formatDateTime(t.dueAt)}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <Badge>{TASK_CATEGORIES.find((c) => c.id === t.category)?.label ?? t.category}</Badge>
                      {t.aiGenerated ? <Badge tone="cyan">AI</Badge> : null}
                      {new Date(t.dueAt) < new Date() && t.status === "open" ? <Badge tone="danger">逾期</Badge> : null}
                    </div>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button size="sm" onClick={() => complete(t.id)}>完成</Button>
                  <Button size="sm" variant="secondary" onClick={() => snooze(t.id)}>延期</Button>
                  <Button size="sm" variant="secondary" onClick={() => t.opportunityId && router.push(`/opportunities/${t.opportunityId}`)}>
                    跳转机会
                  </Button>
                  <Button size="sm" variant="cyan" onClick={() => t.opportunityId && router.push(`/agent?opportunityId=${t.opportunityId}`)}>
                    AI 跟进内容
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={confirmBatch}
        onOpenChange={setConfirmBatch}
        title="批量完成选中任务？"
        description={`将完成 ${selected.length} 条行动，并写入对应机会的活动记录。`}
        confirmText="批量完成"
        onConfirm={batch}
      />
    </div>
  );
}
