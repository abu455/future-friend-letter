import { PrismaPg } from "@prisma/adapter-pg";
import {
  Prisma,
  PrismaClient,
  type OpportunityStage as PrismaOpportunityStage,
  type SignalLevel as PrismaSignalLevel,
  type TaskStatus as PrismaTaskStatus,
} from "@/generated/prisma/client";
import {
  addContactToOpportunity as addDemoContact,
  buildAgentAnalysis,
  buildMessage,
  createAgentAnalysis as createDemoAgentAnalysis,
  createOpportunity as createDemoOpportunity,
  createOpportunityFromSignal as createDemoOpportunityFromSignal,
  createScanJob as createDemoScanJob,
  createTask as createDemoTask,
  demoStore,
  getScanJob as getDemoScanJob,
  updateOpportunity as updateDemoOpportunity,
  updateTask as updateDemoTask,
} from "@/lib/demo-store";
import type {
  Company,
  Contact,
  DataSource,
  FollowUpTask,
  MarketSignal,
  Opportunity,
  OpportunityStage,
  ScanCriteria,
  ScanJob,
} from "@/lib/domain";

const WORKSPACE_ID = "demo-workspace";
const DEFAULT_USER_ID = "demo-user";
const connectionString = process.env.DATABASE_URL?.trim();

const globalDatabase = globalThis as typeof globalThis & {
  __xingyuPrisma?: PrismaClient;
};

export const prisma = connectionString
  ? (globalDatabase.__xingyuPrisma ??=
      new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      }))
  : null;

export const isDemoMode = () => !prisma;

