"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { api } from "@/lib/client";
import { useState } from "react";

export function SignalActions({
  signal,
  onDone,
}: {
  signal: {
    id: string;
    title: string;
    sourceUrl?: string | null;
    companyId?: string | null;
    companyName: string;
  };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmIgnore, setConfirmIgnore] = useState(false);

  async function convert() {
    setBusy("convert");
    const res = await api<{ id: string }>(`/api/signals/${signal.id}/opportunity`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBusy(null);
    if (!res.ok) return toast.error(res.error.message);
    toast.success("已加入机会池");
    router.push(`/opportunities/${res.data.id}`);
    onDone?.();
  }

  async function ignore() {
    setBusy("ignore");
    const res = await api(`/api/signals/${signal.id}/ignore`, { method: "POST" });
    setBusy(null);
    setConfirmIgnore(false);
    if (!res.ok) return toast.error(res.error.message);
    toast.success("已忽略该信号");
    onDone?.();
  }

  async function remind() {
    setBusy("remind");
    const due = new Date(Date.now() + 86400000).toISOString();
    const res = await api(`/api/signals/${signal.id}/reminder`, {
      method: "POST",
      body: JSON.stringify({ dueAt: due, note: `提醒：${signal.title}` }),
    });
    setBusy(null);
    if (!res.ok) return toast.error(res.error.message);
    toast.success("已设置明天提醒");
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="secondary"
        onClick={() =>
          signal.sourceUrl ? window.open(signal.sourceUrl, "_blank") : toast.message("演示数据没有可访问的原文链接")
        }
      >
        查看原文
      </Button>
      <Button variant="secondary" onClick={() => router.push(`/agent?signalId=${signal.id}`)}>
        AI 分析
      </Button>
      <Button
        variant="secondary"
        onClick={() => router.push(`/search?q=${encodeURIComponent(signal.companyName)}`)}
      >
        查找企业 / 决策人
      </Button>
      <Button loading={busy === "convert"} onClick={convert}>
        加入机会池
      </Button>
      <Button variant="secondary" loading={busy === "remind"} onClick={remind}>
        设置提醒
      </Button>
      <Button variant="danger" onClick={() => setConfirmIgnore(true)}>
        忽略
      </Button>
      <ConfirmDialog
        open={confirmIgnore}
        onOpenChange={setConfirmIgnore}
        title="忽略这条信号？"
        description="忽略后仍可在筛选中找回，但不会再出现在默认雷达高潜层。"
        confirmText="确认忽略"
        danger
        loading={busy === "ignore"}
        onConfirm={ignore}
      />
    </div>
  );
}
