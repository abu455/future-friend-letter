"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, DemoTag } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Input, Label, Textarea } from "@/components/ui/card";
import { api } from "@/lib/client";
import { SCAN_STEPS } from "@/lib/constants";
import type { IcpProfile } from "@/lib/validators";

const EXAMPLE =
  "寻找德国100—500人的汽车内饰工厂，重点寻找采购总监、生产总监或工厂负责人，客户可能有柔性材料裁切自动化升级需求。";

export default function ScanPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(EXAMPLE);
  const [icp, setIcp] = useState<IcpProfile | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [job, setJob] = useState<{ id: string; step: number; stepLabel: string; status: string; foundCount: number } | null>(null);

  async function parse() {
    setParsing(true);
    const res = await api<{ icp: IcpProfile; engine: { engine: string; model: string } }>("/api/radar/parse", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    setParsing(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    setIcp(res.data.icp);
    setEngine(`${res.data.engine.engine} / ${res.data.engine.model}`);
    toast.success(res.data.engine.engine === "demo" ? "演示引擎已拆解需求" : "模型已拆解需求");
  }

  async function scan() {
    if (!icp) {
      toast.error("请先解析需求并确认 ICP");
      return;
    }
    setScanning(true);
    const res = await api<{ id: string; step: number; stepLabel: string; status: string; foundCount: number }>(
      "/api/radar/scan",
      {
        method: "POST",
        body: JSON.stringify({ query, icp, idempotencyKey: `ui-${Date.now()}` }),
      },
    );
    setScanning(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    setJob(res.data);
    toast.success("扫描任务已启动");
  }

  useEffect(() => {
    if (!job?.id || job.status === "completed") return;
    const timer = setInterval(async () => {
      const res = await api<{ id: string; step: number; stepLabel: string; status: string; foundCount: number }>(
        `/api/radar/status?jobId=${job.id}`,
      );
      if (res.ok) {
        setJob(res.data);
        if (res.data.status === "completed") {
          toast.success(`扫描完成，发现 ${res.data.foundCount} 条信号`);
        }
      }
    }, 700);
    return () => clearInterval(timer);
  }, [job?.id, job?.status]);

  useEffect(() => {
    if (params.get("running") === "1") {
      parse().then(() => undefined);
    }
     
  }, []);

  const fields = useMemo(() => {
    if (!icp) return [];
    return [
      ["目标行业", "industry"],
      ["人数下限", "employeeMin"],
      ["人数上限", "employeeMax"],
    ] as const;
  }, [icp]);

  return (
    <div>
      <PageHeader
        title="AI 需求输入与市场扫描"
        subtitle="自然语言进，ICP 出。确认后再扫描，信号会进入雷达和机会池同一数据闭环。"
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <Label>自然语言需求</Label>
            <Textarea value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setQuery(EXAMPLE)}>
                填入示例
              </Button>
              <Button loading={parsing} onClick={parse}>
                AI 拆解需求
              </Button>
            </div>
            {engine ? <p className="text-xs text-muted">解析引擎：{engine}<DemoTag show={engine.includes("demo")} /></p> : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-sm font-medium mb-3">扫描进度</div>
            <ol className="space-y-2">
              {SCAN_STEPS.map((s) => {
                const on = (job?.step ?? 0) >= s.id;
                const current = job?.step === s.id && job.status !== "completed";
                return (
                  <li key={s.id} className="flex min-h-11 items-center gap-3 rounded-[12px] bg-white/4 px-3">
                    <span
                      className={`size-2 rounded-full ${on ? "bg-cyan glow-cyan" : "bg-white/20"} ${current ? "animate-pulse" : ""}`}
                    />
                    <span className={on ? "text-foreground" : "text-muted"}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
            {job?.status === "completed" ? (
              <div className="mt-4 flex gap-2">
                <Button onClick={() => router.push("/radar")}>查看雷达</Button>
                <Button variant="secondary" onClick={() => router.push("/signals")}>
                  打开信号中心
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {icp ? (
        <Card className="mt-4">
          <CardBody>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">ICP 解析结果（可改）</div>
              <Button loading={scanning} onClick={scan}>
                启动扫描
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {fields.map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    value={String(icp[key])}
                    onChange={(e) =>
                      setIcp({
                        ...icp,
                        [key]: key.includes("employee") ? Number(e.target.value) || 0 : e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <TagEditor label="产品/需求关键词" values={icp.keywords} onChange={(keywords) => setIcp({ ...icp, keywords })} />
            <TagEditor label="国家" values={icp.countries} onChange={(countries) => setIcp({ ...icp, countries })} />
            <TagEditor label="目标职位" values={icp.titles} onChange={(titles) => setIcp({ ...icp, titles })} />
            <TagEditor label="决策人职级" values={icp.seniorities} onChange={(seniorities) => setIcp({ ...icp, seniorities })} />
            <TagEditor label="采购信号" values={icp.buyingSignals} onChange={(buyingSignals) => setIcp({ ...icp, buyingSignals })} />
            <TagEditor label="预计痛点" values={icp.painPoints} onChange={(painPoints) => setIcp({ ...icp, painPoints })} />
            <TagEditor label="排除条件" values={icp.exclusions} onChange={(exclusions) => setIcp({ ...icp, exclusions })} />
          </CardBody>
        </Card>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="还没有 ICP"
            hint="先让 AI 拆解需求，或手动点示例后再解析。"
            action={<Button onClick={parse} loading={parsing}>开始拆解</Button>}
          />
        </div>
      )}
    </div>
  );
}

function TagEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mt-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            className="min-h-11"
            onClick={() => onChange(values.filter((x) => x !== v))}
          >
            <Badge tone="cyan">{v} ×</Badge>
          </button>
        ))}
        <Input
          className="max-w-[220px]"
          placeholder="添加后回车"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) onChange([...values, draft.trim()]);
              setDraft("");
            }
          }}
        />
      </div>
    </div>
  );
}