const opportunityInclude = {
  company: true,
  primaryContact: true,
  owner: true,
  contacts: { include: { contact: true } },
  stageHistory: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.OpportunityInclude;

type DatabaseOpportunity = Prisma.OpportunityGetPayload<{
  include: typeof opportunityInclude;
}>;

function mapOpportunity(item: DatabaseOpportunity): Opportunity {
  return {
    id: item.id,
    companyId: item.companyId,
    companyName: item.company.name,
    primaryContactId: item.primaryContactId ?? undefined,
    primaryContactName: item.primaryContact?.name ?? undefined,
    contactIds: item.contacts.map((relation) => relation.contactId),
    sourceSignalId: item.sourceSignalId ?? undefined,
    name: item.name,
    source: item.source,
    industry: item.industry,
    score: item.score,
    estimatedAmount: Number(item.estimatedAmount),
    currency:
      item.currency === "USD" || item.currency === "EUR"
        ? item.currency
        : "CNY",
    probability: item.probability,
    stage: item.stage as OpportunityStage,
    owner: item.owner?.name ?? "未分配",
    nextAction: item.nextAction ?? "补全下一步行动",
    expectedCloseDate:
      item.expectedCloseDate?.toISOString().slice(0, 10) ?? "",
    lastActivityAt: item.lastActivityAt?.toISOString() ?? item.updatedAt.toISOString(),
    riskTags: item.riskTags,
    isDemo: item.isDemo,
    stageHistory: item.stageHistory.map((history) => ({
      id: history.id,
      fromStage: history.fromStage
        ? (history.fromStage as OpportunityStage)
        : undefined,
      toStage: history.toStage as OpportunityStage,
      note: history.note ?? "",
      createdAt: history.createdAt.toISOString(),
    })),
  };
}

function mapContact(item: {
  id: string;
  companyId: string;
  name: string;
  title: string;
  seniority: string | null;
  location: string | null;
  linkedinUrl: string | null;
  email: string | null;
  phone: string | null;
  needsEnrichment: boolean;
  source: string;
  isDemo: boolean;
}): Contact {
  return {
    id: item.id,
    companyId: item.companyId,
    name: item.name,
    title: item.title,
    seniority: item.seniority ?? "unknown",
    location: item.location ?? "",
    linkedinUrl: item.linkedinUrl ?? undefined,
    email: item.email ?? undefined,
    phone: item.phone ?? undefined,
    needsEnrichment: item.needsEnrichment,
    source: item.source,
    isDemo: item.isDemo,
  };
}

function mapCompany(item: {
  id: string;
  name: string;
  domain: string | null;
  industry: string;
  region: string;
  employeeRange: string | null;
  description: string | null;
  technologies: string[];
  isDemo: boolean;
}): Company {
  return {
    id: item.id,
    name: item.name,
    domain: item.domain ?? undefined,
    industry: item.industry,
    region: item.region,
    employeeRange: item.employeeRange ?? undefined,
    description: item.description ?? undefined,
    technologies: item.technologies,
    isDemo: item.isDemo,
  };
}

export async function listSignals(filters: {
  search?: string;
  industry?: string;
  region?: string;
  level?: string;
  sort?: string;
}): Promise<MarketSignal[]> {
  if (!prisma) {
    return demoStore.signals
      .filter(
        (signal) =>
          !filters.search ||
          `${signal.title} ${signal.companyName} ${signal.summary} ${signal.keywords.join(" ")}`
            .toLowerCase()
            .includes(filters.search.toLowerCase()),
      )
      .filter((signal) => !filters.industry || signal.industry === filters.industry)
      .filter((signal) => !filters.region || signal.region === filters.region)
      .filter((signal) => !filters.level || signal.level === filters.level)
      .sort((a, b) =>
        filters.sort === "publishedAt"
          ? b.publishedAt.localeCompare(a.publishedAt)
          : b.score - a.score,
      );
  }
  const items = await prisma.marketSignal.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      ignored: false,
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: "insensitive" } },
              { summary: { contains: filters.search, mode: "insensitive" } },
              { company: { name: { contains: filters.search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(filters.industry ? { industry: filters.industry } : {}),
      ...(filters.region ? { region: filters.region } : {}),
      ...(filters.level
        ? { level: filters.level as PrismaSignalLevel }
        : {}),
    },
    include: { company: true },
    orderBy:
      filters.sort === "publishedAt"
        ? { publishedAt: "desc" }
        : { score: "desc" },
  });
  return items.map((item, index) => ({
    id: item.id,
    companyId: item.companyId ?? undefined,
    companyName: item.company?.name ?? "待匹配企业",
    title: item.title,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl ?? undefined,
    industry: item.industry,
    region: item.region,
    summary: item.summary,
    keywords: item.keywords,
    intensity: item.intensity,
    urgency: item.urgency,
    confidence: item.confidence,
    score: item.score,
    level: item.level,
    recommendation: item.recommendation,
    publishedAt: item.publishedAt.toISOString(),
    isDemo: item.isDemo,
    x: 28 + ((item.score * 17 + index * 13) % 45),
    y: 28 + ((item.score * 11 + index * 19) % 43),
  }));
}

