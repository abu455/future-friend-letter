import {
  DEMO_COMPANIES,
  DEMO_CONTACTS,
  DEMO_DATA_SOURCES,
  DEMO_OPPORTUNITIES,
  DEMO_SIGNALS,
  DEMO_TASKS,
} from "@/lib/demo-data";
import {
  OPPORTUNITY_STAGES,
  type AgentAnalysis,
  type Company,
  type Contact,
  type FollowUpTask,
  type Opportunity,
  type ScanCriteria,
  type ScanJob,
} from "@/lib/domain";

type DemoState = {
  companies: typeof DEMO_COMPANIES;
  contacts: Contact[];
  dataSources: typeof DEMO_DATA_SOURCES;
  opportunities: Opportunity[];
  signals: typeof DEMO_SIGNALS;
  tasks: FollowUpTask[];
  scanJobs: ScanJob[];
  idempotency: Map<string, unknown>;
};

const initialState = (): DemoState => ({
  companies: structuredClone(DEMO_COMPANIES),
  contacts: structuredClone(DEMO_CONTACTS),
  dataSources: structuredClone(DEMO_DATA_SOURCES),
  opportunities: structuredClone(DEMO_OPPORTUNITIES),
  signals: structuredClone(DEMO_SIGNALS),
  tasks: structuredClone(DEMO_TASKS),
  scanJobs: [],
  idempotency: new Map(),
});

const globalStore = globalThis as typeof globalThis & {
  __xingyuDemoStore?: DemoState;
};

export const demoStore = globalStore.__xingyuDemoStore ?? initialState();
globalStore.__xingyuDemoStore = demoStore;

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;

export function resetDemoStore() {
  const reset = initialState();
  demoStore.companies = reset.companies;
  demoStore.contacts = reset.contacts;
  demoStore.dataSources = reset.dataSources;
  demoStore.opportunities = reset.opportunities;
  demoStore.signals = reset.signals;
  demoStore.tasks = reset.tasks;
  demoStore.scanJobs = reset.scanJobs;
  demoStore.idempotency.clear();
}

