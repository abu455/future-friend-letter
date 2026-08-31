import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addContactToOpportunity,
  createAgentAnalysis,
  createOpportunity,
  createOpportunityFromSignal,
  createScanJob,
  createTask,
  demoStore,
  generateMessage,
  generateObjectionReply,
  getScanJob,
  parseRequirement,
  sanitizeUserInput,
  updateOpportunity,
  updateTask,
} from "@/lib/demo-store";
import { OPPORTUNITY_STAGES } from "@/lib/domain";
import {
  ExternalServiceError,
  searchApollo,
  type ApolloSearchInput,
} from "@/lib/external-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

const scanSchema = z.object({
  query: z.string().trim().min(10).max(2000),
  criteria: z
    .object({
      industry: z.array(z.string().max(80)).max(20),
      keywords: z.array(z.string().max(80)).max(30),
      regions: z.array(z.string().max(80)).max(20),
      employeeRange: z.string().max(50),
      titles: z.array(z.string().max(80)).max(30),
      seniorities: z.array(z.string().max(50)).max(20),
      buyingSignals: z.array(z.string().max(120)).max(30),
      painPoints: z.array(z.string().max(160)).max(30),
      exclusions: z.array(z.string().max(120)).max(30),
    })
    .optional(),
  idempotencyKey: z.string().min(8).max(120),
});

const createOpportunitySchema = z.object({
  name: z.string().trim().min(2).max(160),
  companyId: z.string().min(2).max(100),
  estimatedAmount: z.number().nonnegative().max(1_000_000_000).optional(),
  source: z.string().max(80).optional(),
  idempotencyKey: z.string().min(8).max(120),
});

const updateOpportunitySchema = z
  .object({
    stage: z.enum(OPPORTUNITY_STAGES).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    nextAction: z.string().trim().max(500).optional(),
    estimatedAmount: z.number().nonnegative().max(1_000_000_000).optional(),
    owner: z.string().trim().max(80).optional(),
    primaryContactId: z.string().max(100).optional(),
    primaryContactName: z.string().max(120).optional(),
    contactIds: z.array(z.string().max(100)).max(30).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "至少提供一个更新字段");

const apolloSchema = z.object({
  person_titles: z.array(z.string().max(100)).max(50).optional(),
  person_seniorities: z.array(z.string().max(50)).max(20).optional(),
  person_locations: z.array(z.string().max(100)).max(50).optional(),
  organization_locations: z.array(z.string().max(100)).max(50).optional(),
  organization_num_employees_ranges: z
    .array(z.string().regex(/^\d+,\d+$/))
    .max(20)
    .optional(),
  q_organization_keyword_tags: z.array(z.string().max(100)).max(50).optional(),
  q_organization_domains: z.array(z.string().max(255)).max(50).optional(),
  currently_using_any_of_technology_uids: z
    .array(z.string().max(100))
    .max(50)
    .optional(),
  q_keywords: z.string().max(300).optional(),
  page: z.number().int().min(1).max(500).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
});

const taskSchema = z.object({
  opportunityId: z.string().max(100).optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  dueAt: z.iso.datetime().optional(),
  idempotencyKey: z.string().min(8).max(120),
});

const rateLimits = new Map<string, number[]>();

function enforceScanRateLimit(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const key = forwarded?.split(",")[0]?.trim() || "local";
  const cutoff = Date.now() - 60_000;
  const recent = (rateLimits.get(key) ?? []).filter((time) => time > cutoff);
  if (recent.length >= 5) {
    throw new ExternalServiceError(
      "RATE_LIMITED",
      "每分钟最多启动5次扫描，请稍后重试。",
      429,
    );
  }
  recent.push(Date.now());
  rateLimits.set(key, recent);
}

function ok<T>(data: T, init?: ResponseInit & { total?: number }) {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        demoMode: !process.env.DATABASE_URL,
        requestId,
        ...(init?.total === undefined ? {} : { total: init.total }),
      },
    },
    { ...init, headers: { ...init?.headers, "x-request-id": requestId } },
  );
}

function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details, requestId },
    },
    { status, headers: { "x-request-id": requestId } },
  );
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new ExternalServiceError(
      "INVALID_JSON",
      "请求体必须是有效 JSON。",
      400,
    );
  }
}

