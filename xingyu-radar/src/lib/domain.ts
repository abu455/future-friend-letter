export const OPPORTUNITY_STAGES = [
  "NEW",
  "QUALIFY",
  "TO_CONTACT",
  "CONTACTED",
  "NEED_CONFIRMED",
  "SOLUTION",
  "NEGOTIATION",
  "SIGNING",
  "WON",
  "LOST",
] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const STAGE_LABELS: Record<OpportunityStage, string> = {
  NEW: "新发现",
  QUALIFY: "待研判",
  TO_CONTACT: "待触达",
  CONTACTED: "已触达",
  NEED_CONFIRMED: "需求确认",
  SOLUTION: "方案沟通",
  NEGOTIATION: "商务谈判",
  SIGNING: "待签约",
  WON: "已成交",
  LOST: "已流失",
};

export type SignalLevel = "HIGH" | "MEDIUM" | "LOW";

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry: string;
  region: string;
  employeeRange?: string;
  description?: string;
  technologies: string[];
  isDemo: boolean;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  title: string;
  seniority: string;
  location: string;
  linkedinUrl?: string;
  email?: string;
  phone?: string;
  needsEnrichment: boolean;
  source: string;
  isDemo: boolean;
}

export interface MarketSignal {
  id: string;
  companyId?: string;
  companyName: string;
  title: string;
  sourceName: string;
  sourceUrl?: string;
  industry: string;
  region: string;
  summary: string;
  keywords: string[];
  intensity: number;
  urgency: number;
  confidence: number;
  score: number;
  level: SignalLevel;
  recommendation: string;
  publishedAt: string;
  isDemo: boolean;
  x: number;
  y: number;
}

export interface StageHistory {
  id: string;
  fromStage?: OpportunityStage;
  toStage: OpportunityStage;
  note: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  companyName: string;
  primaryContactId?: string;
  primaryContactName?: string;
  contactIds: string[];
  sourceSignalId?: string;
  name: string;
  source: string;
  industry: string;
  score: number;
  estimatedAmount: number;
  currency: "CNY" | "USD" | "EUR";
  probability: number;
  stage: OpportunityStage;
  owner: string;
  nextAction: string;
  expectedCloseDate: string;
  lastActivityAt: string;
  riskTags: string[];
  isDemo: boolean;
  stageHistory: StageHistory[];
}

export interface FollowUpTask {
  id: string;
  opportunityId?: string;
  opportunityName?: string;
  title: string;
  description?: string;
  dueAt: string;
  status: "PENDING" | "COMPLETED" | "SNOOZED";
  priority: "high" | "medium" | "low";
  assignee: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  status: "connected" | "paused" | "error" | "unconfigured";
  configured: boolean;
  enabled: boolean;
  lastScannedAt?: string;
  discovered: number;
  errorMessage?: string;
  usageCurrent: number;
  usageLimit?: number;
}

export interface ScanCriteria {
  industry: string[];
  keywords: string[];
  regions: string[];
  employeeRange: string;
  titles: string[];
  seniorities: string[];
  buyingSignals: string[];
  painPoints: string[];
  exclusions: string[];
}

export interface ScanJob {
  id: string;
  query: string;
  criteria: ScanCriteria;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  currentStep: number;
  resultCount: number;
  createdAt: string;
}

export interface AgentAnalysis {
  runId: string;
  mode: "demo" | "live";
  confidence: number;
  customer: {
    profile: string;
    scenarios: string[];
    demandStrength: string;
    urgency: string;
    budgetLikelihood: string;
    currentSolution: string;
    painPoints: string[];
    alternatives: string[];
  };
  decisionChain: {
    role: string;
    likelyPerson: string;
    influence: string;
    risk: string;
  }[];
  strategy: {
    entryAngle: string;
    valueProposition: string;
    firstTouch: string;
    sequence: string[];
    materials: string[];
    demo: string;
    pricing: string;
    breakthrough: string;
    nextBestAction: string;
  };
  prediction: {
    probability: number;
    amount: number;
    closeWindow: string;
    relationship: number;
    needClarity: number;
    stakeholderCoverage: number;
    budgetClarity: number;
    competitionRisk: number;
    stagnationRisk: number;
    rationale: string[];
  };
}

export interface ApiErrorShape {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    demoMode?: boolean;
    requestId?: string;
    total?: number;
  };
}
