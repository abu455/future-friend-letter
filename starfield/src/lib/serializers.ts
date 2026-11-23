import { parseJson } from "./utils";
import type {
  MarketSignal,
  Company,
  Contact,
  Opportunity,
  FollowUpTask,
  DataSource,
  ScanJob,
} from "@prisma/client";

export function serializeSignal(s: MarketSignal) {
  return {
    id: s.id,
    title: s.title,
    source: s.source,
    sourceUrl: s.sourceUrl,
    industry: s.industry,
    region: s.region,
    companyId: s.companyId,
    companyName: s.companyName,
    summary: s.summary,
    publishedAt: s.publishedAt,
    keywords: parseJson<string[]>(s.keywordsJson, []),
    demandStrength: s.demandStrength,
    urgency: s.urgency,
    credibility: s.credibility,
    aiScore: s.aiScore,
    grade: s.grade,
    recommendedAction: s.recommendedAction,
    status: s.status,
    isDemo: s.isDemo,
    scanJobId: s.scanJobId,
  };
}

export function serializeCompany(c: Company) {
  return {
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    industry: c.industry,
    region: c.region,
    country: c.country,
    city: c.city,
    employeeRange: c.employeeRange,
    employeeCount: c.employeeCount,
    domain: c.domain,
    website: c.website,
    techStack: parseJson<string[]>(c.techStackJson, []),
    hiringSignals: c.hiringSignals,
    summary: c.summary,
    icpFit: c.icpFit,
    isDemo: c.isDemo,
    source: c.source,
  };
}

export function serializeContact(c: Contact & { company?: Company }) {
  return {
    id: c.id,
    companyId: c.companyId,
    companyName: c.company?.name,
    fullName: c.fullName,
    title: c.title,
    seniority: c.seniority,
    department: c.department,
    location: c.location,
    email: c.email,
    phone: c.phone,
    linkedinUrl: c.linkedinUrl,
    enrichmentStatus: c.enrichmentStatus,
    isDecisionMaker: c.isDecisionMaker,
    isDemo: c.isDemo,
    source: c.source,
  };
}

export function serializeOpportunity(
  o: Opportunity & {
    company?: Company;
    contact?: Contact | null;
  },
) {
  return {
    id: o.id,
    name: o.name,
    companyId: o.companyId,
    companyName: o.company?.name,
    contactId: o.contactId,
    contactName: o.contact?.fullName,
    contactTitle: o.contact?.title,
    signalId: o.signalId,
    source: o.source,
    industry: o.industry,
    score: o.score,
    amount: o.amount,
    probability: o.probability,
    stage: o.stage,
    ownerId: o.ownerId,
    nextAction: o.nextAction,
    nextActionAt: o.nextActionAt,
    expectedClose: o.expectedClose,
    lastActivityAt: o.lastActivityAt,
    riskTags: parseJson<string[]>(o.riskTagsJson, []),
    notes: o.notes,
    isDemo: o.isDemo,
  };
}

export function serializeTask(t: FollowUpTask) {
  return {
    id: t.id,
    opportunityId: t.opportunityId,
    ownerId: t.ownerId,
    title: t.title,
    category: t.category,
    dueAt: t.dueAt,
    status: t.status,
    recommended: t.recommended,
    aiGenerated: t.aiGenerated,
  };
}

export function serializeDataSource(d: DataSource) {
  return {
    id: d.id,
    type: d.type,
    name: d.name,
    status: d.status,
    configured: d.configured,
    enabled: d.enabled,
    lastScanAt: d.lastScanAt,
    lastFoundCount: d.lastFoundCount,
    errorMessage: d.errorMessage,
    apiUsage: d.apiUsage,
    apiLimit: d.apiLimit,
  };
}

export function serializeScanJob(job: ScanJob) {
  return {
    id: job.id,
    status: job.status,
    step: job.step,
    stepLabel: job.stepLabel,
    query: job.query,
    icp: parseJson(job.parsedIcpJson, {}),
    foundCount: job.foundCount,
    errorMessage: job.errorMessage,
    idempotencyKey: job.idempotencyKey,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