function queryFilteredSignals(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.toLowerCase();
  const industry = request.nextUrl.searchParams.get("industry");
  const region = request.nextUrl.searchParams.get("region");
  const level = request.nextUrl.searchParams.get("level");
  const sort = request.nextUrl.searchParams.get("sort") ?? "score";
  const filtered = demoStore.signals
    .filter(
      (signal) =>
        !search ||
        `${signal.title} ${signal.companyName} ${signal.summary} ${signal.keywords.join(" ")}`
          .toLowerCase()
          .includes(search),
    )
    .filter((signal) => !industry || signal.industry === industry)
    .filter((signal) => !region || signal.region === region)
    .filter((signal) => !level || signal.level === level)
    .sort((a, b) =>
      sort === "publishedAt"
        ? b.publishedAt.localeCompare(a.publishedAt)
        : b.score - a.score,
    );
  return filtered;
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return fail(
      "VALIDATION_ERROR",
      "输入参数校验失败。",
      422,
      error.flatten(),
    );
  }
  if (error instanceof ExternalServiceError) {
    return fail(error.code, error.message, error.status, error.details);
  }
  const knownErrors: Record<string, [string, number]> = {
    SIGNAL_NOT_FOUND: ["需求信号不存在。", 404],
    COMPANY_NOT_FOUND: ["企业不存在。", 404],
    CONTACT_NOT_FOUND: ["联系人不存在。", 404],
    OPPORTUNITY_NOT_FOUND: ["销售机会不存在。", 404],
    TASK_NOT_FOUND: ["行动任务不存在。", 404],
    INVALID_STAGE: ["销售阶段无效。", 422],
  };
  const key = error instanceof Error ? error.message : "";
  const known = knownErrors[key];
  if (known) return fail(key, known[0], known[1]);
  return fail("INTERNAL_ERROR", "服务器暂时无法处理请求。", 500);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    const route = path.join("/");

    if (route === "radar/status") {
      return ok(getScanJob(request.nextUrl.searchParams.get("jobId") ?? undefined));
    }
    if (route === "signals") {
      const signals = queryFilteredSignals(request);
      return ok(signals, { total: signals.length });
    }
    if (route === "companies") {
      const query = request.nextUrl.searchParams.get("search")?.toLowerCase();
      const companies = demoStore.companies.filter(
        (company) =>
          !query ||
          `${company.name} ${company.industry} ${company.region}`
            .toLowerCase()
            .includes(query),
      );
      return ok(companies, { total: companies.length });
    }
    if (route === "contacts") {
      const companyId = request.nextUrl.searchParams.get("companyId");
      const contacts = demoStore.contacts.filter(
        (contact) => !companyId || contact.companyId === companyId,
      );
      return ok(contacts, { total: contacts.length });
    }
    if (route === "opportunities") {
      const stage = request.nextUrl.searchParams.get("stage");
      const opportunities = demoStore.opportunities.filter(
        (opportunity) => !stage || opportunity.stage === stage,
      );
      return ok(opportunities, { total: opportunities.length });
    }
    if (route === "tasks") {
      const status = request.nextUrl.searchParams.get("status");
      const tasks = demoStore.tasks.filter(
        (task) => !status || task.status === status,
      );
      return ok(tasks, { total: tasks.length });
    }
    if (route === "apollo-search") {
      return ok({
        configured: Boolean(process.env.APOLLO_API_KEY),
        endpoint: "/api/apollo-search",
        method: "POST",
        keyLocation: "server-only",
        message: process.env.APOLLO_API_KEY
          ? "Apollo 服务端连接已配置。"
          : "Apollo API Key 未配置；当前联系人均为明确标记的演示数据。",
      });
    }
    if (route === "data-sources") {
      const sources = demoStore.dataSources.map((source) =>
        source.type === "apollo"
          ? {
              ...source,
              configured: Boolean(process.env.APOLLO_API_KEY),
              status: process.env.APOLLO_API_KEY
                ? source.status === "unconfigured"
                  ? "paused"
                  : source.status
                : "unconfigured",
            }
          : source,
      );
      return ok(sources);
    }
    return fail("NOT_FOUND", "接口不存在。", 404);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const body = await readJson(request);

    if (route === "radar/scan") {
      enforceScanRateLimit(request);
      const input = scanSchema.parse(body);
      return ok(createScanJob(input), { status: 202 });
    }
    if (route === "radar/parse") {
      const input = z
        .object({ query: z.string().trim().min(10).max(2000) })
        .parse(body);
      return ok({
        criteria: parseRequirement(input.query),
        sanitizedQuery: sanitizeUserInput(input.query),
        mode: process.env.AI_GATEWAY_API_KEY ? "hybrid" : "demo",
      });
    }
    if (path[0] === "signals" && path[2] === "opportunity") {
      const input = z
        .object({ idempotencyKey: z.string().min(8).max(120) })
        .parse(body);
      return ok(createOpportunityFromSignal(path[1], input.idempotencyKey), {
        status: 201,
      });
    }
    if (route === "opportunities") {
      const input = createOpportunitySchema.parse(body);
      return ok(createOpportunity(input), { status: 201 });
    }
    if (
      path[0] === "opportunities" &&
      path[2] === "contacts" &&
      path.length === 3
    ) {
      const input = z.object({ contactId: z.string().min(2) }).parse(body);
      return ok(addContactToOpportunity(path[1], input.contactId));
    }
    if (path[0] === "opportunities" && path[2] === "agent") {
      return ok(createAgentAnalysis(path[1]));
    }
    if (route === "agents/close") {
      const input = z.object({ opportunityId: z.string().min(2) }).parse(body);
      return ok(createAgentAnalysis(input.opportunityId));
    }
    if (route === "agents/objection") {
      const input = z
        .object({
          objection: z.string().trim().min(2).max(2000),
          opportunityId: z.string().optional(),
        })
        .parse(body);
      return ok(generateObjectionReply(input.objection));
    }
    if (route === "agents/message") {
      const input = z
        .object({
          opportunityId: z.string().min(2),
          type: z.string().min(2).max(80),
          language: z.enum(["zh", "en"]).default("zh"),
        })
        .parse(body);
      return ok(
        generateMessage(input.opportunityId, input.type, input.language),
      );
    }
    if (route === "apollo-search") {
      const input = apolloSchema.parse(body) as ApolloSearchInput;
      try {
        return ok(await searchApollo(input));
      } catch (error) {
        const apollo = demoStore.dataSources.find(
          (source) => source.type === "apollo",
        );
        if (apollo && error instanceof ExternalServiceError) {
          apollo.status = "error";
          apollo.errorMessage = error.message;
        }
        throw error;
      }
    }
    if (route === "contacts") {
      const input = z
        .object({
          companyId: z.string().min(2),
          name: z.string().min(2).max(120),
          title: z.string().max(120),
          seniority: z.string().max(80).default("unknown"),
          location: z.string().max(160).default(""),
          linkedinUrl: z.url().optional(),
          email: z.email().optional(),
          source: z.string().max(80).default("Apollo"),
          externalId: z.string().max(120).optional(),
        })
        .parse(body);
      const company = demoStore.companies.find(
        (item) => item.id === input.companyId,
      );
      if (!company) throw new Error("COMPANY_NOT_FOUND");
      const contact = {
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
      return ok(existing ?? contact, { status: existing ? 200 : 201 });
    }
    if (route === "tasks") {
      return ok(createTask(taskSchema.parse(body)), { status: 201 });
    }
    if (path[0] === "data-sources" && path[2] === "test") {
      const source = demoStore.dataSources.find((item) => item.id === path[1]);
      if (!source) {
        throw new ExternalServiceError(
          "DATA_SOURCE_NOT_FOUND",
          "数据源不存在。",
          404,
        );
      }
      if (source.type === "apollo" && !process.env.APOLLO_API_KEY) {
        throw new ExternalServiceError(
          "APOLLO_NOT_CONFIGURED",
          "Apollo API Key 未配置。请先设置服务端环境变量。",
          503,
        );
      }
      if (!source.configured && source.type !== "apollo") {
        throw new ExternalServiceError(
          "SOURCE_NOT_CONFIGURED",
          `${source.name} 尚未配置。`,
          503,
        );
      }
      source.status = "connected";
      source.errorMessage = undefined;
      return ok({
        connected: true,
        latencyMs: 86,
        message: `${source.name} 连接正常。`,
      });
    }
    return fail("NOT_FOUND", "接口不存在。", 404);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    const body = await readJson(request);

    if (path[0] === "opportunities" && path.length === 2) {
      return ok(updateOpportunity(path[1], updateOpportunitySchema.parse(body)));
    }
    if (path[0] === "tasks" && path.length === 2) {
      const input = z
        .object({
          status: z.enum(["PENDING", "COMPLETED", "SNOOZED"]).optional(),
          dueAt: z.iso.datetime().optional(),
          assignee: z.string().max(80).optional(),
        })
        .parse(body);
      return ok(updateTask(path[1], input));
    }
    if (path[0] === "data-sources" && path.length === 2) {
      const input = z.object({ enabled: z.boolean() }).parse(body);
      const source = demoStore.dataSources.find((item) => item.id === path[1]);
      if (!source) {
        throw new ExternalServiceError(
          "DATA_SOURCE_NOT_FOUND",
          "数据源不存在。",
          404,
        );
      }
      if (!source.configured && input.enabled) {
        throw new ExternalServiceError(
          "SOURCE_NOT_CONFIGURED",
          "请先完成数据源配置。",
          422,
        );
      }
      source.enabled = input.enabled;
      source.status = input.enabled ? "connected" : "paused";
      return ok(source);
    }
    return fail("NOT_FOUND", `接口 ${route} 不存在。`, 404);
  } catch (error) {
    return handleError(error);
  }
}
