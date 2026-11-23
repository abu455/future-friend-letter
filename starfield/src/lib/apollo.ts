import { AppError, ErrorCodes } from "./errors";
import { hasApolloKey, maskSecret } from "./env";
import { prisma } from "./db";
import { getWorkspace } from "./workspace";
import type { z } from "zod";
import type { apolloSearchSchema } from "./validators";

export type ApolloSearchInput = z.infer<typeof apolloSearchSchema>;

export type ApolloPerson = {
  id: string;
  name: string;
  title: string;
  seniority: string | null;
  organization: string;
  domain: string | null;
  location: string | null;
  linkedinUrl: string | null;
  email: string | null;
  phone: string | null;
  enrichmentStatus: "available" | "needs_enrichment";
  isDemo: boolean;
  headline: string | null;
};

function appendArrayParam(params: URLSearchParams, key: string, values?: string[]) {
  if (!values) return;
  for (const value of values) {
    if (value.trim()) params.append(`${key}[]`, value.trim());
  }
}

export function buildApolloQuery(input: ApolloSearchInput) {
  const params = new URLSearchParams();
  if (input.q_keywords) params.set("q_keywords", input.q_keywords);
  appendArrayParam(params, "person_titles", input.person_titles);
  appendArrayParam(params, "person_seniorities", input.person_seniorities);
  appendArrayParam(params, "person_locations", input.person_locations);
  appendArrayParam(params, "organization_locations", input.organization_locations);
  appendArrayParam(
    params,
    "organization_num_employees_ranges",
    input.organization_num_employees_ranges,
  );
  appendArrayParam(params, "organization_domains", input.organization_domains);
  appendArrayParam(
    params,
    "currently_using_any_of_technology_uids",
    input.currently_using_any_of_technology_uids,
  );
  appendArrayParam(params, "q_organization_job_titles", input.q_organization_job_titles);
  params.set("page", String(input.page ?? 1));
  params.set("per_page", String(input.per_page ?? 10));
  return params;
}

function mapApolloStatus(status: number, body: string): AppError {
  const snippet = body.slice(0, 240);
  if (status === 401) {
    return new AppError(
      ErrorCodes.APOLLO_UNAUTHORIZED,
      "Apollo 密钥无效，请检查 APOLLO_API_KEY。",
      401,
      { httpStatus: 401, body: snippet },
    );
  }
  if (status === 403) {
    return new AppError(
      ErrorCodes.APOLLO_FORBIDDEN,
      "Apollo 套餐或 API Scope 不支持 People Search。",
      403,
      { httpStatus: 403, body: snippet },
    );
  }
  if (status === 422) {
    return new AppError(
      ErrorCodes.APOLLO_INVALID_FILTER,
      "Apollo 筛选参数错误，请检查职级、人数区间等字段。",
      422,
      { httpStatus: 422, body: snippet },
    );
  }
  if (status === 429) {
    return new AppError(
      ErrorCodes.APOLLO_RATE_LIMITED,
      "已达到 Apollo 频率限制，请稍后再试。",
      429,
      { httpStatus: 429, body: snippet },
    );
  }
  return new AppError(
    ErrorCodes.APOLLO_NETWORK_ERROR,
    `Apollo 返回 HTTP ${status}`,
    status >= 500 ? 503 : status,
    { httpStatus: status, body: snippet },
  );
}

function normalizePerson(raw: Record<string, unknown>, isDemo = false): ApolloPerson {
  const org = (raw.organization as Record<string, unknown> | undefined) ?? {};
  const email = typeof raw.email === "string" && raw.email.includes("@") ? raw.email : null;
  const phone =
    typeof raw.phone_number === "string"
      ? raw.phone_number
      : typeof raw.sanitized_phone === "string"
        ? raw.sanitized_phone
        : null;
  const name =
    [raw.first_name, raw.last_name].filter(Boolean).join(" ").trim() ||
    (typeof raw.name === "string" ? raw.name : "未知联系人");
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name,
    title: String(raw.title ?? raw.headline ?? "未知职位"),
    seniority: (raw.seniority as string) ?? null,
    organization: String(org.name ?? raw.organization_name ?? "未知企业"),
    domain: (org.primary_domain as string) ?? (org.website_url as string) ?? null,
    location: (raw.present_raw_address as string) ?? (raw.city as string) ?? null,
    linkedinUrl: (raw.linkedin_url as string) ?? null,
    email,
    phone,
    enrichmentStatus: email || phone ? "available" : "needs_enrichment",
    isDemo,
    headline: (raw.headline as string) ?? null,
  };
}

