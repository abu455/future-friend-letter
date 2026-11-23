import { z } from "zod";
import { MAX_AI_INPUT_CHARS, SENIORITY_OPTIONS } from "./constants";

export const icpSchema = z.object({
  industry: z.string().min(1).max(80),
  keywords: z.array(z.string().max(60)).max(20),
  countries: z.array(z.string().max(60)).max(12),
  regions: z.array(z.string().max(80)).max(12),
  employeeMin: z.number().int().min(1).max(100000),
  employeeMax: z.number().int().min(1).max(200000),
  titles: z.array(z.string().max(80)).max(20),
  seniorities: z.array(z.string().max(40)).max(12),
  buyingSignals: z.array(z.string().max(120)).max(12),
  painPoints: z.array(z.string().max(160)).max(12),
  exclusions: z.array(z.string().max(120)).max(12),
});

export type IcpProfile = z.infer<typeof icpSchema>;

export const parseDemandSchema = z.object({
  query: z.string().trim().min(8, "请输入更完整的需求描述").max(MAX_AI_INPUT_CHARS),
});

export const scanRequestSchema = z.object({
  query: z.string().trim().min(8).max(MAX_AI_INPUT_CHARS),
  icp: icpSchema.optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});

export const signalQuerySchema = z.object({
  q: z.string().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  grade: z.string().optional(),
  source: z.string().optional(),
  range: z.enum(["7", "30", "90", "all"]).optional(),
  sort: z.enum(["score", "time", "strength", "urgency"]).optional(),
  ids: z.string().optional(),
});

export const convertSignalSchema = z.object({
  amount: z.number().int().min(0).max(100000000).optional(),
  ownerId: z.string().optional(),
});

export const companyQuerySchema = z.object({
  q: z.string().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
});

export const contactQuerySchema = z.object({
  q: z.string().optional(),
  companyId: z.string().optional(),
  seniority: z.string().optional(),
});

export const opportunityQuerySchema = z.object({
  stage: z.string().optional(),
  q: z.string().optional(),
  grade: z.string().optional(),
  view: z.enum(["kanban", "list"]).optional(),
});

export const createOpportunitySchema = z.object({
  name: z.string().min(2).max(160),
  companyId: z.string().min(1),
  contactId: z.string().optional(),
  signalId: z.string().optional(),
  source: z.string().default("manual"),
  industry: z.string().min(1),
  amount: z.number().int().min(0).max(100000000).default(0),
  score: z.number().int().min(0).max(100).optional(),
  nextAction: z.string().max(200).optional(),
});

export const patchOpportunitySchema = z.object({
  stage: z.string().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  amount: z.number().int().min(0).max(100000000).optional(),
  score: z.number().int().min(0).max(100).optional(),
  contactId: z.string().nullable().optional(),
  nextAction: z.string().max(200).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  expectedClose: z.string().datetime().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  riskTags: z.array(z.string().max(40)).max(10).optional(),
  name: z.string().min(2).max(160).optional(),
});

export const startAgentSchema = z.object({
  type: z.enum(["full", "analysis", "strategy", "forecast"]).default("full"),
});

export const closeAgentSchema = z.object({
  opportunityId: z.string().min(1),
  focus: z.enum(["full", "analysis", "strategy", "forecast"]).default("full"),
});

export const objectionSchema = z.object({
  opportunityId: z.string().min(1),
  objection: z.string().trim().min(2).max(MAX_AI_INPUT_CHARS),
});

export const agentMessageSchema = z.object({
  opportunityId: z.string().min(1),
  channel: z.string().min(2).max(40),
  extra: z.string().max(800).optional(),
});

export const apolloSearchSchema = z.object({
  q_keywords: z.string().max(200).optional(),
  person_titles: z.array(z.string().max(80)).max(20).optional(),
  person_seniorities: z.array(z.string().max(40)).max(12).optional(),
  person_locations: z.array(z.string().max(80)).max(12).optional(),
  organization_locations: z.array(z.string().max(80)).max(12).optional(),
  organization_num_employees_ranges: z.array(z.string().max(40)).max(10).optional(),
  organization_domains: z.array(z.string().max(120)).max(10).optional(),
  currently_using_any_of_technology_uids: z.array(z.string().max(80)).max(12).optional(),
  q_organization_job_titles: z.array(z.string().max(80)).max(12).optional(),
  page: z.number().int().min(1).max(50).default(1),
  per_page: z.number().int().min(1).max(25).default(10),
  useDemoFallback: z.boolean().optional(),
});

export const taskPatchSchema = z.object({
  status: z.enum(["open", "done", "snoozed"]).optional(),
  dueAt: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  title: z.string().min(2).max(200).optional(),
});

export const batchTaskSchema = z.object({
  ids: z.array(z.string()).min(1).max(50),
  action: z.enum(["complete", "snooze", "reassign"]),
  ownerId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
});

export const reminderSchema = z.object({
  dueAt: z.string().datetime(),
  note: z.string().max(200).optional(),
});

export const csvImportSchema = z.object({
  csv: z.string().min(10).max(200_000),
});

export { SENIORITY_OPTIONS };
