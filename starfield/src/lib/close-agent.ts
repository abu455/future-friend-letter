import { prisma } from "./db";
import { parseJson } from "./utils";
import { STAGE_LABEL, MESSAGE_CHANNELS } from "./constants";
import { generateAgentText } from "./ai";

type OppBundle = Awaited<ReturnType<typeof loadOpportunity>>;

export async function loadOpportunity(id: string) {
  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: true } },
      contact: true,
      signal: true,
      activities: { orderBy: { createdAt: "desc" }, take: 8 },
      tasks: { where: { status: "open" }, orderBy: { dueAt: "asc" } },
    },
  });
  return opp;
}

export function buildCustomerAnalysis(opp: NonNullable<OppBundle>) {
  const company = opp.company;
  const risk = parseJson<string[]>(opp.riskTagsJson, []);
  return {
    profile: `${company.name}${company.nameEn ? `（${company.nameEn}）` : ""}，${company.country}${company.city ?? ""}，员工约 ${company.employeeRange}，域名 ${company.domain ?? "未知"}。`,
    industry: company.industry,
    scenarios: [
      `${company.industry}产线的柔性裁切 / 成型工位升级`,
      "多品种换型时减少刀模与人工依赖",
      "出口订单波动下的产能弹性",
    ],
    demandStrength: opp.score,
    urgency: opp.signal?.urgency ?? Math.max(30, opp.probability + 10),
    budgetLikelihood: Math.min(90, Math.round(opp.amount / 8000 + opp.score * 0.4)),
    currentSetup: company.summary,
    painPoints: [
      "换型慢，小单损耗高",
      "熟练裁切工招聘难",
      "精度稳定性影响下游缝制/贴合",
    ],
    alternatives: ["继续加班 + 外发加工", "进口二手裁切中心", "局部改造现有液压裁断机"],
    riskTags: risk,
  };
}

export function buildDecisionChain(opp: NonNullable<OppBundle>) {
  const contacts = opp.company.contacts;
  const pick = (pred: (t: string) => boolean, fallback: string) => {
    const hit = contacts.find((c) => pred(c.title));
    return hit ? `${hit.fullName} · ${hit.title}` : fallback;
  };
  return {
    likelyDecisionMaker: pick((t) => /厂长|负责人|总经理|Plant|Owner/.test(t), "工厂负责人 / 总经理（待补齐）"),
    userDepartment: "生产 / 工艺 / 裁切车间",
    technicalEvaluator: pick((t) => /技术|设备|工艺|Engineering/.test(t), "设备经理 / 工艺工程师"),
    procurement: pick((t) => /采购|Procurement|Purchasing/.test(t), "采购总监 / 采购经理"),
    finance: "财务经理（额度超预算时介入）",
    finalApprover: pick((t) => /创始|老板|总经理|CEO|Owner/.test(t), "总经理 / 股东"),
    champions: ["生产总监（效率指标）", "质量经理（不良率）"],
    blockers: ["采购（价格与供应商名录）", "现有设备供应商（置换阻力）"],
  };
}

export function buildStrategy(opp: NonNullable<OppBundle>) {
  const company = opp.company;
  return {
    angle: `从「${company.industry}换型损耗 + 招工难」切入，而不是先谈设备参数。`,
    valueProp: "用柔性自动裁切把换型时间从小时级打到分钟级，让小单也能稳定交付。",
    firstTouch: opp.contact ? `定向触达 ${opp.contact.fullName}（${opp.contact.title}）` : "先补齐生产/采购双线决策人再触达",
    sequence: ["生产痛点共鸣", "现场/视频案例", "小工位试点", "ROI测算", "采购与财务并行"],
    materials: ["同行业 90 秒案例视频", "能耗与耗材对比表", "试点工位布置图"],
    demo: "带客户料片做一次换型对比演示，强调排版利用率。",
    pricing: "试点工位低门槛进入，主线设备按产能阶梯报价，避免一上来总包价吓退采购。",
    breakthrough: "让生产总监成为内部赞助人，用加班费和不良品金额反推回收周期。",
    nextBestAction: opp.nextAction || "本周完成决策人确认并发送中文+英文开发信",
  };
}