export async function listCompanies(search?: string): Promise<Company[]> {
  if (!prisma) {
    return demoStore.companies.filter(
      (company) =>
        !search ||
        `${company.name} ${company.industry} ${company.region}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  }
  const items = await prisma.company.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { industry: { contains: search, mode: "insensitive" } },
              { region: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  return items.map(mapCompany);
}

export async function listContacts(companyId?: string): Promise<Contact[]> {
  if (!prisma) {
    return demoStore.contacts.filter(
      (contact) => !companyId || contact.companyId === companyId,
    );
  }
  const items = await prisma.contact.findMany({
    where: { workspaceId: WORKSPACE_ID, ...(companyId ? { companyId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return items.map(mapContact);
}

export async function listOpportunities(stage?: string): Promise<Opportunity[]> {
  if (!prisma) {
    return demoStore.opportunities.filter(
      (opportunity) => !stage || opportunity.stage === stage,
    );
  }
  const items = await prisma.opportunity.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      ...(stage ? { stage: stage as PrismaOpportunityStage } : {}),
    },
    include: opportunityInclude,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
  return items.map(mapOpportunity);
}

export async function listTasks(status?: string): Promise<FollowUpTask[]> {
  if (!prisma) {
    return demoStore.tasks.filter((task) => !status || task.status === status);
  }
  const items = await prisma.followUpTask.findMany({
    where: {
      workspaceId: WORKSPACE_ID,
      ...(status ? { status: status as PrismaTaskStatus } : {}),
    },
    include: { opportunity: true, assignee: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
  return items.map((item) => ({
    id: item.id,
    opportunityId: item.opportunityId ?? undefined,
    opportunityName: item.opportunity?.name ?? undefined,
    title: item.title,
    description: item.description ?? undefined,
    dueAt: item.dueAt.toISOString(),
    status: item.status,
    priority:
      item.priority === "high" || item.priority === "low"
        ? item.priority
        : "medium",
    assignee: item.assignee?.name ?? "未分配",
  }));
}

export async function listDataSources(): Promise<DataSource[]> {
  if (!prisma) return demoStore.dataSources;
  const items = await prisma.dataSource.findMany({
    where: { workspaceId: WORKSPACE_ID },
    orderBy: { createdAt: "asc" },
  });
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    status:
      item.status === "connected" ||
      item.status === "error" ||
      item.status === "unconfigured"
        ? item.status
        : "paused",
    configured: item.configured,
    enabled: item.enabled,
    lastScannedAt: item.lastScannedAt?.toISOString(),
    discovered: item.discovered,
    errorMessage: item.errorMessage ?? undefined,
    usageCurrent: item.usageCurrent,
    usageLimit: item.usageLimit ?? undefined,
  }));
}

export async function createScan(input: {
  query: string;
  criteria?: ScanCriteria;
  idempotencyKey: string;
}): Promise<ScanJob> {
  if (!prisma) return createDemoScanJob(input);
  const item = await prisma.scanJob.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      workspaceId: WORKSPACE_ID,
      query: input.query,
      criteria: (input.criteria ?? {}) as Prisma.InputJsonValue,
      status: "RUNNING",
      progress: 5,
      currentStep: 1,
      idempotencyKey: input.idempotencyKey,
      startedAt: new Date(),
    },
  });
  return {
    id: item.id,
    query: item.query,
    criteria: item.criteria as unknown as ScanCriteria,
    status: item.status,
    progress: item.progress,
    currentStep: item.currentStep,
    resultCount: item.resultCount,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function getScan(id?: string): Promise<ScanJob | null> {
  if (!prisma) return getDemoScanJob(id);
  const item = id
    ? await prisma.scanJob.findUnique({ where: { id } })
    : await prisma.scanJob.findFirst({
        where: { workspaceId: WORKSPACE_ID },
        orderBy: { createdAt: "desc" },
      });
  if (!item) return null;
  const elapsed = Date.now() - item.createdAt.getTime();
  const currentStep = Math.min(7, Math.max(1, Math.floor(elapsed / 650) + 1));
  const completed = currentStep >= 7;
  const updated = await prisma.scanJob.update({
    where: { id: item.id },
    data: {
      currentStep,
      progress: completed ? 100 : Math.min(92, currentStep * 14),
      status: completed ? "COMPLETED" : "RUNNING",
      resultCount: completed
        ? await prisma.marketSignal.count({
            where: { workspaceId: WORKSPACE_ID, ignored: false },
          })
        : Math.max(0, currentStep - 2),
      completedAt: completed ? new Date() : undefined,
    },
  });
  return {
    id: updated.id,
    query: updated.query,
    criteria: updated.criteria as unknown as ScanCriteria,
    status: updated.status,
    progress: updated.progress,
    currentStep: updated.currentStep,
    resultCount: updated.resultCount,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function createOpportunityFromSignal(
  signalId: string,
  idempotencyKey: string,
) {
  if (!prisma) return createDemoOpportunityFromSignal(signalId, idempotencyKey);
  const byKey = await prisma.opportunity.findUnique({
    where: { idempotencyKey },
    include: opportunityInclude,
  });
  if (byKey) return mapOpportunity(byKey);
  const existing = await prisma.opportunity.findFirst({
    where: { workspaceId: WORKSPACE_ID, sourceSignalId: signalId },
    include: opportunityInclude,
  });
  if (existing) return mapOpportunity(existing);
  const signal = await prisma.marketSignal.findUnique({
    where: { id: signalId },
    include: { company: { include: { contacts: { take: 1 } } } },
  });
  if (!signal) throw new Error("SIGNAL_NOT_FOUND");
  if (!signal.company) throw new Error("COMPANY_NOT_FOUND");
  const contact = signal.company.contacts[0];
  const created = await prisma.opportunity.create({
    data: {
      workspaceId: WORKSPACE_ID,
      companyId: signal.company.id,
      primaryContactId: contact?.id,
      sourceSignalId: signal.id,
      ownerId: DEFAULT_USER_ID,
      name: signal.title.replace(/预告|信号|项目/g, "").trim(),
      source: signal.sourceName,
      industry: signal.industry,
      score: signal.score,
      estimatedAmount: Math.round((signal.score * 8500) / 10000) * 10000,
      probability: Math.max(20, signal.score - 35),
      stage: "NEW",
      nextAction: contact ? "验证决策人角色并准备首次触达" : "搜索目标决策人",
      expectedCloseDate: new Date(Date.now() + 75 * 86400000),
      lastActivityAt: new Date(),
      riskTags: contact ? ["需求待确认"] : ["决策人缺失"],
      isDemo: signal.isDemo,
      idempotencyKey,
      ...(contact
        ? {
            contacts: {
              create: { contactId: contact.id, role: "primary" },
            },
          }
        : {}),
      stageHistory: {
        create: { toStage: "NEW", note: "由市场信号转入机会池" },
      },
    },
    include: opportunityInclude,
  });
  return mapOpportunity(created);
}

export async function createOpportunityRecord(input: {
  name: string;
  companyId: string;
  estimatedAmount?: number;
  source?: string;
  idempotencyKey: string;
}) {
  if (!prisma) return createDemoOpportunity(input);
  const company = await prisma.company.findUnique({ where: { id: input.companyId } });
  if (!company) throw new Error("COMPANY_NOT_FOUND");
  const item = await prisma.opportunity.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      workspaceId: WORKSPACE_ID,
      companyId: company.id,
      ownerId: DEFAULT_USER_ID,
      name: input.name,
      source: input.source ?? "手动创建",
      industry: company.industry,
      score: 60,
      estimatedAmount: input.estimatedAmount ?? 0,
      probability: 20,
      nextAction: "补全关键联系人",
      expectedCloseDate: new Date(Date.now() + 90 * 86400000),
      lastActivityAt: new Date(),
      riskTags: ["信息不足"],
      idempotencyKey: input.idempotencyKey,
      stageHistory: {
        create: { toStage: "NEW", note: "手动创建机会" },
      },
    },
    include: opportunityInclude,
  });
  return mapOpportunity(item);
}

export async function updateOpportunityRecord(
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
  if (!prisma) return updateDemoOpportunity(id, patch);
  const current = await prisma.opportunity.findUnique({ where: { id } });
  if (!current) throw new Error("OPPORTUNITY_NOT_FOUND");
  if (patch.stage && patch.stage !== current.stage) {
    await prisma.opportunityStageHistory.create({
      data: {
        opportunityId: id,
        fromStage: current.stage,
        toStage: patch.stage,
        note: "用户推进销售阶段",
      },
    });
  }
  const item = await prisma.opportunity.update({
    where: { id },
    data: {
      ...(patch.stage ? { stage: patch.stage } : {}),
      ...(patch.probability === undefined
        ? {}
        : { probability: patch.probability }),
      ...(patch.nextAction === undefined ? {} : { nextAction: patch.nextAction }),
      ...(patch.estimatedAmount === undefined
        ? {}
        : { estimatedAmount: patch.estimatedAmount }),
      ...(patch.primaryContactId === undefined
        ? {}
        : { primaryContactId: patch.primaryContactId }),
      lastActivityAt: patch.stage ? new Date() : undefined,
    },
    include: opportunityInclude,
  });
  return mapOpportunity(item);
}

export async function addContact(opportunityId: string, contactId: string) {
  if (!prisma) return addDemoContact(opportunityId, contactId);
  const [opportunity, contact] = await Promise.all([
    prisma.opportunity.findUnique({ where: { id: opportunityId } }),
    prisma.contact.findUnique({ where: { id: contactId } }),
  ]);
  if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  if (!contact) throw new Error("CONTACT_NOT_FOUND");
  await prisma.opportunityContact.upsert({
    where: { opportunityId_contactId: { opportunityId, contactId } },
    update: {},
    create: { opportunityId, contactId, role: "stakeholder" },
  });
  const updated = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      primaryContactId: opportunity.primaryContactId ?? contactId,
      nextAction: "启动成交智能体，形成多角色推进策略",
      lastActivityAt: new Date(),
    },
    include: opportunityInclude,
  });
  return mapOpportunity(updated);
}

export async function createContact(input: {
  companyId: string;
  name: string;
  title: string;
  seniority: string;
  location: string;
  linkedinUrl?: string;
  email?: string;
  source: string;
  externalId?: string;
}) {
  if (!prisma) {
    const contact: Contact = {
      id: input.externalId
        ? `apollo-${input.externalId}`
        : `ct-${crypto.randomUUID().slice(0, 8)}`,
      companyId: input.companyId,
      name: input.name,
      title: input.title,
      seniority: input.seniority,
      location: input.location,
      linkedinUrl: input.linkedinUrl,
      email: input.email,
      needsEnrichment: !input.email,
      source: input.source,
      isDemo: !process.env.APOLLO_API_KEY,
    };
    const existing = demoStore.contacts.find((item) => item.id === contact.id);
    if (!existing) demoStore.contacts.unshift(contact);
    return existing ?? contact;
  }
  const company = await prisma.company.findUnique({ where: { id: input.companyId } });
  if (!company) throw new Error("COMPANY_NOT_FOUND");
  const id = input.externalId
    ? `apollo-${input.externalId}`
    : `ct-${crypto.randomUUID().slice(0, 8)}`;
  const item = await prisma.contact.upsert({
    where: { id },
    update: {},
    create: {
      id,
      workspaceId: WORKSPACE_ID,
      companyId: input.companyId,
      name: input.name,
      title: input.title,
      seniority: input.seniority,
      location: input.location,
      linkedinUrl: input.linkedinUrl,
      email: input.email,
      needsEnrichment: !input.email,
      source: input.source,
      isDemo: false,
    },
  });
  return mapContact(item);
}

export async function createTaskRecord(input: {
  opportunityId?: string;
  title: string;
  dueAt?: string;
  description?: string;
  idempotencyKey: string;
}) {
  if (!prisma) return createDemoTask(input);
  const item = await prisma.followUpTask.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      workspaceId: WORKSPACE_ID,
      opportunityId: input.opportunityId,
      assigneeId: DEFAULT_USER_ID,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt
        ? new Date(input.dueAt)
        : new Date(Date.now() + 86400000),
      priority: "high",
      idempotencyKey: input.idempotencyKey,
    },
    include: { opportunity: true, assignee: true },
  });
  return {
    id: item.id,
    opportunityId: item.opportunityId ?? undefined,
    opportunityName: item.opportunity?.name ?? undefined,
    title: item.title,
    description: item.description ?? undefined,
    dueAt: item.dueAt.toISOString(),
    status: item.status,
    priority: "high" as const,
    assignee: item.assignee?.name ?? "未分配",
  };
}

export async function updateTaskRecord(
  id: string,
  patch: Partial<Pick<FollowUpTask, "status" | "dueAt" | "assignee">>,
) {
  if (!prisma) return updateDemoTask(id, patch);
  const current = await prisma.followUpTask.findUnique({ where: { id } });
  if (!current) throw new Error("TASK_NOT_FOUND");
  const item = await prisma.followUpTask.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.dueAt ? { dueAt: new Date(patch.dueAt) } : {}),
      completedAt: patch.status === "COMPLETED" ? new Date() : undefined,
    },
    include: { opportunity: true, assignee: true },
  });
  return {
    id: item.id,
    opportunityId: item.opportunityId ?? undefined,
    opportunityName: item.opportunity?.name ?? undefined,
    title: item.title,
    description: item.description ?? undefined,
    dueAt: item.dueAt.toISOString(),
    status: item.status,
    priority:
      item.priority === "high" || item.priority === "low"
        ? item.priority
        : ("medium" as const),
    assignee: item.assignee?.name ?? "未分配",
  };
}

export async function createAgentRun(opportunityId: string) {
  if (!prisma) return createDemoAgentAnalysis(opportunityId);
  const databaseOpportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: opportunityInclude,
  });
  if (!databaseOpportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
  const opportunity = mapOpportunity(databaseOpportunity);
  const contacts = databaseOpportunity.contacts.map((relation) =>
    mapContact(relation.contact),
  );
  const analysis = buildAgentAnalysis(
    opportunity,
    mapCompany(databaseOpportunity.company),
    contacts,
  );
  const run = await prisma.agentRun.create({
    data: {
      workspaceId: WORKSPACE_ID,
      opportunityId,
      type: "close",
      status: "COMPLETED",
      model: process.env.AI_MODEL ?? "deterministic-baseline",
      input: {
        opportunityId,
        score: opportunity.score,
        contactCount: contacts.length,
      },
      output: analysis as unknown as Prisma.InputJsonValue,
      confidence: analysis.confidence,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      probability: analysis.prediction.probability,
      lastActivityAt: new Date(),
    },
  });
  analysis.runId = run.id;
  analysis.mode = process.env.AI_GATEWAY_API_KEY ? "live" : "demo";
  return analysis;
}

export async function generateMessageRecord(
  opportunityId: string,
  type: string,
  language: string,
) {
  if (!prisma) {
    const opportunity = demoStore.opportunities.find(
      (item) => item.id === opportunityId,
    );
    if (!opportunity) throw new Error("OPPORTUNITY_NOT_FOUND");
    return buildMessage(opportunity, type, language);
  }
  const item = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: opportunityInclude,
  });
  if (!item) throw new Error("OPPORTUNITY_NOT_FOUND");
  return buildMessage(mapOpportunity(item), type, language);
}

export async function updateDataSource(id: string, enabled: boolean) {
  if (!prisma) {
    const source = demoStore.dataSources.find((item) => item.id === id);
    if (!source) throw new Error("DATA_SOURCE_NOT_FOUND");
    if (!source.configured && enabled) throw new Error("SOURCE_NOT_CONFIGURED");
    source.enabled = enabled;
    source.status = enabled ? "connected" : "paused";
    return source;
  }
  const source = await prisma.dataSource.findUnique({ where: { id } });
  if (!source) throw new Error("DATA_SOURCE_NOT_FOUND");
  if (!source.configured && enabled) throw new Error("SOURCE_NOT_CONFIGURED");
  await prisma.dataSource.update({
    where: { id },
    data: { enabled, status: enabled ? "connected" : "paused" },
  });
  return (await listDataSources()).find((item) => item.id === id)!;
}

export async function recordDataSourceTest(
  id: string,
  result: { connected: boolean; errorMessage?: string },
) {
  if (!prisma) {
    const source = demoStore.dataSources.find((item) => item.id === id);
    if (!source) throw new Error("DATA_SOURCE_NOT_FOUND");
    source.status = result.connected ? "connected" : "error";
    source.errorMessage = result.errorMessage;
    return source;
  }
  const source = await prisma.dataSource.update({
    where: { id },
    data: {
      status: result.connected ? "connected" : "error",
      errorMessage: result.errorMessage,
    },
  });
  return source;
}
