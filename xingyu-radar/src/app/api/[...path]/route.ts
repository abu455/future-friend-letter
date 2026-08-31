import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateObjectionReply,
  parseRequirement,
  sanitizeUserInput,
} from "@/lib/demo-store";
import { OPPORTUNITY_STAGES } from "@/lib/domain";
import {
  ExternalServiceError,
  invokeCompatibleModel,
  searchApollo,
  type ApolloSearchInput,
} from "@/lib/external-services";
import {
  addContact,
  createAgentRun,
  createContact,
  createOpportunityFromSignal,
  createOpportunityRecord,
  createScan,
  createTaskRecord,
  generateMessageRecord,
  getScan,
  isDemoMode,
  listCompanies,
  listContacts,
  listDataSources,
  listOpportunities,
  listSignals,
  listTasks,
  recordDataSourceTest,
  updateDataSource,
  updateOpportunityRecord,
  updateTaskRecord,
} from "@/lib/repository";

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
        demoMode: isDemoMode(),
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
    DATA_SOURCE_NOT_FOUND: ["数据源不存在。", 404],
    SOURCE_NOT_CONFIGURED: ["请先完成数据源配置。", 422],
  };
  const key = error instanceof Error ? error.message : "";
  const known = knownErrors[key];
  if (known) return fail(key, known[0], known[1]);
  return fail("INTERNAL_ERROR", "服务器暂时无法处理请求。", 500);
}