export async function searchApollo(input: ApolloSearchInput) {
  if (!hasApolloKey()) {
    throw new AppError(
      ErrorCodes.APOLLO_NOT_CONFIGURED,
      "未配置 APOLLO_API_KEY。People Search 只能在服务端使用 x-api-key 调用。",
      200,
    );
  }

  const key = process.env.APOLLO_API_KEY!.trim();
  const params = buildApolloQuery(input);
  const url = `https://api.apollo.io/api/v1/mixed_people/api_search?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": key,
      },
      body: JSON.stringify({
        page: input.page ?? 1,
        per_page: input.per_page ?? 10,
      }),
    });
  } catch (error) {
    console.error("[apollo] network error", error instanceof Error ? error.message : "unknown");
    await logExternalError("apollo", "network", error);
    throw new AppError(
      ErrorCodes.APOLLO_NETWORK_ERROR,
      "无法连接 Apollo，请检查网络或稍后重试。",
      503,
    );
  }

  const text = await res.text();
  if (!res.ok) {
    console.error("[apollo] http", res.status, "key", maskSecret(key));
    await logExternalError("apollo", String(res.status), text.slice(0, 500));
    throw mapApolloStatus(res.status, text);
  }

  let json: { people?: Record<string, unknown>[]; pagination?: { total_entries?: number } };
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError(ErrorCodes.APOLLO_NETWORK_ERROR, "Apollo 返回了无法解析的响应", 502);
  }

  const people = (json.people ?? []).map((p) => normalizePerson(p, false));
  if (people.length === 0) {
    throw new AppError(ErrorCodes.APOLLO_EMPTY, "查询成功，但没有符合条件的决策人。", 200, {
      total: json.pagination?.total_entries ?? 0,
    });
  }

  return {
    source: "apollo" as const,
    people,
    total: json.pagination?.total_entries ?? people.length,
  };
}

export async function searchLocalDemoPeople(input: ApolloSearchInput) {
  const workspace = await getWorkspace();
  const titles = (input.person_titles ?? []).map((t) => t.toLowerCase());
  const locations = [
    ...(input.person_locations ?? []),
    ...(input.organization_locations ?? []),
  ].map((t) => t.toLowerCase());
  const q = input.q_keywords?.toLowerCase();

  const contacts = await prisma.contact.findMany({
    where: { workspaceId: workspace.id },
    include: { company: true },
    take: 80,
  });

  const filtered = contacts.filter((c) => {
    if (q) {
      const blob = `${c.fullName} ${c.title} ${c.company.name} ${c.company.nameEn ?? ""} ${c.company.industry} ${c.location ?? ""} ${c.company.region}`.toLowerCase();
      const tokens = q.split(/[\s,，]+/).filter((t) => t.length > 1);
      const hit = tokens.some((t) => blob.includes(t));
      if (!hit && !c.company.industry.includes(input.q_keywords ?? "")) {
        return false;
      }
    }
    if (titles.length && !titles.some((t) => c.title.toLowerCase().includes(t))) {
      return false;
    }
    if (
      locations.length &&
      !locations.some(
        (loc) =>
          (c.location ?? "").toLowerCase().includes(loc) ||
          c.company.region.toLowerCase().includes(loc) ||
          c.company.country.toLowerCase().includes(loc),
      )
    ) {
      return false;
    }
    return true;
  });

  const pool = filtered.length ? filtered : contacts;
  const people: ApolloPerson[] = pool.slice(0, input.per_page ?? 10).map((c) => ({
    id: c.id,
    name: c.fullName,
    title: c.title,
    seniority: c.seniority,
    organization: c.company.name,
    domain: c.company.domain,
    location: c.location ?? c.company.region,
    linkedinUrl: c.linkedinUrl,
    email: c.email,
    phone: c.phone,
    enrichmentStatus: c.enrichmentStatus === "available" ? "available" : "needs_enrichment",
    isDemo: true,
    headline: `${c.company.industry} · ${c.company.employeeRange}`,
  }));

  return {
    source: "demo" as const,
    people,
    total: pool.length,
  };
}

async function logExternalError(source: string, code: string, detail: unknown) {
  try {
    const workspace = await getWorkspace();
    const ds = await prisma.dataSource.findFirst({
      where: { workspaceId: workspace.id, type: source },
    });
    if (ds) {
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: {
          status: "error",
          errorMessage: `${code}: ${typeof detail === "string" ? detail.slice(0, 300) : "error"}`.replace(
            /sk-[a-zA-Z0-9]+|apollo[_-]?key[=:]\s*\S+/gi,
            "[redacted]",
          ),
        },
      });
    }
  } catch {
    // logging must never break the API
  }
}

export async function testApolloConnection() {
  if (!hasApolloKey()) {
    return {
      ok: false,
      code: ErrorCodes.APOLLO_NOT_CONFIGURED,
      message: "未配置 APOLLO_API_KEY",
    };
  }
  try {
    const result = await searchApollo({
      q_keywords: "manufacturing",
      page: 1,
      per_page: 1,
    });
    return { ok: true, code: "OK", message: `连接成功，返回 ${result.total} 条` };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: ErrorCodes.APOLLO_NETWORK_ERROR, message: "连接失败" };
  }
}
