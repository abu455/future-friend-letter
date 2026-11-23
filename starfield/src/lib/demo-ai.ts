import type { IcpProfile } from "./validators";

const INDUSTRY_RULES: { keys: string[]; industry: string }[] = [
  { keys: ["汽车内饰", "座椅", "仪表板", "头枕", "trim", "interior"], industry: "汽车内饰" },
  { keys: ["柔性材料", "裁切", "切割", "刀模", "cnc裁切", "激光裁切"], industry: "柔性材料裁切" },
  { keys: ["自动化", "机械臂", "产线改造", "工业机器人"], industry: "工业自动化" },
  { keys: ["箱包", "手袋", "行李箱", "leather goods"], industry: "箱包制造" },
  { keys: ["包装", "纸箱", "封箱", "wrapping"], industry: "包装设备" },
  { keys: ["鞋材", "鞋面", "鞋厂", "footwear"], industry: "鞋材加工" },
];

const REGION_MAP: Record<string, string> = {
  德国: "德国",
  germany: "德国",
  日本: "日本",
  美国: "美国",
  越南: "越南",
  意大利: "意大利",
  中国: "中国",
  广东: "中国广东",
  浙江: "中国浙江",
  江苏: "中国江苏",
  福建: "中国福建",
  上海: "中国上海",
};

const TITLE_KEYS = [
  "采购总监",
  "生产总监",
  "工厂负责人",
  "厂长",
  "采购经理",
  "设备经理",
  "技术总监",
  "运营总监",
  "总经理",
  "老板",
  "创始人",
  "CPO",
  "COO",
  "Plant Manager",
  "Procurement Director",
];

function unique(list: string[]) {
  return [...new Set(list.filter(Boolean))];
}

function extractEmployeeRange(text: string) {
  const compact = text.replace(/\s/g, "");
  const m =
    compact.match(/(\d{2,5})\s*[-—~至到]\s*(\d{2,6})\s*人/) ||
    compact.match(/(\d{2,5})人?(?:左右|上下)/);
  if (m && m[2]) {
    return { min: Number(m[1]), max: Number(m[2]) };
  }
  if (m) {
    const n = Number(m[1]);
    return { min: Math.max(1, n - 50), max: n + 50 };
  }
  if (/中小企业|中型企业/.test(text)) return { min: 100, max: 500 };
  if (/大型|集团/.test(text)) return { min: 500, max: 5000 };
  return { min: 50, max: 500 };
}

export function parseDemandHeuristic(query: string): IcpProfile {
  const lower = query.toLowerCase();
  const industries = INDUSTRY_RULES.filter((rule) =>
    rule.keys.some((k) => query.includes(k) || lower.includes(k.toLowerCase())),
  ).map((r) => r.industry);
  const countries: string[] = [];
  const regions: string[] = [];
  for (const [key, value] of Object.entries(REGION_MAP)) {
    if (query.includes(key) || lower.includes(key)) {
      if (value.startsWith("中国")) regions.push(value);
      else countries.push(value);
    }
  }
  const titles = TITLE_KEYS.filter((t) => query.includes(t) || lower.includes(t.toLowerCase()));
  const { min, max } = extractEmployeeRange(query);

  const buyingSignals: string[] = [];
  if (/招聘|在招|hiring/.test(query)) buyingSignals.push("相关岗位招聘");
  if (/升级|改造|替换|老旧/.test(query)) buyingSignals.push("产线升级/设备替换");
  if (/扩产|新工厂|产能/.test(query)) buyingSignals.push("扩产或新工厂建设");
  if (/自动化/.test(query)) buyingSignals.push("自动化改造意向");
  if (/展会|询盘/.test(query)) buyingSignals.push("展会/询盘活跃");

  const painPoints: string[] = [];
  if (/柔性|多品种|小批量/.test(query)) painPoints.push("多品种小批量切换慢");
  if (/裁切|切割|刀模/.test(query)) painPoints.push("裁切精度与耗材浪费");
  if (/人工|招工|成本/.test(query)) painPoints.push("人工成本与招工难");
  if (/交期|交付/.test(query)) painPoints.push("交期不稳定");
  if (painPoints.length === 0) painPoints.push("现有工艺效率不足，需要自动化升级");

  const exclusions: string[] = [];
  const ex = query.match(/排除([^，。；\n]+)/);
  if (ex) exclusions.push(ex[1].trim());
  if (/不要贸易商|排除贸易/.test(query)) exclusions.push("贸易商/纯流通企业");

  const keywords = unique([
    ...INDUSTRY_RULES.flatMap((r) =>
      r.keys.filter((k) => query.includes(k)).slice(0, 2),
    ),
    ...(/柔性/.test(query) ? ["柔性材料"] : []),
    ...(/裁切|切割/.test(query) ? ["自动裁切"] : []),
    ...(/汽车/.test(query) ? ["汽车内饰"] : []),
  ]).slice(0, 8);

  const seniorities = titles.some((t) => /总监|负责人|厂长|创始|总经理|C/.test(t))
    ? ["director", "head", "owner", "c_suite"]
    : ["manager", "director"];

  return {
    industry: industries[0] || "工业自动化",
    keywords: keywords.length ? keywords : ["工业自动化", "设备升级"],
    countries: unique(countries).length ? unique(countries) : ["未指定"],
    regions: unique(regions),
    employeeMin: min,
    employeeMax: max,
    titles: titles.length ? unique(titles) : ["采购总监", "生产总监", "工厂负责人"],
    seniorities,
    buyingSignals: buyingSignals.length ? buyingSignals : ["产线升级意向"],
    painPoints,
    exclusions,
  };
}

export function scoreOpportunity(input: {
  demandStrength: number;
  urgency: number;
  credibility: number;
  icpFit: number;
  hasDecisionMaker: boolean;
}) {
  const base =
    input.demandStrength * 0.28 +
    input.urgency * 0.22 +
    input.credibility * 0.18 +
    input.icpFit * 0.22 +
    (input.hasDecisionMaker ? 12 : 0);
  return Math.round(Math.min(98, Math.max(18, base)));
}