async function runOpportunityAgent(opportunityId: string) {
  const baseline = await createAgentRun(opportunityId);
  const live = await invokeCompatibleModel(
    "你是工业设备 B2B 销售策略专家。基于可信结构化数据优化成交策略。返回字段：valueProposition（字符串）、nextBestAction（字符串）、rationale（三条字符串数组）。不得虚构联系人、预算、邮箱或电话。",
    { baseline },
  );
  if (!live) return baseline;
  const parsed = z
    .object({
      valueProposition: z.string().min(10).max(1000),
      nextBestAction: z.string().min(10).max(1000),
      rationale: z.array(z.string().min(5).max(500)).length(3),
    })
    .safeParse(live);
  if (!parsed.success) {
    throw new ExternalServiceError(
      "AI_INVALID_RESPONSE",
      "AI 服务返回的成交策略结构无效。",
      502,
      parsed.error.flatten(),
    );
  }
  baseline.mode = "live";
  baseline.strategy.valueProposition = parsed.data.valueProposition;
  baseline.strategy.nextBestAction = parsed.data.nextBestAction;
  baseline.prediction.rationale = parsed.data.rationale;
  return baseline;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    const route = path.join("/");

    if (route === "radar/status") {
      return ok(await getScan(request.nextUrl.searchParams.get("jobId") ?? undefined));
    }
    if (route === "signals") {
      const signals = await listSignals({
        search: request.nextUrl.searchParams.get("search") ?? undefined,
        industry: request.nextUrl.searchParams.get("industry") ?? undefined,
        region: request.nextUrl.searchParams.get("region") ?? undefined,
        level: request.nextUrl.searchParams.get("level") ?? undefined,
        sort: request.nextUrl.searchParams.get("sort") ?? undefined,
      });
      return ok(signals, { total: signals.length });
    }
    if (route === "companies") {
      const companies = await listCompanies(
        request.nextUrl.searchParams.get("search") ?? undefined,
      );
      return ok(companies, { total: companies.length });
    }
    if (route === "contacts") {
      const companyId = request.nextUrl.searchParams.get("companyId");
      const contacts = await listContacts(companyId ?? undefined);
      return ok(contacts, { total: contacts.length });
    }
    if (route === "opportunities") {
      const stage = request.nextUrl.searchParams.get("stage");
      const opportunities = await listOpportunities(stage ?? undefined);
      return ok(opportunities, { total: opportunities.length });
    }
    if (route === "tasks") {
      const status = request.nextUrl.searchParams.get("status");
      const tasks = await listTasks(status ?? undefined);
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
      const sources = (await listDataSources()).map((source) =>
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
      return ok(await createScan(input), { status: 202 });
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
      return ok(
        await createOpportunityFromSignal(path[1], input.idempotencyKey),
        { status: 201 },
      );
    }
    if (route === "opportunities") {
      const input = createOpportunitySchema.parse(body);
      return ok(await createOpportunityRecord(input), { status: 201 });
    }
    if (
      path[0] === "opportunities" &&
      path[2] === "contacts" &&
      path.length === 3
    ) {
      const input = z.object({ contactId: z.string().min(2) }).parse(body);
      return ok(await addContact(path[1], input.contactId));
    }
    if (path[0] === "opportunities" && path[2] === "agent") {
      return ok(await runOpportunityAgent(path[1]));
    }
    if (route === "agents/close") {
      const input = z.object({ opportunityId: z.string().min(2) }).parse(body);
      return ok(await runOpportunityAgent(input.opportunityId));
    }
    if (route === "agents/objection") {
      const input = z
        .object({
          objection: z.string().trim().min(2).max(2000),
          opportunityId: z.string().optional(),
        })
        .parse(body);
      const baseline = generateObjectionReply(input.objection);
      const live = await invokeCompatibleModel(
        "你是工业设备 B2B 销售教练。基于给定异议和基线建议优化回复。返回与 baseline 完全相同的 JSON 字段，不得承诺未经证实的事实。",
        { objection: sanitizeUserInput(input.objection), baseline },
      );
      return ok(
        live && typeof live === "object"
          ? { ...baseline, ...live, mode: "live" }
          : baseline,
      );
    }
    if (route === "agents/message") {
      const input = z
        .object({
          opportunityId: z.string().min(2),
          type: z.string().min(2).max(80),
          language: z.enum(["zh", "en"]).default("zh"),
        })
        .parse(body);
      const baseline = await generateMessageRecord(
        input.opportunityId,
        input.type,
        input.language,
      );
      const live = await invokeCompatibleModel(
        "你是工业设备 B2B 销售文案专家。根据基线事实优化触达内容。只返回 subject 和 content 字符串；不得虚构客户事实、联系方式、承诺或案例数据。",
        { type: input.type, language: input.language, baseline },
      );
      const parsed = z
        .object({
          subject: z.string().max(300),
          content: z.string().min(10).max(5000),
        })
        .safeParse(live);
      return ok(
        live && parsed.success
          ? {
              ...baseline,
              ...parsed.data,
              mode: "live",
              guardrail: "内容由已配置 AI 服务生成；发送前请人工核对事实与合规要求。",
            }
          : baseline,
      );
    }
    if (route === "apollo-search") {
      const input = apolloSchema.parse(body) as ApolloSearchInput;
      try {
        return ok(await searchApollo(input));
      } catch (error) {
        const apollo = (await listDataSources()).find(
          (source) => source.type === "apollo",
        );
        if (apollo && error instanceof ExternalServiceError) {
          await recordDataSourceTest(apollo.id, {
            connected: false,
            errorMessage: error.message,
          });
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
      return ok(await createContact(input), { status: 201 });
    }
    if (route === "tasks") {
      return ok(await createTaskRecord(taskSchema.parse(body)), { status: 201 });
    }
    if (path[0] === "data-sources" && path[2] === "test") {
      const source = (await listDataSources()).find((item) => item.id === path[1]);
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
      await recordDataSourceTest(source.id, { connected: true });
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
      return ok(
        await updateOpportunityRecord(
          path[1],
          updateOpportunitySchema.parse(body),
        ),
      );
    }
    if (path[0] === "tasks" && path.length === 2) {
      const input = z
        .object({
          status: z.enum(["PENDING", "COMPLETED", "SNOOZED"]).optional(),
          dueAt: z.iso.datetime().optional(),
          assignee: z.string().max(80).optional(),
        })
        .parse(body);
      return ok(await updateTaskRecord(path[1], input));
    }
    if (path[0] === "data-sources" && path.length === 2) {
      const input = z.object({ enabled: z.boolean() }).parse(body);
      return ok(await updateDataSource(path[1], input.enabled));
    }
    return fail("NOT_FOUND", `接口 ${route} 不存在。`, 404);
  } catch (error) {
    return handleError(error);
  }
}
