"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Textarea } from "@/components/ui/card";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";

type DS = {
  id: string;
  type: string;
  name: string;
  status: string;
  configured: boolean;
  enabled: boolean;
  lastScanAt: string | null;
  lastFoundCount: number;
  errorMessage: string | null;
  apiUsage: number | null;
  apiLimit: number | null;
};

const TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  connected: "success",
  unconfigured: "warning",
  error: "danger",
  paused: "muted",
};

export default function DataSourcesPage() {
  const [rows, setRows] = useState<DS[]>([]);
  const [csv, setCsv] = useState("name,industry,region\n示例皮革工厂,汽车内饰,德国");
  const [testing, setTesting] = useState<string | null>(null);

  async function load() {
    const res = await api<DS[]>("/api/data-sources");
    if (!res.ok) toast.error(res.error.message);
    else setRows(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function test(id: string) {
    setTesting(id);
    const res = await api<{ ok: boolean; message: string; code: string }>(`/api/data-sources/${id}/test`, {
      method: "POST",
    });
    setTesting(null);
    if (!res.ok) return toast.error(res.error.message);
    toast[res.data.ok ? "success" : "error"](res.data.message);
    load();
  }

  async function toggle(id: string, enabled: boolean) {
    const res = await api(`/api/data-sources/${id}/test?action=toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(enabled ? "已开启" : "已暂停");
    load();
  }

  async function importCsv() {
    const res = await api<{ created: number }>("/api/import/csv", {
      method: "POST",
      body: JSON.stringify({ csv }),
    });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(`已导入 ${res.data.created} 家企业（演示标记）`);
  }

  return (
    <div>
      <PageHeader
        title="数据源中心"
        subtitle="Apollo 与企查查未配置时会明确显示。协会、展会、招聘、新闻在演示环境使用 Seed，不是实时爬虫。"
      />
      {rows.length === 0 ? (
        <EmptyState title="没有数据源" hint="请先运行 npm run db:setup 初始化。" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((d) => (
            <Card key={d.id}>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.name}</div>
                  <Badge tone={TONE[d.status] ?? "muted"}>{d.status}</Badge>
                </div>
                <p className="text-xs text-muted">
                  {d.configured ? "已配置" : "未配置"} · 最近扫描 {d.lastScanAt ? formatDateTime(d.lastScanAt) : "—"} · 本次发现 {d.lastFoundCount}
                </p>
                {d.apiUsage != null ? (
                  <p className="text-xs text-muted">API 用量 {d.apiUsage}/{d.apiLimit ?? "—"}</p>
                ) : null}
                {d.errorMessage ? <p className="text-xs text-warning">{d.errorMessage}</p> : null}
                <div className="flex gap-2">
                  <Button size="sm" loading={testing === d.id} onClick={() => test(d.id)}>
                    测试连接
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggle(d.id, !d.enabled)}>
                    {d.enabled ? "暂停" : "开启"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <Card className="mt-4">
        <CardBody className="space-y-3">
          <div className="text-sm font-medium">手动 CSV 导入</div>
          <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
          <Button onClick={importCsv}>导入企业</Button>
        </CardBody>
      </Card>
    </div>
  );
}