export function buildForecast(opp: NonNullable<OppBundle>) {
  const hasDm = Boolean(opp.contact?.isDecisionMaker);
  const stageIndex = [
    "new",
    "qualify",
    "to_contact",
    "contacted",
    "need_confirmed",
    "proposal",
    "negotiation",
    "contract",
    "won",
  ].indexOf(opp.stage);
  const relationship = Math.min(95, 20 + stageIndex * 9 + (hasDm ? 12 : 0));
  const needConfirmed = opp.stage === "need_confirmed" || stageIndex >= 4 ? 72 : 28 + stageIndex * 6;
  const decisionCoverage = Math.min(90, contactsCoverage(opp) * 30 + (hasDm ? 20 : 0));
  const budgetConfirmed = stageIndex >= 6 ? 70 : 18 + stageIndex * 7;
  const competitionRisk = 35 + (parseJson<string[]>(opp.riskTagsJson, []).includes("竞品介入") ? 30 : 0);
  const stallDays = opp.lastActivityAt
    ? (Date.now() - new Date(opp.lastActivityAt).getTime()) / 86400000
    : 9;
  const stallRisk = Math.min(92, Math.round(stallDays * 8 + (opp.stage === "to_contact" ? 15 : 0)));
  const probability = Math.round(
    Math.min(
      92,
      Math.max(
        8,
        opp.probability * 0.45 +
          stageIndex * 7 +
          (hasDm ? 8 : -6) +
          (stallRisk > 60 ? -10 : 0),
      ),
    ),
  );
  const rationale = [
    `当前阶段为「${STAGE_LABEL[opp.stage] ?? opp.stage}」，阶段权重计入预测。`,
    hasDm
      ? `已绑定决策人 ${opp.contact?.fullName}，决策链覆盖加分。`
      : "尚未绑定明确拍板人，成交概率被下调。",
    `机会评分 ${opp.score}，预计金额 ${opp.amount.toLocaleString("zh-CN")}。`,
    stallRisk > 50
      ? `最近活动偏少，停滞风险 ${stallRisk}%，需要立刻跟进。`
      : "跟进节奏正常，停滞风险可控。",
    competitionRisk > 50 ? "标签显示竞争压力，需用试点和交期差来防御。" : "暂未见强竞品标签。",
  ];
  return {
    probability,
    predictedAmount: opp.amount,
    expectedCloseDays: Math.max(21, 90 - stageIndex * 8 + Math.round(stallRisk / 5)),
    relationship,
    needConfirmed,
    decisionCoverage,
    budgetConfirmed,
    competitionRisk,
    stallRisk,
    confidence: hasDm ? 74 : 52,
    rationale,
  };
}

function contactsCoverage(opp: NonNullable<OppBundle>) {
  const titles = opp.company.contacts.map((c) => c.title).join(" ");
  let n = 0;
  if (/采购/.test(titles)) n += 1;
  if (/生产|厂长|工艺/.test(titles)) n += 1;
  if (/总|创始|老板/.test(titles)) n += 1;
  return n;
}

export function handleObjectionHeuristic(text: string, opp: NonNullable<OppBundle>) {
  const t = text.toLowerCase();
  let type = "综合顾虑";
  if (/价|贵|cost|price|budget/.test(t)) type = "价格异议";
  else if (/时间|忙|later|再看/.test(t)) type = "时机异议";
  else if (/竞品|别家|已有|现有/.test(t)) type = "竞品/现状异议";
  else if (/质量|稳定|风险/.test(t)) type = "风险异议";
  else if (/不需要|没需求/.test(t)) type = "需求异议";

  const map: Record<string, {
    real: string;
    avoid: string;
    reply: string;
    ask: string;
    proof: string[];
    next: string;
  }> = {
    价格异议: {
      real: "真正担心的是回收周期、审批难度，以及买贵了要不要负责。",
      avoid: "不要立刻打折，也不要争论‘我们并不贵’。",
      reply: `理解预算压力。我们先按 ${opp.company.name} 一个工位的加班费和耗材浪费算 8–12 个月回收，而不是先谈整线总价。`,
      ask: "目前评估的是整线预算，还是允许先上一个试点工位？内部谁对 ROI 签字？",
      proof: ["同行业试点回收周期表", "耗材对比", "客户回访纪要"],
      next: "发送一页 ROI 测算，并约生产+采购 20 分钟对齐口径",
    },
    时机异议: {
      real: "优先级不够，或内部还没形成更换窗口。",
      avoid: "不要反复催‘那你什么时候方便’。",
      reply: "完全可以排到他们的淡季窗口。我们先把料片调研和工位测绘做完，避免旺季来了再临时找供应商。",
      ask: "下一季产能高峰大概在哪个月？现在的瓶颈工位是裁切、缝制还是贴合？",
      proof: ["实施周期甘特图", "不停机改造案例"],
      next: "设 14 天后跟进，并请对方转发案例给生产总监",
    },
    "竞品/现状异议": {
      real: "转换成本和对现有供应商的关系绑定。",
      avoid: "不要贬低竞品或现有设备。",
      reply: "现有方案继续跑没问题。我们只补他们最痛的换型工位，和现有线体并联，而不是推倒重来。",
      ask: "现有设备最让车间头疼的三个问题是什么？最近一次因换型耽误交期是什么时候？",
      proof: ["并联改造示意图", "不停产切换案例"],
      next: "要一份现有工位照片/视频，做差异对照",
    },
    风险异议: {
      real: "怕新设备不稳影响交期，个人担责。",
      avoid: "不要用‘绝对没问题’来打包票。",
      reply: "可以先用他们的料片做测试报告，不达标不进入商务。验收标准一起写进试点协议。",
      ask: "质量部对精度和不良率的红线分别是多少？",
      proof: ["试切报告模板", "验收条款"],
      next: "安排试切并输出双方签字的数据表",
    },
    需求异议: {
      real: "痛点还没被量化，或找错了人。",
      avoid: "不要继续推销功能清单。",
      reply: `很多 ${opp.industry} 工厂觉得‘还能做’，直到旺季加班和客诉一起到来。我们用三问帮他们判断要不要看。`,
      ask: "最近三个月裁切工位是否出现招工或加班？料片利用率有没有人盯？",
      proof: ["自诊断问卷", "同行业匿名数据"],
      next: "改约生产负责人，不在采购环节结束对话",
    },
  };

  const pack = map[type] ?? {
    real: "需要更多上下文才能判断真实顾虑。",
    avoid: "不要争辩或施压。",
    reply: "先复述对方原话，确认理解，再请对方排一下内部优先级。",
    ask: "这件事如果要往下走，内部还缺哪一个条件？",
    proof: ["案例一页纸"],
    next: "记录异议并创建跟进任务",
  };

  return { type, customerText: text, ...pack };
}

