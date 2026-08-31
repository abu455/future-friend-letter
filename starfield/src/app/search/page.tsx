"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader, DemoTag } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState, Input, Label } from "@/components/ui/card";
import { Sheet } from "@/components/ui/overlay";
import { api } from "@/lib/client";
import { EMPLOYEE_RANGES, SENIORITY_OPTIONS } from "@/lib/constants";

type Person = {
  id: string;
  name: string;
  title: string;
  organization: string;
  location: string | null;
  domain: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  enrichmentStatus: string;
  isDemo: boolean;
  seniority: string | null;
  headline: string | null;
};

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "automotive interior");
  const [titles, setTitles] = useState("采购总监,生产总监,工厂负责人");
  const [seniority, setSeniority] = useState("director");
  const [orgLoc, setOrgLoc] = useState("Germany");
  const [emp, setEmp] = useState("101,200");
  const [configured, setConfigured] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Person | null>(null);

  useEffect(() => {
    api<{ configured: boolean; note: string }>("/api/apollo-search").then((res) => {
      if (res.ok) setConfigured(res.data.configured);
    });
  }, []);

  async function search(useDemoFallback = false) {
    setLoading(true);
    setError(null);
    setWarning(null);
    const res = await api<{ people: Person[] }>("/api/apollo-search", {
      method: "POST",
      body: JSON.stringify({
        q_keywords: q,
        person_titles: titles.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
        person_seniorities: seniority ? [seniority] : [],
        organization_locations: orgLoc ? [orgLoc] : [],
        organization_num_employees_ranges: emp ? [emp] : [],
        useDemoFallback,
        page: 1,
        per_page: 10,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setPeople([]);
      return;
    }
    setPeople(res.data.people);
    if (res.meta?.warning) setWarning(String(res.meta.warning));
    if (res.data.people.length === 0) toast.message("没有结果");
  }

  async function capture(person: Person, mode: "list" | "opportunity" | "agent") {
    const res = await api<{ opportunityId?: string }>("/api/search/capture", {
      method: "POST",
      body: JSON.stringify({ person, mode }),
    });
    if (!res.ok) return toast.error(res.error.message);
    toast.success(mode === "list" ? "已加入触达名单" : "已转为销售机会");
    if (res.data.opportunityId) {
      router.push(mode === "agent" ? `/agent?opportunityId=${res.data.opportunityId}` : `/opportunities/${res.data.opportunityId}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="企业与决策人搜索"
        subtitle="Apollo 密钥只在服务端以 x-api-key 传递。未配置时不会把演示联系人伪装成实时结果。"
      />
      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-[12px] border border-white/10 bg-white/4 px-3 py-2 text-xs text-muted">
            状态：{configured ? "已配置 Apollo 密钥" : "API Key 未配置"}。数组筛选按官方 Query Params 发送：person_titles[]、person_seniorities[]、organization_locations[]、organization_num_employees_ranges[]。
          </div>
          <div>
            <Label>企业或行业关键词</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <Label>目标职位（逗号分隔）</Label>
            <Input value={titles} onChange={(e) => setTitles(e.target.value)} />
          </div>
          <div>
            <Label>决策人职级</Label>
            <select className="min-h-11 w-full rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
              {SENIORITY_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>企业总部地区</Label>
            <Input value={orgLoc} onChange={(e) => setOrgLoc(e.target.value)} />
          </div>
          <div>
            <Label>员工人数</Label>
            <select className="min-h-11 w-full rounded-[14px] border border-white/10 bg-white/5 px-3 text-sm" value={emp} onChange={(e) => setEmp(e.target.value)}>
              {EMPLOYEE_RANGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button loading={loading} onClick={() => search(false)}>搜索 Apollo</Button>
            <Button variant="secondary" onClick={() => search(true)}>使用演示联系人</Button>
          </div>
        </CardBody>
      </Card>

      {error ? (
        <Card className="mb-4 border-danger/30">
          <CardBody>
            <div className="font-medium text-danger">{error.code}</div>
            <p className="mt-1 text-sm text-muted">{error.message}</p>
            {error.code === "APOLLO_NOT_CONFIGURED" ? (
              <Button className="mt-3" variant="secondary" onClick={() => search(true)}>
                改为检索本地演示联系人
              </Button>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
      {warning ? <p className="mb-3 text-xs text-warning">{warning}</p> : null}

      {people.length === 0 && !error ? (
        <EmptyState title="还没有搜索结果" hint="先发起 Apollo 搜索，或在未配置密钥时使用演示联系人。" action={<Button onClick={() => search(true)}>加载演示联系人</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {people.map((p) => (
            <Card key={p.id} interactive onClick={() => setActive(p)}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.name}{p.isDemo ? <DemoTag /> : null}</div>
                    <div className="text-sm text-muted">{p.title} · {p.organization}</div>
                    <div className="text-xs text-muted">{p.location} · {p.domain ?? "无域名"}</div>
                  </div>
                  <Badge tone={p.enrichmentStatus === "available" ? "success" : "warning"}>
                    {p.enrichmentStatus === "available" ? "可联系" : "需要 Enrichment"}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted">
                  邮箱 {p.email ?? "需要 Enrichment"} · 电话 {p.phone ?? "需要 Enrichment"}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={Boolean(active)} onOpenChange={(v) => !v && setActive(null)} title={active?.name ?? "画像"}>
        {active ? (
          <div className="space-y-3 text-sm">
            <p>{active.title} @ {active.organization}</p>
            <p className="text-muted">{active.headline}</p>
            <p>LinkedIn：{active.linkedinUrl ?? "未提供"}</p>
            <p>邮箱：{active.email ?? "需要 Enrichment（People Search 未返回联系方式，系统不会伪造）"}</p>
            <div className="grid gap-2">
              <Button onClick={() => capture(active, "list")}>加入触达名单</Button>
              <Button variant="secondary" onClick={() => capture(active, "opportunity")}>转为销售机会</Button>
              <Button variant="cyan" onClick={() => capture(active, "agent")}>交给成交智能体</Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
