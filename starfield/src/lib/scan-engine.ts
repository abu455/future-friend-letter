import { prisma } from "./db";
import { getWorkspace } from "./workspace";
import { parseDemandWithAi } from "./ai";
import { gradeFromScore, parseJson } from "./utils";
import { scoreOpportunity } from "./demo-ai";
import { getScanMaxSignals } from "./env";
import { SCAN_STEPS } from "./constants";
import type { IcpProfile } from "./validators";
import { AppError, ErrorCodes } from "./errors";
import { looksLikePromptInjection } from "./sanitize";

export async function createOrResumeScan(input: {
  query: string;
  icp?: IcpProfile;
  idempotencyKey: string;
}) {
  if (looksLikePromptInjection(input.query)) {
    throw new AppError(ErrorCodes.AI_INJECTION_BLOCKED, "需求文本疑似提示词注入", 422);
  }

  const workspace = await getWorkspace();
  const existing = await prisma.scanJob.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const parsed = input.icp ?? (await parseDemandWithAi(input.query)).icp;

  return prisma.scanJob.create({
    data: {
      workspaceId: workspace.id,
      idempotencyKey: input.idempotencyKey,
      query: input.query,
      parsedIcpJson: JSON.stringify(parsed),
      status: "running",
      step: 1,
      stepLabel: SCAN_STEPS[0].label,
    },
  });
}

export async function runScanPipeline(jobId: string) {
  const job = await prisma.scanJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  const icp = parseJson<IcpProfile>(job.parsedIcpJson, {
    industry: "工业自动化",
    keywords: [],
    countries: [],
    regions: [],
    employeeMin: 50,
    employeeMax: 500,
    titles: [],
    seniorities: [],
    buyingSignals: [],
    painPoints: [],
    exclusions: [],
  });

  const tick = async (step: number) => {
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        step,
        stepLabel: SCAN_STEPS[step - 1]?.label ?? "处理中",
        status: step >= 7 ? "completed" : "running",
      },
    });
    await new Promise((r) => setTimeout(r, 420));
  };

  await tick(1);
  await tick(2);
  await tick(3);

  const companies = await prisma.company.findMany({
    where: { workspaceId: job.workspaceId },
    include: { contacts: true },
  });

  await tick(4);

  const matched = companies.filter((c) => {
    const regionHit =
      icp.countries.some((x) => x !== "未指定" && (c.country.includes(x) || c.region.includes(x))) ||
      icp.regions.some((x) => c.region.includes(x) || c.country.includes(x)) ||
      icp.countries.includes("未指定");
    const industryHit =
      c.industry === icp.industry ||
      icp.keywords.some((k) => `${c.name}${c.summary}${c.industry}`.includes(k));
    const size = c.employeeCount ?? 200;
    const sizeHit = size >= icp.employeeMin * 0.5 && size <= icp.employeeMax * 1.8;
    const excluded = icp.exclusions.some((ex) => c.summary.includes(ex) || c.name.includes(ex));
    return regionHit && (industryHit || regionHit) && sizeHit && !excluded;
  });

  await tick(5);

  const maxSignals = getScanMaxSignals();
  const now = Date.now();
  let created = 0;

  for (const company of matched.slice(0, maxSignals)) {
    const dm = company.contacts.find((c) => c.isDecisionMaker) ?? company.contacts[0];
    const demandStrength = Math.min(96, 55 + Math.round(company.icpFit * 0.35));
    const urgency = 40 + ((company.name.length * 7) % 50);
    const credibility = 58 + (company.domain ? 20 : 0);
    const score = scoreOpportunity({
      demandStrength,
      urgency,
      credibility,
      icpFit: company.icpFit,
      hasDecisionMaker: Boolean(dm),
    });
    const keywords = [...icp.keywords, company.industry].slice(0, 6);
    await prisma.marketSignal.create({
      data: {
        workspaceId: job.workspaceId,
        title: `${company.region}${company.industry} · ${company.name} 出现采购信号`,
        source: "scan",
        sourceUrl: company.website,
        industry: company.industry,
        region: company.region,
        companyId: company.id,
        companyName: company.name,
        summary: `${company.summary} 与本次扫描 ICP（${icp.industry} / ${icp.employeeMin}-${icp.employeeMax}人）匹配。${
          dm ? `已定位决策人 ${dm.fullName}（${dm.title}）。` : "尚未定位决策人。"
        }${icp.painPoints[0] ? `疑似痛点：${icp.painPoints[0]}。` : ""}`,
        publishedAt: new Date(now - created * 3600_000),
        keywordsJson: JSON.stringify(keywords),
        demandStrength,
        urgency,
        credibility,
        aiScore: score,
        grade: gradeFromScore(score),
        recommendedAction: score >= 80 ? "立即交给成交智能体" : "加入机会池并补齐决策人",
        status: "new",
        isDemo: true,
        scanJobId: job.id,
      },
    });
    created += 1;
  }

  if (created === 0) {
    await prisma.marketSignal.create({
      data: {
        workspaceId: job.workspaceId,
        title: `${icp.industry} 扫描完成，样本池暂无精确匹配，已生成观察信号`,
        source: "scan",
        industry: icp.industry,
        region: icp.countries[0] || "全球",
        companyName: "待匹配企业",
        summary: `已理解需求并生成 ICP，但当前演示企业库中没有同时满足地区、人数和行业的记录。可放宽人数或地区后重新扫描，或到企业搜索中补充目标。`,
        publishedAt: new Date(),
        keywordsJson: JSON.stringify(icp.keywords),
        demandStrength: 40,
        urgency: 30,
        credibility: 45,
        aiScore: 42,
        grade: "low",
        recommendedAction: "调整 ICP 后重新扫描",
        isDemo: true,
        scanJobId: job.id,
      },
    });
    created = 1;
  }

  await tick(6);
  await prisma.scanJob.update({
    where: { id: jobId },
    data: {
      foundCount: created,
      step: 7,
      stepLabel: SCAN_STEPS[6].label,
      status: "completed",
    },
  });
}

export async function getScanStatus(id?: string) {
  if (id) {
    return prisma.scanJob.findUnique({ where: { id } });
  }
  return prisma.scanJob.findFirst({ orderBy: { createdAt: "desc" } });
}