export function generateMessageHeuristic(
  channel: string,
  opp: NonNullable<OppBundle>,
) {
  const name = opp.contact?.fullName || "负责人";
  const company = opp.company.name;
  const title = opp.contact?.title || "生产/采购负责人";
  const industry = opp.industry;
  const meta = MESSAGE_CHANNELS.find((c) => c.id === channel);
  const label = meta?.label ?? channel;

  const templates: Record<string, string> = {
    email_zh: `主题：关于 ${company} ${industry} 裁切工位的一个小建议\n\n${name} ${title} 您好，\n我是星域装备的顾问。注意到贵司在${opp.company.region}的${industry}产线，近期可能面临换型效率和招工压力。\n我们不打算一上来推销整线。想先用 15 分钟请教：当前裁切/开料工位最耗时间的换型场景是哪一个？\n若方便，我可以发一份同行业试点的回收周期（通常 8–12 个月）供内部讨论。\n\n祝商祺`,
    email_en: `Subject: A 15-min question on ${company}'s cutting changeover\n\nHi ${name},\nI work with factories in ${industry} that are scaling SKUs without adding headcount.\nWe are not pitching a full line. I’d like to ask which changeover on your cutting/kitting cell currently burns the most overtime.\nHappy to share a one-page ROI from a similar plant in your region.\n\nBest regards`,
    linkedin: `Hi ${name} — I help ${industry} plants cut changeover time on flexible materials. Not selling a full line; curious which cell currently creates the most overtime at ${company}. Open to a 10-min note swap?`,
    whatsapp: `您好${name}，我是星域。想请教 ${company} 裁切工位换型是否仍靠熟练工？有一份 1 页同行对比，方便发您吗？`,
    call_opener: `${name} 您好，我是星域的顾问，打扰一分钟。不是推销整厂改造。我们在${industry}做柔性裁切试点，想确认贵司现在最痛的是换型、精度还是招工？如果都还好，我就不占用时间。`,
    need_questions: `1. 当前裁切/开料最大的三个痛点？\n2. 换型一次平均多久，谁在加班？\n3. 料片利用率谁负责？\n4. 本季是否有扩产或新材料？\n5. 采购决策是生产提需求还是集团名录？\n6. 若试点 1 个工位，内部谁签字？`,
    meeting_invite: `邀请：${company} 试点工位预沟通（25 分钟）\n议程：痛点对齐 / 同行视频 / 是否值得做试切\n请生产与采购各一位参加。`,
    meeting_notes: `会议对象：${company} ${name}\n纪要：待补充。结论：需求强度、决策人、下一步时间。\n未决：料片规格、预算窗口、竞品。`,
    follow_email: `${name} 您好，接上次沟通，补上 ${industry} 工位回收周期一页纸。若本周生产例会方便，我可以 10 分钟远程讲完。`,
    quote_follow: `${name} 您好，报价已按「试点工位 + 主线选配」拆开，避免一次审批过大。需要我按你们的料片利用率再算一版回收吗？`,
    wakeup: `${name} 您好，这封是短跟进。若 ${company} 本季暂不评估裁切自动化，回我一个「暂缓」即可，我下个旺季前再联系，避免打扰。`,
  };

  return {
    channel,
    label,
    body: templates[channel] ?? templates.email_zh,
  };
}

export async function runFullCloseAgent(opportunityId: string) {
  const opp = await loadOpportunity(opportunityId);
  if (!opp) return null;
  const analysis = buildCustomerAnalysis(opp);
  const chain = buildDecisionChain(opp);
  const strategy = buildStrategy(opp);
  const forecast = buildForecast(opp);
  const llm = await generateAgentText(
    "你是B2B工业装备成交教练，用中文给出简短可执行建议。",
    `机会：${opp.name}，企业：${opp.company.name}，阶段：${opp.stage}，评分：${opp.score}。请用三句话指出下一步。`,
  );
  if (llm.text) {
    strategy.nextBestAction = llm.text.split("\n").filter(Boolean)[0] ?? strategy.nextBestAction;
  }
  return {
    analysis,
    chain,
    strategy,
    forecast,
    engine: llm.meta.engine,
    model: llm.meta.model,
  };
}