export function sanitizeUserInput(input: string) {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(
      /(ignore\s+(all\s+)?previous|system\s*prompt|developer\s*message|忽略.{0,8}(指令|提示词)|系统提示词)/gi,
      "[已移除潜在提示词注入]",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRequirement(rawInput: string): ScanCriteria {
  const input = sanitizeUserInput(rawInput);
  const regions: string[] = [];
  const regionMap: [RegExp, string][] = [
    [/德国|germany/i, "德国"],
    [/波兰|poland/i, "波兰"],
    [/西班牙|spain/i, "西班牙"],
    [/越南|vietnam/i, "越南"],
    [/欧洲|europe/i, "欧洲"],
    [/美国|usa|united states/i, "美国"],
  ];
  regionMap.forEach(([pattern, value]) => {
    if (pattern.test(input)) regions.push(value);
  });

  const industries = [
    "汽车内饰",
    "柔性材料裁切",
    "工业自动化",
    "箱包制造",
    "包装设备",
    "鞋材加工",
  ].filter((item) => input.includes(item));

  const titleCandidates = [
    "采购总监",
    "生产总监",
    "工厂负责人",
    "自动化经理",
    "技术总监",
    "COO",
  ];
  const titles = titleCandidates.filter((item) => input.includes(item));
  const employeeMatch = input.match(/(\d{2,5})\s*[—–\-到至]\s*(\d{2,5})\s*人?/);
  const keywords = [
    "柔性材料",
    "自动裁切",
    "裁切自动化",
    "材料损耗",
    "产线升级",
    "数字化",
  ].filter((item) => input.includes(item));

  return {
    industry: industries.length ? industries : ["工业制造"],
    keywords: keywords.length ? keywords : ["自动化升级", "效率提升"],
    regions: regions.length ? [...new Set(regions)] : ["全球"],
    employeeRange: employeeMatch
      ? `${employeeMatch[1]}-${employeeMatch[2]}`
      : "100-1000",
    titles: titles.length
      ? titles
      : ["采购总监", "生产总监", "工厂负责人"],
    seniorities: ["director", "head", "c_suite"],
    buyingSignals: ["新建或扩建产线", "招聘自动化岗位", "设备招标", "效率改造"],
    painPoints: ["材料损耗偏高", "换款效率低", "依赖刀模与人工", "交期压力"],
    exclusions: ["纯贸易公司", "少于50人", "无自有生产场地"],
  };
}

export function createScanJob(input: {
  query: string;
  criteria?: ScanCriteria;
  idempotencyKey: string;
}) {
  const cached = demoStore.idempotency.get(input.idempotencyKey);
  if (cached) return cached as ScanJob;

  const job: ScanJob = {
    id: makeId("scan"),
    query: sanitizeUserInput(input.query),
    criteria: input.criteria ?? parseRequirement(input.query),
    status: "RUNNING",
    progress: 5,
    currentStep: 1,
    resultCount: 0,
    createdAt: nowIso(),
  };
  demoStore.scanJobs.unshift(job);
  demoStore.idempotency.set(input.idempotencyKey, job);
  return job;
}

export function getScanJob(id?: string) {
  const job = id
    ? demoStore.scanJobs.find((item) => item.id === id)
    : demoStore.scanJobs[0];
  if (!job) return null;

  const elapsed = Date.now() - new Date(job.createdAt).getTime();
  const currentStep = Math.min(7, Math.max(1, Math.floor(elapsed / 650) + 1));
  const completed = currentStep >= 7;
  job.currentStep = currentStep;
  job.progress = completed ? 100 : Math.min(92, currentStep * 14);
  job.status = completed ? "COMPLETED" : "RUNNING";
  job.resultCount = completed ? demoStore.signals.length : Math.max(0, currentStep - 2);
  return job;
}

export function createOpportunityFromSignal(
  signalId: string,
  idempotencyKey: string,
) {
  const cached = demoStore.idempotency.get(idempotencyKey);
  if (cached) return cached as Opportunity;

  const existing = demoStore.opportunities.find(
    (item) => item.sourceSignalId === signalId,
  );
  if (existing) {
    demoStore.idempotency.set(idempotencyKey, existing);
    return existing;
  }

  const signal = demoStore.signals.find((item) => item.id === signalId);
  if (!signal) throw new Error("SIGNAL_NOT_FOUND");
  const company = demoStore.companies.find(
    (item) => item.id === signal.companyId,
  );
  if (!company) throw new Error("COMPANY_NOT_FOUND");
  const contact = demoStore.contacts.find(
    (item) => item.companyId === company.id,
  );

  const opportunity: Opportunity = {
    id: makeId("opp"),
    companyId: company.id,
    companyName: company.name,
    primaryContactId: contact?.id,
    primaryContactName: contact?.name,
    contactIds: contact ? [contact.id] : [],
    sourceSignalId: signal.id,
    name: signal.title.replace(/预告|信号|项目/g, "").trim(),
    source: signal.sourceName,
    industry: signal.industry,
    score: signal.score,
    estimatedAmount: Math.round((signal.score * 8500) / 10000) * 10000,
    currency: "CNY",
    probability: Math.max(20, signal.score - 35),
    stage: "NEW",
    owner: "林晓",
    nextAction: contact ? "验证决策人角色并准备首次触达" : "搜索目标决策人",
    expectedCloseDate: new Date(Date.now() + 75 * 86400000)
      .toISOString()
      .slice(0, 10),
    lastActivityAt: nowIso(),
    riskTags: contact ? ["需求待确认"] : ["决策人缺失"],
    isDemo: true,
    stageHistory: [
      {
        id: makeId("history"),
        toStage: "NEW",
        note: "由市场信号转入机会池",
        createdAt: nowIso(),
      },
    ],
  };
  demoStore.opportunities.unshift(opportunity);
  demoStore.idempotency.set(idempotencyKey, opportunity);
  return opportunity;
}

export function createOpportunity(input: {
  name: string;
  companyId: string;
  estimatedAmount?: number;
  source?: string;
  idempotencyKey: string;
}) {
  const cached = demoStore.idempotency.get(input.idempotencyKey);
  if (cached) return cached as Opportunity;
  const company = demoStore.companies.find(
    (item) => item.id === input.companyId,
  );
  if (!company) throw new Error("COMPANY_NOT_FOUND");
  const opportunity: Opportunity = {
    id: makeId("opp"),
    companyId: company.id,
    companyName: company.name,
    contactIds: [],
    name: input.name,
    source: input.source ?? "手动创建",
    industry: company.industry,
    score: 60,
    estimatedAmount: input.estimatedAmount ?? 0,
    currency: "CNY",
    probability: 20,
    stage: "NEW",
    owner: "林晓",
    nextAction: "补全关键联系人",
    expectedCloseDate: new Date(Date.now() + 90 * 86400000)
      .toISOString()
      .slice(0, 10),
    lastActivityAt: nowIso(),
    riskTags: ["信息不足"],
    isDemo: true,
    stageHistory: [],
  };
  demoStore.opportunities.unshift(opportunity);
  demoStore.idempotency.set(input.idempotencyKey, opportunity);
  return opportunity;
}

export function updateOpportunity(
  id: string,
  patch: Partial<
    Pick<
      Opportunity,
      | "stage"
      | "probability"
      | "nextAction"
      | "estimatedAmount"
      | "owner"
      | "primaryContactId"
      | "primaryContactName"
      | "contactIds"
    >
  >,
) {
  const opportunity = demoStore.opportunities.find((item) => item.id === id);
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  if (patch.stage && patch.stage !== opportunity.stage) {
    if (!OPPORTUNITY_STAGES.includes(patch.stage)) {
      throw new Error("INVALID_STAGE");
    }
    opportunity.stageHistory.unshift({
      id: makeId("history"),
      fromStage: opportunity.stage,
      toStage: patch.stage,
      note: "用户推进销售阶段",
      createdAt: nowIso(),
    });
    opportunity.lastActivityAt = nowIso();
  }
  Object.assign(opportunity, patch);
  return opportunity;
}

export function addContactToOpportunity(
  opportunityId: string,
  contactId: string,
) {
  const opportunity = demoStore.opportunities.find(
    (item) => item.id === opportunityId,
  );
  const contact = demoStore.contacts.find((item) => item.id === contactId);
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  if (!contact) throw new Error("CONTACT_NOT_FOUND");
  if (!opportunity.contactIds.includes(contactId)) {
    opportunity.contactIds.push(contactId);
  }
  opportunity.primaryContactId ??= contact.id;
  opportunity.primaryContactName ??= contact.name;
  opportunity.nextAction = "启动成交智能体，形成多角色推进策略";
  opportunity.lastActivityAt = nowIso();
  return opportunity;
}

export function createTask(input: {
  opportunityId?: string;
  title: string;
  dueAt?: string;
  description?: string;
  idempotencyKey: string;
}) {
  const cached = demoStore.idempotency.get(input.idempotencyKey);
  if (cached) return cached as FollowUpTask;
  const opportunity = input.opportunityId
    ? demoStore.opportunities.find((item) => item.id === input.opportunityId)
    : undefined;
  const task: FollowUpTask = {
    id: makeId("task"),
    opportunityId: opportunity?.id,
    opportunityName: opportunity?.name,
    title: input.title,
    description: input.description,
    dueAt:
      input.dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "PENDING",
    priority: "high",
    assignee: opportunity?.owner ?? "林晓",
  };
  demoStore.tasks.unshift(task);
  demoStore.idempotency.set(input.idempotencyKey, task);
  return task;
}

export function updateTask(
  id: string,
  patch: Partial<Pick<FollowUpTask, "status" | "dueAt" | "assignee">>,
) {
  const task = demoStore.tasks.find((item) => item.id === id);
  if (!task) throw new Error("TASK_NOT_FOUND");
  Object.assign(task, patch);
  return task;
}

export function createAgentAnalysis(opportunityId: string): AgentAnalysis {
  const opportunity = demoStore.opportunities.find(
    (item) => item.id === opportunityId,
  );
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  const company = demoStore.companies.find(
    (item) => item.id === opportunity.companyId,
  );
  const contacts = demoStore.contacts.filter((item) =>
    opportunity.contactIds.includes(item.id),
  );
  return buildAgentAnalysis(opportunity, company, contacts);
}

export function buildAgentAnalysis(
  opportunity: Opportunity,
  company: Company | undefined,
  contacts: Contact[],
): AgentAnalysis {
  const stakeholderCoverage = Math.min(90, 20 + contacts.length * 28);
  const probability = Math.min(
    88,
    Math.round(
      opportunity.score * 0.35 +
        stakeholderCoverage * 0.25 +
        (opportunity.stage === "NEED_CONFIRMED" ? 20 : 10),
    ),
  );
  opportunity.probability = probability;
  opportunity.lastActivityAt = nowIso();

  return {
    runId: makeId("agent"),
    mode: "demo",
    confidence: 82,
    customer: {
      profile: `${company?.name ?? opportunity.companyName} 是位于${company?.region ?? "目标市场"}的${opportunity.industry}企业，当前信号指向生产效率与柔性化升级。`,
      scenarios: ["小批量多品种生产", "柔性材料自动排版裁切", "产线数据回传"],
      demandStrength: opportunity.score >= 85 ? "强" : "中等偏强",
      urgency: opportunity.riskTags.includes("7天未推进")
        ? "需求存在，但推进节奏转弱"
        : "未来1—2个季度可能立项",
      budgetLikelihood:
        opportunity.estimatedAmount > 0 ? "存在预算窗口，金额仍需验证" : "未知",
      currentSolution: "可能使用刀模、人工排版或上一代单机设备，需在首次会议中确认。",
      painPoints: ["材料损耗难以量化", "换款准备时间长", "熟练工依赖", "交期波动"],
      alternatives: ["继续使用现有设备", "采购低价单机", "外包裁切工序"],
    },
    decisionChain: [
      {
        role: "业务发起人",
        likelyPerson: contacts[0]?.name ?? "生产总监（待确认）",
        influence: "定义节拍、质量与自动化目标",
        risk: contacts.length ? "已初步覆盖" : "尚未建立联系",
      },
      {
        role: "技术评估人",
        likelyPerson: "工艺或自动化经理（待搜索）",
        influence: "验证材料、软件与产线集成",
        risk: "未覆盖",
      },
      {
        role: "采购负责人",
        likelyPerson: "采购总监（待搜索）",
        influence: "供应商准入、商务条款与比价",
        risk: "未覆盖",
      },
      {
        role: "最终拍板人",
        likelyPerson: "工厂负责人 / COO（待确认）",
        influence: "批准预算和项目优先级",
        risk: "需由内部支持者引荐",
      },
    ],
    strategy: {
      entryAngle: "从材料利用率和换款时间切入，用可量化收益替代设备参数堆叠。",
      valueProposition:
        "在不增加熟练工的前提下，提高柔性产能并降低单件材料成本。",
      firstTouch: "发送一封短邮件，引用已发现的业务信号并邀请完成10分钟效率诊断。",
      sequence: [
        "生产负责人确认业务目标",
        "技术评估人完成材料与节拍验证",
        "采购负责人确认预算和采购流程",
        "决策人审阅ROI与落地计划",
      ],
      materials: ["同类行业ROI案例", "材料利用率测算表", "样品测试清单"],
      demo: "使用客户真实DXF与三种代表材料，展示排版、裁切和数据回传闭环。",
      pricing: "采用基础设备 + 软件/服务分项报价，提供按效率目标验收的可选条款。",
      breakthrough: "用免费样品测试换取材料数据、当前损耗率和技术评估人参与。",
      nextBestAction: "今天发送产能测算模板，并邀请生产与工艺负责人参加需求诊断。",
    },
    prediction: {
      probability,
      amount: opportunity.estimatedAmount,
      closeWindow: opportunity.expectedCloseDate,
      relationship: contacts.length ? 52 : 18,
      needClarity: opportunity.stage === "NEED_CONFIRMED" ? 72 : 43,
      stakeholderCoverage,
      budgetClarity: opportunity.estimatedAmount > 0 ? 48 : 15,
      competitionRisk: opportunity.riskTags.includes("竞品已接触") ? 71 : 38,
      stagnationRisk: opportunity.riskTags.includes("7天未推进") ? 76 : 31,
      rationale: [
        `需求信号得分 ${opportunity.score}/100，表明场景匹配度较高。`,
        `已覆盖 ${contacts.length} 位联系人，决策链覆盖率 ${stakeholderCoverage}%。`,
        `当前阶段为 ${opportunity.stage}，预算与技术验证仍是主要不确定项。`,
      ],
    },
  };
}

export function generateObjectionReply(objection: string) {
  const clean = sanitizeUserInput(objection);
  const price = /贵|价格|预算|price|expensive/i.test(clean);
  return {
    mode: "demo",
    objectionType: price ? "价格与价值异议" : "风险与优先级异议",
    realConcern: price
      ? "客户尚未建立总拥有成本与业务收益的比较基准，也可能在争取预算或测试议价空间。"
      : "客户尚未看到立即改变的必要性，或担心导入风险。",
    avoid:
      "不要立即打折，也不要只强调配置更高；这会强化客户只按采购价比较。",
    recommendedReply: price
      ? "理解您对投入的关注。为了确认这是不是单纯的价格问题，我们可以先用您当前的材料损耗、换款时间和产量做一次回收期测算。如果方案在约定周期内不能覆盖投入，我们也不建议您推进。您方便先给我三个基础数据吗？"
      : "理解您需要控制导入风险。我们可以先把成功标准和最小验证范围定义清楚，再决定是否扩大投入。",
    followUpQuestions: [
      "您目前比较的是初始采购价，还是包含材料、人工和停机时间的年度总成本？",
      "如果不升级，未来12个月最可能增加的成本是什么？",
      "内部可接受的投资回收周期是多少？",
    ],
    proof: ["同规模客户ROI案例", "真实材料样品测试", "分阶段验收计划"],
    nextAction: "预约20分钟ROI测算，邀请生产负责人和采购共同参加。",
  };
}

export function generateMessage(
  opportunityId: string,
  type: string,
  language: string,
) {
  const opportunity = demoStore.opportunities.find(
    (item) => item.id === opportunityId,
  );
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  return buildMessage(opportunity, type, language);
}

export function buildMessage(
  opportunity: Opportunity,
  type: string,
  language: string,
) {
  const contact =
    opportunity.primaryContactName ?? "Production Team";
  const english = language === "en" || type.includes("英文");
  return {
    mode: "demo",
    type,
    language,
    subject: english
      ? `A practical way to validate cutting efficiency at ${opportunity.companyName}`
      : `关于${opportunity.name}的效率测算建议`,
    content: english
      ? `Hi ${contact},\n\nWe noticed your team may be evaluating production flexibility and material utilization. Instead of starting with equipment specifications, we suggest a short benchmark using one of your real material files. It will show the potential impact on nesting yield, changeover time and labor dependency.\n\nWould a 20-minute scoping call next week be useful?\n\nBest regards`
      : `${contact}您好，\n\n结合贵司当前的${opportunity.name}，我们建议先不讨论设备参数，而是用一组真实材料数据完成效率测算，量化材料利用率、换款时间和人工依赖的改善空间。\n\n如果测算结果达不到预期，我们不会建议您继续投入。您看本周是否方便安排20分钟，让生产和工艺同事一起确认测试范围？`,
    guardrail:
      "内容基于演示数据生成；发送前请核对联系人、企业事实与合规要求。",
  };
}
