"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, DemoTag } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Textarea } from "@/components/ui/card";
import { api, copyText } from "@/lib/client";
import { MESSAGE_CHANNELS } from "@/lib/constants";

type Opp = { id: string; name: string; companyName?: string; score: number; stage: string; isDemo?: boolean };

type AgentResult = {
  analysis: Record<string, unknown>;
  chain: Record<string, unknown>;
  strategy: Record<string, unknown>;
  forecast: {
    probability: number;
    predictedAmount: number;
    expectedCloseDays: number;
    relationship: number;
    needConfirmed: number;
    decisionCoverage: number;
    budgetConfirmed: number;
    competitionRisk: number;
    stallRisk: number;
    confidence: number;
    rationale: string[];
  };
  engine: string;
};

export default function AgentPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [opportunityId, setOpportunityId] = useState(params.get("opportunityId") ?? "");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [tab, setTab] = useState("analysis");
  const [loading, setLoading] = useState(false);
  const [objection, setObjection] = useState("你们价格太高。");
  const [objResult, setObjResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string>("");
  const [channel, setChannel] = useState("email_zh");

  useEffect(() => {
    api<Opp[]>("/api/opportunities").then((res) => {
      if (res.ok) {
        setOpps(res.data);
        if (!opportunityId && res.data[0]) setOpportunityId(res.data[0].id);
      }
    });
     
  }, []);

  async function run() {
    if (!opportunityId) return toast.error("请选择一个机会");
    setLoading(true);
    const res = await api<AgentResult>(`/api/opportunities/${opportunityId}/agent`, {
      method: "POST",
      body: JSON.stringify({ type: "full" }),
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error.message);
    setResult(res.data);
    toast.success(res.data.engine === "demo" ? "演示引擎已生成成交方案" : "模型已生成成交方案");
  }

  async function runObjection() {
    const res = await api<Record<string, unknown>>("/api/agents/objection", {
      method: "POST",
      body: JSON.stringify({ opportunityId, objection }),
    });
    if (!res.ok) return toast.error(res.error.message);
    setObjResult(res.data);
    toast.success("异议处理完成");
  }

  async function genMessage() {
    const res = await api<{ body: string; label: string }>("/api/agents/message", {
      method: "POST",
      body: JSON.stringify({ opportunityId, channel }),
    });
    if (!res.ok) return toast.error(res.error.message);
    setMessage(res.data.body);
    toast.success(`已生成${res.data.label}`);
  }

  const selected = opps.find((o) => o.id === opportunityId);

  return (
    <div>
      <PageHeader
        title="AI 成交智能体"
        subtitle="读取同一条机会的企业、联系人与跟进，输出分析、决策链、策略、内容和预测。"
        extra={<Button loading={loading} onClick={run}>启动智能体</Button>}
      />
      <Card className="mb-4">
        <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="min-h-11 flex-1 rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm"
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
          >
            {opps.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.companyName}
              </option>
            ))}
          </select>
          {selected?.isDemo ? <DemoTag /> : null}
          <Button variant="secondary" onClick={() => opportunityId && router.push(`/opportunities/${opportunityId}`)}>
            打开机会
          </Button>
        </CardBody>
      </Card>

      {!result ? (
        <EmptyState
          title="尚未生成成交方案"
          hint="选择机会后启动智能体。未配置大模型密钥时使用演示引擎，会明确标记。"
          action={<Button loading={loading} onClick={run}>现在分析</Button>}
        />
      ) : (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {[
              ["analysis", "客户分析"],
              ["chain", "决策链"],
              ["strategy", "成交策略"],
              ["content", "内容生成"],
              ["objection", "异议处理"],
              ["forecast", "成交预测"],
            ].map(([id, label]) => (
              <Button key={id} size="sm" variant={tab === id ? "primary" : "secondary"} onClick={() => setTab(id)}>
                {label}
              </Button>
            ))}
          </div>

          {tab === "analysis" ? <KV title="客户分析" data={result.analysis} /> : null}
          {tab === "chain" ? <KV title="决策链分析" data={result.chain} /> : null}
          {tab === "strategy" ? <KV title="成交策略" data={result.strategy} /> : null}
          {tab === "forecast" ? (
            <Card>
              <CardBody>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Meter label="成交概率" n={result.forecast.probability} />
                  <Meter label="关系强度" n={result.forecast.relationship} />
                  <Meter label="需求确认度" n={result.forecast.needConfirmed} />
                  <Meter label="决策人覆盖" n={result.forecast.decisionCoverage} />
                  <Meter label="预算确认度" n={result.forecast.budgetConfirmed} />
                  <Meter label="竞争风险" n={result.forecast.competitionRisk} danger />
                  <Meter label="停滞风险" n={result.forecast.stallRisk} danger />
                  <Meter label="AI置信度" n={result.forecast.confidence} />
                </div>
                <p className="mt-4 text-sm text-muted">
                  预测金额 {result.forecast.predictedAmount.toLocaleString()} · 预计 {result.forecast.expectedCloseDays} 天后可成交
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  {result.forecast.rationale.map((r) => (
                    <p key={r}>· {r}</p>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}
          {tab === "content" ? (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {MESSAGE_CHANNELS.map((c) => (
                    <Button key={c.id} size="sm" variant={channel === c.id ? "cyan" : "secondary"} onClick={() => setChannel(c.id)}>
                      {c.label}
                    </Button>
                  ))}
                </div>
                <Button onClick={genMessage}>一键生成</Button>
                {message ? (
                  <>
                    <pre className="whitespace-pre-wrap rounded-[14px] bg-white/4 p-3 text-sm">{message}</pre>
                    <Button variant="secondary" onClick={() => copyText(message).then(() => toast.success("已复制"))}>
                      复制
                    </Button>
                  </>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
          {tab === "objection" ? (
            <Card>
              <CardBody className="space-y-3">
                <Textarea value={objection} onChange={(e) => setObjection(e.target.value)} />
                <Button onClick={runObjection}>处理异议</Button>
                {objResult ? (
                  <div className="space-y-2 text-sm">
                    <Badge>{String(objResult.type)}</Badge>
                    <p>真实顾虑：{String(objResult.real)}</p>
                    <p className="text-danger">不建议：{String(objResult.avoid)}</p>
                    <p>推荐回答：{String(objResult.reply)}</p>
                    <p>追问：{String(objResult.ask)}</p>
                    <p>下一步：{String(objResult.next)}</p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function KV({ title, data }: { title: string; data: Record<string, unknown> }) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 text-sm font-medium">{title}</div>
        <dl className="space-y-2">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="rounded-[12px] bg-white/4 px-3 py-2">
              <dt className="text-[11px] text-muted">{k}</dt>
              <dd className="text-sm">
                {Array.isArray(v) ? v.map(String).join("、") : typeof v === "object" ? JSON.stringify(v) : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

function Meter({ label, n, danger }: { label: string; n: number; danger?: boolean }) {
  return (
    <div className="rounded-[12px] bg-white/4 p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`font-mono text-xl ${danger && n > 60 ? "text-danger" : "text-cyan"}`}>{n}</div>
    </div>
  );
}
