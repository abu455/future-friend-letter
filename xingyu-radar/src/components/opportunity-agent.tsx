"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  Clipboard,
  Loader2,
  Mail,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, idempotencyKey } from "@/lib/client-api";
import type { AgentAnalysis, Opportunity } from "@/lib/domain";

type MessageResult = {
  mode: string;
  type: string;
  language: string;
  subject: string;
  content: string;
  guardrail: string;
};

type ObjectionResult = {
  mode: string;
  objectionType: string;
  realConcern: string;
  avoid: string;
  recommendedReply: string;
  followUpQuestions: string[];
  proof: string[];
  nextAction: string;
};

export function OpportunityAgent({
  opportunity,
  open,
  onOpenChange,
  onOpportunityUpdated,
}: {
  opportunity?: Opportunity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpportunityUpdated: (opportunity: Opportunity) => void;
}) {
  const [analysis, setAnalysis] = useState<AgentAnalysis>();
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<MessageResult>();
  const [messageLoading, setMessageLoading] = useState(false);
  const [objection, setObjection] = useState("你们价格太高。");
  const [objectionResult, setObjectionResult] = useState<ObjectionResult>();
  const [objectionLoading, setObjectionLoading] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);

  useEffect(() => {
    setAnalysis(undefined);
    setMessage(undefined);
    setObjectionResult(undefined);
    setTaskCreated(false);
  }, [opportunity?.id]);

  async function runAgent() {
    if (!opportunity) return;
    setAnalyzing(true);
    try {
      const response = await apiRequest<AgentAnalysis>(
        `/api/opportunities/${opportunity.id}/agent`,
        { method: "POST", body: "{}" },
      );
      setAnalysis(response.data);
      onOpportunityUpdated({
        ...opportunity,
        probability: response.data.prediction.probability,
      });
      toast.success("成交智能体已完成分析并更新成交概率");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  async function createMessage(type: string, language: "zh" | "en") {
    if (!opportunity) return;
    setMessageLoading(true);
    try {
      const response = await apiRequest<MessageResult>("/api/agents/message", {
        method: "POST",
        body: JSON.stringify({
          opportunityId: opportunity.id,
          type,
          language,
        }),
      });
      setMessage(response.data);
      toast.success(`${type}已生成`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "内容生成失败");
    } finally {
      setMessageLoading(false);
    }
  }

  async function handleObjection() {
    if (!opportunity) return;
    setObjectionLoading(true);
    try {
      const response = await apiRequest<ObjectionResult>(
        "/api/agents/objection",
        {
          method: "POST",
          body: JSON.stringify({
            opportunityId: opportunity.id,
            objection,
          }),
        },
      );
      setObjectionResult(response.data);
      toast.success("异议策略已生成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "异议分析失败");
    } finally {
      setObjectionLoading(false);
    }
  }

  async function createNextTask() {
    if (!opportunity || !analysis) return;
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          opportunityId: opportunity.id,
          title: analysis.strategy.nextBestAction,
          description: "由成交智能体根据最新机会分析创建",
          idempotencyKey: idempotencyKey(`agent-task-${opportunity.id}`),
        }),
      });
      setTaskCreated(true);
      toast.success("下一步行动已加入行动中心");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "任务创建失败");
    }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(
      `${message.subject}\n\n${message.content}`,
    );
    toast.success("内容已复制到剪贴板");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l-white/10 bg-[#07182B] p-0 sm:max-w-3xl"
      >
        <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#07182B]/95 px-5 py-4 backdrop-blur-xl">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-[#1677FF]/15 text-[#67B7FF]">
                <BrainCircuit className="size-5" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-base text-white">
                  AI 成交智能体
                </SheetTitle>
                <SheetDescription className="truncate text-xs text-[#86A3C3]">
                  {opportunity?.companyName ?? "选择一个销售机会"}
                </SheetDescription>
              </div>
              <Badge className="ml-auto mr-7 border-[#3DDCFF]/20 bg-[#3DDCFF]/10 text-[#92EDFF]">
                演示分析
              </Badge>
            </div>
          </SheetHeader>
        </div>

        {!analysis ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
            <motion.div
              animate={
                analyzing
                  ? { rotate: 360, scale: [1, 1.06, 1] }
                  : { y: [0, -5, 0] }
              }
              transition={{
                duration: analyzing ? 2 : 3,
                repeat: Infinity,
                ease: "linear",
              }}
              className="grid size-20 place-items-center rounded-3xl border border-[#2F9BFF]/20 bg-[#1677FF]/10 shadow-[0_0_55px_rgba(22,119,255,.18)]"
            >
              {analyzing ? (
                <Loader2 className="size-8 text-[#3DDCFF]" />
              ) : (
                <Bot className="size-9 text-[#67B7FF]" />
              )}
            </motion.div>
            <h2 className="mt-6 text-xl font-semibold">
              {analyzing ? "正在构建成交路径" : "让智能体接管机会研判"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#86A3C3]">
              {analyzing
                ? "分析企业画像、决策链、痛点、竞争风险与最佳下一步行动…"
                : "智能体将读取当前机会、联系人和信号记录，给出可解释的成交预测与推进策略。"}
            </p>
            {analyzing && (
              <div className="mt-6 w-full max-w-sm">
                <Progress value={76} className="h-1.5 bg-white/[0.06]" />
                <div className="mt-3 grid grid-cols-3 text-[10px] text-[#6E8BAA]">
                  <span className="text-left">客户画像 ✓</span>
                  <span>决策链 ✓</span>
                  <span className="text-right text-[#3DDCFF]">成交预测…</span>
                </div>
              </div>
            )}
            <Button
              size="lg"
              onClick={runAgent}
              disabled={analyzing || !opportunity}
              className="mt-8 h-12 rounded-xl bg-[#1677FF] px-7 shadow-[0_0_24px_rgba(22,119,255,.25)]"
            >
              {analyzing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {analyzing ? "智能体分析中" : "启动成交智能体"}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="analysis" className="px-4 pb-12 pt-4 sm:px-6">
            <TabsList className="sticky top-[77px] z-10 h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-[#0B1F36]/95 p-1 hide-scrollbar">
              {[
                ["analysis", "客户分析"],
                ["chain", "决策链"],
                ["strategy", "成交策略"],
                ["content", "内容生成"],
                ["objection", "异议处理"],
                ["prediction", "成交预测"],
              ].map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="min-h-10 shrink-0 rounded-lg px-3 text-xs data-[state=active]:bg-[#1677FF] data-[state=active]:text-white"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="analysis" className="mt-5 space-y-4">
              <AgentSection
                icon={<Target />}
                eyebrow="客户分析"
                title="企业基本画像与机会场景"
              >
                <p className="text-sm leading-7 text-[#BED2E8]">
                  {analysis.customer.profile}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Metric label="需求强度" value={analysis.customer.demandStrength} />
                  <Metric label="采购紧迫度" value={analysis.customer.urgency} />
                  <Metric label="预算可能性" value={analysis.customer.budgetLikelihood} />
                </div>
              </AgentSection>
              <div className="grid gap-4 sm:grid-cols-2">
                <ListCard title="可能业务场景" items={analysis.customer.scenarios} />
                <ListCard title="主要痛点" items={analysis.customer.painPoints} />
                <ListCard
                  title="当前设备或方案"
                  items={[analysis.customer.currentSolution]}
                />
                <ListCard
                  title="竞争替代方案"
                  items={analysis.customer.alternatives}
                />
              </div>
            </TabsContent>

            <TabsContent value="chain" className="mt-5">
              <AgentSection
                icon={<Users />}
                eyebrow="决策链分析"
                title="谁影响这笔交易"
              >
                <div className="mt-2 space-y-2">
                  {analysis.decisionChain.map((person, index) => (
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      key={person.role}
                      className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="grid size-8 shrink-0 place-items-center rounded-full border border-[#2F9BFF]/30 bg-[#1677FF]/12 text-xs font-semibold text-[#72C8FF]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            {person.role}
                          </p>
                          <Badge
                            variant="outline"
                            className="border-white/10 text-[10px] text-[#86A3C3]"
                          >
                            {person.risk}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-[#8CCBFF]">
                          {person.likelyPerson}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#6E8BAA]">
                          {person.influence}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AgentSection>
            </TabsContent>

            <TabsContent value="strategy" className="mt-5 space-y-4">
              <AgentSection
                icon={<Sparkles />}
                eyebrow="推荐切入"
                title={analysis.strategy.entryAngle}
              >
                <p className="rounded-xl border border-[#38D996]/15 bg-[#38D996]/[0.06] p-4 text-sm leading-6 text-[#BDEBD8]">
                  {analysis.strategy.valueProposition}
                </p>
              </AgentSection>
              <div className="grid gap-4 sm:grid-cols-2">
                <ListCard title="建议沟通顺序" items={analysis.strategy.sequence} numbered />
                <ListCard title="建议提供资料" items={analysis.strategy.materials} />
                <ListCard title="推荐演示方案" items={[analysis.strategy.demo]} />
                <ListCard title="报价策略" items={[analysis.strategy.pricing]} />
              </div>
              <div className="rounded-2xl border border-[#1677FF]/20 bg-[#1677FF]/[0.07] p-5">
                <p className="text-xs text-[#72C8FF]">下一步最佳行动</p>
                <p className="mt-2 text-sm font-medium leading-6 text-white">
                  {analysis.strategy.nextBestAction}
                </p>
                <Button
                  className="mt-4 h-11 bg-[#1677FF]"
                  disabled={taskCreated}
                  onClick={createNextTask}
                >
                  {taskCreated ? <Check /> : <ArrowRight />}
                  {taskCreated ? "已加入行动中心" : "创建下一步行动"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ["中文开发信", "zh"],
                  ["英文开发信", "en"],
                  ["LinkedIn 私信", "en"],
                  ["WhatsApp 消息", "en"],
                  ["电话开场白", "zh"],
                  ["需求确认问题", "zh"],
                  ["会议邀请", "zh"],
                  ["跟进邮件", "zh"],
                  ["报价跟进", "zh"],
                  ["未回复唤醒", "zh"],
                ].map(([type, language]) => (
                  <Button
                    key={type}
                    variant="outline"
                    disabled={messageLoading}
                    onClick={() =>
                      createMessage(type, language as "zh" | "en")
                    }
                    className="h-12 justify-start border-white/[0.08] bg-white/[0.025] text-xs hover:border-[#2F9BFF]/30 hover:bg-[#1677FF]/10"
                  >
                    {type.includes("信") || type.includes("邮件") ? (
                      <Mail />
                    ) : (
                      <MessageSquareText />
                    )}
                    {type}
                  </Button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {messageLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid min-h-56 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.02]"
                  >
                    <Loader2 className="size-6 animate-spin text-[#3DDCFF]" />
                  </motion.div>
                )}
                {message && !messageLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-[#2F9BFF]/20 bg-[#0B1F36] p-5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#1677FF]/15 text-[#8CCBFF]">
                        {message.type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-9 text-xs"
                        onClick={copyMessage}
                      >
                        <Clipboard />
                        复制
                      </Button>
                    </div>
                    <p className="mt-4 text-sm font-medium">{message.subject}</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#BED2E8]">
                      {message.content}
                    </p>
                    <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] text-[#6E8BAA]">
                      {message.guardrail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="objection" className="mt-5 space-y-4">
              <AgentSection
                icon={<ShieldAlert />}
                eyebrow="异议处理"
                title="拆解客户真实顾虑"
              >
                <Textarea
                  value={objection}
                  onChange={(event) => setObjection(event.target.value)}
                  maxLength={2000}
                  className="min-h-28 border-white/10 bg-[#061426]/60"
                  placeholder="输入客户原话，例如：你们价格太高。"
                />
                <Button
                  onClick={handleObjection}
                  disabled={objectionLoading || objection.trim().length < 2}
                  className="mt-3 h-11 bg-[#1677FF]"
                >
                  {objectionLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <BrainCircuit />
                  )}
                  生成应对策略
                </Button>
              </AgentSection>
              {objectionResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <ResultBlock label="异议类型" value={objectionResult.objectionType} />
                  <ResultBlock label="客户真实顾虑" value={objectionResult.realConcern} />
                  <ResultBlock label="不建议的回答" value={objectionResult.avoid} danger />
                  <ResultBlock
                    label="推荐回答"
                    value={objectionResult.recommendedReply}
                    highlight
                  />
                  <ListCard
                    title="进一步追问"
                    items={objectionResult.followUpQuestions}
                  />
                  <ListCard
                    title="可提供的证明材料"
                    items={objectionResult.proof}
                  />
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="prediction" className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#2F9BFF]/20 bg-[#0B1F36] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#86A3C3]">预测成交概率</p>
                    <p className="mt-1 text-4xl font-semibold text-[#3DDCFF]">
                      {analysis.prediction.probability}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#86A3C3]">AI 置信度</p>
                    <p className="mt-1 text-lg font-semibold">
                      {analysis.confidence}%
                    </p>
                  </div>
                </div>
                <Progress
                  value={analysis.prediction.probability}
                  className="mt-4 h-2 bg-white/[0.06]"
                />
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Score label="关系强度" value={analysis.prediction.relationship} />
                  <Score label="需求确认度" value={analysis.prediction.needClarity} />
                  <Score
                    label="决策人覆盖"
                    value={analysis.prediction.stakeholderCoverage}
                  />
                  <Score label="预算确认度" value={analysis.prediction.budgetClarity} />
                  <Score
                    label="竞争风险"
                    value={analysis.prediction.competitionRisk}
                    risk
                  />
                  <Score
                    label="停滞风险"
                    value={analysis.prediction.stagnationRisk}
                    risk
                  />
                </div>
              </div>
              <ListCard title="评分依据" items={analysis.prediction.rationale} numbered />
              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="预测金额"
                  value={`¥${(analysis.prediction.amount / 10000).toFixed(0)}万`}
                />
                <Metric
                  label="预计成交时间"
                  value={analysis.prediction.closeWindow}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AgentSection({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1677FF]/12 text-[#67B7FF] [&_svg]:size-4">
          {icon}
        </span>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#3DDCFF]">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-6 text-white">{title}</h3>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-[10px] text-[#6E8BAA]">{label}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-[#D8E8FF]">{value}</p>
    </div>
  );
}

function ListCard({
  title,
  items,
  numbered,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0B1F36] p-5">
      <p className="text-xs font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex gap-2 text-xs leading-5 text-[#9DB5CE]"
          >
            <span className="mt-0.5 text-[#3DDCFF]">
              {numbered ? `${index + 1}.` : "•"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultBlock({
  label,
  value,
  danger,
  highlight,
}: {
  label: string;
  value: string;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger
          ? "border-[#FF647C]/15 bg-[#FF647C]/[0.05]"
          : highlight
            ? "border-[#38D996]/20 bg-[#38D996]/[0.06]"
            : "border-white/[0.07] bg-[#0B1F36]"
      }`}
    >
      <p className="text-[10px] text-[#86A3C3]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#D8E8FF]">{value}</p>
    </div>
  );
}

function Score({
  label,
  value,
  risk,
}: {
  label: string;
  value: number;
  risk?: boolean;
}) {
  const color = risk
    ? value > 60
      ? "text-[#FF647C]"
      : "text-[#FFB547]"
    : value > 60
      ? "text-[#38D996]"
      : "text-[#8CCBFF]";
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <p className="text-[10px] text-[#6E8BAA]">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold ${color}`}>{value}%</p>
    </div>
  );
}
