import "dotenv/config";
import { prisma } from "../src/lib/db";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000);
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3600000);
}

async function main() {
  await prisma.agentMessage.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.opportunityStageHistory.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.marketSignal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.sourceRecord.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.scanJob.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "星域演示工作区", demoMode: true },
  });

  const user = await prisma.user.create({
    data: {
      email: "lin@starfield.demo",
      name: "林知衡",
      role: "ae",
      workspaceId: workspace.id,
    },
  });

  const sources = [
    {
      type: "apollo",
      name: "Apollo.io",
      status: "unconfigured",
      configured: false,
      enabled: true,
      lastFoundCount: 0,
      errorMessage: "未配置 APOLLO_API_KEY，搜索将明确提示并可改用本地演示联系人。",
      apiUsage: 0,
      apiLimit: 100,
    },
    {
      type: "association",
      name: "行业协会官方网站",
      status: "connected",
      configured: true,
      enabled: true,
      lastScanAt: hoursAgo(18),
      lastFoundCount: 6,
    },
    {
      type: "exhibition",
      name: "展会公开名录",
      status: "connected",
      configured: true,
      enabled: true,
      lastScanAt: daysAgo(3),
      lastFoundCount: 11,
    },
    {
      type: "website",
      name: "企业官网",
      status: "connected",
      configured: true,
      enabled: true,
      lastScanAt: hoursAgo(6),
      lastFoundCount: 4,
    },
    {
      type: "recruitment",
      name: "招聘信息",
      status: "connected",
      configured: true,
      enabled: true,
      lastScanAt: hoursAgo(2),
      lastFoundCount: 9,
    },
    {
      type: "news",
      name: "新闻媒体",
      status: "connected",
      configured: true,
      enabled: true,
      lastScanAt: hoursAgo(9),
      lastFoundCount: 5,
    },
    {
      type: "qcc",
      name: "企查查企业数据",
      status: "unconfigured",
      configured: false,
      enabled: false,
      errorMessage: "未配置 QCC_APP_KEY / QCC_SECRET_KEY，接口未接入真实数据。",
    },
    {
      type: "csv",
      name: "手动 CSV 导入",
      status: "connected",
      configured: true,
      enabled: true,
      lastScanAt: daysAgo(1),
      lastFoundCount: 3,
    },
    {
      type: "webhook",
      name: "Webhook",
      status: "paused",
      configured: true,
      enabled: false,
      lastFoundCount: 0,
      errorMessage: "已暂停接收外部推送。",
    },
  ];

  const createdSources = [];
  for (const s of sources) {
    createdSources.push(
      await prisma.dataSource.create({
        data: { workspaceId: workspace.id, ...s },
      }),
    );
  }

  const companiesData = [
    {
      name: "Müller Interior GmbH",
      nameEn: "Mueller Interior",
      industry: "汽车内饰",
      region: "德国巴伐利亚",
      country: "德国",
      city: "Ingoldstadt",
      employeeRange: "201-500",
      employeeCount: 280,
      domain: "mueller-interior.example",
      website: "https://example.com/mueller",
      summary: "为德系主机厂供应座椅面套与门板表皮，正在评估柔性裁切自动化以应对 SKU 增加。",
      icpFit: 92,
      tech: ["SAP", "Siemens"],
    },
    {
      name: "Bavaria Trim Systems",
      nameEn: "Bavaria Trim",
      industry: "汽车内饰",
      region: "德国巴伐利亚",
      country: "德国",
      city: "Regensburg",
      employeeRange: "201-500",
      employeeCount: 420,
      domain: "bavaria-trim.example",
      website: "https://example.com/bavaria",
      summary: "门板、顶棚与包覆件工厂，招聘信息中出现 Cutting Technician 与 Automation Engineer。",
      icpFit: 88,
      tech: ["OPC UA"],
    },
    {
      name: "Saxony Soft Materials GmbH",
      nameEn: "Saxony Soft",
      industry: "柔性材料裁切",
      region: "德国萨克森",
      country: "德国",
      city: "Chemnitz",
      employeeRange: "101-200",
      employeeCount: 150,
      domain: "saxony-soft.example",
      summary: "多层复合材料裁切代工，公开表示旧液压裁断机保养成本上升。",
      icpFit: 90,
      tech: ["AutoCAD"],
    },
    {
      name: "Stuttgart AutoForm GmbH",
      nameEn: "AutoForm Stuttgart",
      industry: "汽车内饰",
      region: "德国巴登-符腾堡",
      country: "德国",
      city: "Stuttgart",
      employeeRange: "201-500",
      employeeCount: 360,
      domain: "autoform-stuttgart.example",
      summary: "为豪华品牌做小批量真皮包覆，对精度和利用率敏感。",
      icpFit: 84,
      tech: ["CATIA"],
    },
    {
      name: "苏州锦程汽车内饰有限公司",
      industry: "汽车内饰",
      region: "中国江苏",
      country: "中国",
      city: "苏州",
      employeeRange: "501-1000",
      employeeCount: 780,
      domain: "jincheng-interior.example",
      summary: "出口欧美的座椅面套工厂，正在上马第二条裁切线。",
      icpFit: 76,
      tech: ["用友"],
    },
    {
      name: "温州华峰箱包股份",
      industry: "箱包制造",
      region: "中国浙江",
      country: "中国",
      city: "温州",
      employeeRange: "201-500",
      employeeCount: 340,
      domain: "huafeng-bags.example",
      summary: "旅行箱与商务包代工，展会后询盘增加，裁片外发比例偏高。",
      icpFit: 73,
      tech: [],
    },
    {
      name: "晋江丰泰鞋材科技",
      industry: "鞋材加工",
      region: "中国福建",
      country: "中国",
      city: "晋江",
      employeeRange: "201-500",
      employeeCount: 260,
      domain: "fengtai-shoe.example",
      summary: "飞织与皮革鞋面裁切，招工难，计划用自动裁切替代部分刀模。",
      icpFit: 81,
      tech: ["MES"],
    },
    {
      name: "宁波中包智能装备",
      industry: "包装设备",
      region: "中国浙江",
      country: "中国",
      city: "宁波",
      employeeRange: "101-200",
      employeeCount: 180,
      domain: "zhongbao-pack.example",
      summary: "包装线集成商，自身也在寻找柔性开料单元配套出口项目。",
      icpFit: 68,
      tech: ["西门子PLC"],
    },
    {
      name: "东莞智裁自动化",
      industry: "工业自动化",
      region: "中国广东",
      country: "中国",
      city: "东莞",
      employeeRange: "51-100",
      employeeCount: 90,
      domain: "zhicai-auto.example",
      summary: "系统集成商，常作为联合投标伙伴，也会转介终端工厂。",
      icpFit: 61,
      tech: ["ROS"],
    },
    {
      name: "DecoTex Italia S.r.l.",
      industry: "柔性材料裁切",
      region: "意大利托斯卡纳",
      country: "意大利",
      city: "Prato",
      employeeRange: "101-200",
      employeeCount: 130,
      domain: "decotex.example",
      summary: "纺织与皮革裁切工场，关注能耗和边角料回收。",
      icpFit: 70,
      tech: [],
    },
    {
      name: "Pacific Bags Vietnam",
      industry: "箱包制造",
      region: "越南平阳",
      country: "越南",
      city: "Binh Duong",
      employeeRange: "501-1000",
      employeeCount: 920,
      domain: "pacificbags.example",
      summary: "欧美品牌箱包大货工厂，正在把裁片从外发收回工厂。",
      icpFit: 77,
      tech: ["SAP Business One"],
    },
    {
      name: "青岛海达包装科技",
      industry: "包装设备",
      region: "中国山东",
      country: "中国",
      city: "青岛",
      employeeRange: "201-500",
      employeeCount: 240,
      domain: "haida-pack.example",
      summary: "纸塑包装与模切，近期新闻提到智能工厂改造补贴。",
      icpFit: 64,
      tech: [],
    },
  ];

  const companies = [];
  for (const c of companiesData) {
    companies.push(
      await prisma.company.create({
        data: {
          workspaceId: workspace.id,
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
          techStackJson: JSON.stringify(c.tech),
          summary: c.summary,
          icpFit: c.icpFit,
          isDemo: true,
          source: "seed",
        },
      }),
    );
  }

  const byName = Object.fromEntries(companies.map((c) => [c.name, c]));

  const contactsData = [
    {
      company: "Müller Interior GmbH",
      fullName: "Anna Keller",
      title: "采购总监",
      seniority: "director",
      department: "采购",
      location: "Ingoldstadt, Germany",
      email: null,
      linkedinUrl: "https://linkedin.com/in/demo-anna-keller",
      dm: true,
    },
    {
      company: "Müller Interior GmbH",
      fullName: "Thomas Berger",
      title: "生产总监",
      seniority: "director",
      department: "生产",
      location: "Ingoldstadt, Germany",
      dm: true,
    },
    {
      company: "Bavaria Trim Systems",
      fullName: "Lukas Hoffmann",
      title: "工厂负责人",
      seniority: "head",
      department: "运营",
      location: "Regensburg, Germany",
      dm: true,
    },
    {
      company: "Bavaria Trim Systems",
      fullName: "Julia Engel",
      title: "设备经理",
      seniority: "manager",
      department: "工程",
      location: "Regensburg, Germany",
      dm: false,
    },
    {
      company: "Saxony Soft Materials GmbH",
      fullName: "Markus Lehmann",
      title: "总经理",
      seniority: "c_suite",
      department: "管理层",
      location: "Chemnitz, Germany",
      dm: true,
    },
    {
      company: "Stuttgart AutoForm GmbH",
      fullName: "Sophie Wagner",
      title: "采购经理",
      seniority: "manager",
      department: "采购",
      location: "Stuttgart, Germany",
      dm: false,
    },
    {
      company: "苏州锦程汽车内饰有限公司",
      fullName: "周启明",
      title: "生产副总",
      seniority: "vp",
      department: "生产",
      location: "苏州",
      dm: true,
    },
    {
      company: "温州华峰箱包股份",
      fullName: "陈晓燕",
      title: "采购总监",
      seniority: "director",
      department: "采购",
      location: "温州",
      dm: true,
    },
    {
      company: "晋江丰泰鞋材科技",
      fullName: "林国辉",
      title: "厂长",
      seniority: "head",
      department: "生产",
      location: "晋江",
      dm: true,
    },
    {
      company: "宁波中包智能装备",
      fullName: "黄志远",
      title: "解决方案总监",
      seniority: "director",
      department: "销售技术",
      location: "宁波",
      dm: false,
    },
    {
      company: "Pacific Bags Vietnam",
      fullName: "Nguyen Thi Mai",
      title: "Procurement Director",
      seniority: "director",
      department: "Procurement",
      location: "Binh Duong, Vietnam",
      dm: true,
    },
    {
      company: "DecoTex Italia S.r.l.",
      fullName: "Giulia Romano",
      title: "Operations Manager",
      seniority: "manager",
      department: "Operations",
      location: "Prato, Italy",
      dm: false,
    },
    {
      company: "青岛海达包装科技",
      fullName: "赵海波",
      title: "设备部长",
      seniority: "head",
      department: "设备",
      location: "青岛",
      dm: false,
    },
    {
      company: "东莞智裁自动化",
      fullName: "何嘉俊",
      title: "创始人",
      seniority: "owner",
      department: "管理层",
      location: "东莞",
      dm: true,
    },
  ];

  const contacts = [];
  for (const c of contactsData) {
    contacts.push(
      await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          companyId: byName[c.company].id,
          fullName: c.fullName,
          title: c.title,
          seniority: c.seniority,
          department: c.department,
          location: c.location,
          email: "email" in c ? (c.email as string | null) : null,
          linkedinUrl: "linkedinUrl" in c ? (c.linkedinUrl as string) : null,
          enrichmentStatus: "email" in c && c.email ? "available" : "needs_enrichment",
          isDecisionMaker: c.dm,
          isDemo: true,
          source: "seed",
        },
      }),
    );
  }

  const contactBy = (company: string, name: string) =>
    contacts.find((c) => c.fullName === name && c.companyId === byName[company].id)!;

  const scanJob = await prisma.scanJob.create({
    data: {
      workspaceId: workspace.id,
      idempotencyKey: "seed-scan-de-interior",
      query:
        "寻找德国100—500人的汽车内饰工厂，重点寻找采购总监、生产总监或工厂负责人，客户可能有柔性材料裁切自动化升级需求。",
      parsedIcpJson: JSON.stringify({
        industry: "汽车内饰",
        keywords: ["柔性材料", "自动裁切", "汽车内饰"],
        countries: ["德国"],
        regions: [],
        employeeMin: 100,
        employeeMax: 500,
        titles: ["采购总监", "生产总监", "工厂负责人"],
        seniorities: ["director", "head", "c_suite"],
        buyingSignals: ["产线升级/设备替换", "相关岗位招聘"],
        painPoints: ["多品种小批量切换慢", "裁切精度与耗材浪费"],
        exclusions: [],
      }),
      status: "completed",
      step: 7,
      stepLabel: "扫描完成",
      foundCount: 8,
    },
  });

  const signalsSpec = [
    {
      title: "Müller Interior 招聘 Cutting Automation Engineer",
      source: "recruitment",
      industry: "汽车内饰",
      region: "德国巴伐利亚",
      company: "Müller Interior GmbH",
      summary:
        "职位描述提到要减少液压裁断对熟练工依赖，并评估 CNC / 刀带式自动裁切方案，与柔性材料升级高度吻合。",
      days: 0,
      strength: 92,
      urgency: 88,
      credibility: 84,
      score: 93,
      keywords: ["招聘", "自动裁切", "汽车内饰"],
      action: "立即查找决策人并交给成交智能体",
    },
    {
      title: "Bavaria Trim 在协会年会上提到换型瓶颈",
      source: "association",
      industry: "汽车内饰",
      region: "德国巴伐利亚",
      company: "Bavaria Trim Systems",
      summary: "公开演讲中承认小批量包覆件换型超过 40 分钟，正在收集欧洲设备商名单。",
      days: 1,
      strength: 85,
      urgency: 76,
      credibility: 80,
      score: 86,
      keywords: ["换型", "协会", "汽车内饰"],
      action: "加入机会池并发送德文/英文开发信",
    },
    {
      title: "Saxony Soft 官网更新「智能裁切」栏目",
      source: "website",
      industry: "柔性材料裁切",
      region: "德国萨克森",
      company: "Saxony Soft Materials GmbH",
      summary: "新页面强调多层复合材料利用率，暗示正在做供应商短名单。",
      days: 2,
      strength: 78,
      urgency: 70,
      credibility: 73,
      score: 81,
      keywords: ["官网", "利用率", "复合材料"],
      action: "AI 分析后约技术评估人",
    },
    {
      title: "Stuttgart AutoForm 参加 Techtextil 观众名录",
      source: "exhibition",
      industry: "汽车内饰",
      region: "德国巴登-符腾堡",
      company: "Stuttgart AutoForm GmbH",
      summary: "展会观众标签含 Leather cutting 与 Interior automation。",
      days: 4,
      strength: 74,
      urgency: 61,
      credibility: 77,
      score: 75,
      keywords: ["展会", "真皮", "内饰"],
      action: "查找采购经理并加入触达名单",
    },
    {
      title: "丰泰鞋材扩产新闻：新车间将收回外发裁片",
      source: "news",
      industry: "鞋材加工",
      region: "中国福建",
      company: "晋江丰泰鞋材科技",
      summary: "地方媒体报道新车间 9 月试产，明确写到自动裁切设备待定标。",
      days: 3,
      strength: 88,
      urgency: 90,
      credibility: 79,
      score: 89,
      keywords: ["扩产", "鞋材", "定标"],
      action: "高优先级触达厂长",
    },
    {
      title: "华峰箱包采购岗在招「熟悉自动裁床」",
      source: "recruitment",
      industry: "箱包制造",
      region: "中国浙江",
      company: "温州华峰箱包股份",
      summary: "JD 要求候选人有自动裁床导入经验，属于典型采购信号。",
      days: 1,
      strength: 80,
      urgency: 72,
      credibility: 82,
      score: 80,
      keywords: ["招聘", "自动裁床", "箱包"],
      action: "加入机会池",
    },
    {
      title: "Pacific Bags 计划把裁片从外发收回",
      source: "news",
      industry: "箱包制造",
      region: "越南平阳",
      company: "Pacific Bags Vietnam",
      summary: "行业通讯提到该厂为了交期把 cutting 环节内制，正在看中国与欧洲设备。",
      days: 5,
      strength: 77,
      urgency: 68,
      credibility: 70,
      score: 78,
      keywords: ["越南", "内制", "箱包"],
      action: "英文开发信 + WhatsApp",
    },
    {
      title: "海达包装申报智能工厂补贴",
      source: "news",
      industry: "包装设备",
      region: "中国山东",
      company: "青岛海达包装科技",
      summary: "补贴清单含模切与视觉检测，预算窗口通常在申报后 60 天。",
      days: 6,
      strength: 66,
      urgency: 74,
      credibility: 68,
      score: 67,
      keywords: ["补贴", "模切", "包装"],
      action: "观察并设置提醒",
    },
    {
      title: "锦程内饰第二条裁切线招标传闻",
      source: "association",
      industry: "汽车内饰",
      region: "中国江苏",
      company: "苏州锦程汽车内饰有限公司",
      summary: "协会内部纪要写到二期设备对标欧洲方案，但更在意交期与本地服务。",
      days: 8,
      strength: 71,
      urgency: 60,
      credibility: 62,
      score: 69,
      keywords: ["招标", "二期", "汽车内饰"],
      action: "待研判，补充决策链",
    },
    {
      title: "DecoTex 关注边角料回收工艺",
      source: "website",
      industry: "柔性材料裁切",
      region: "意大利托斯卡纳",
      company: "DecoTex Italia S.r.l.",
      summary: "博客文章讨论 nested cutting 与能耗，需求存在但预算不明。",
      days: 10,
      strength: 58,
      urgency: 44,
      credibility: 66,
      score: 57,
      keywords: ["能耗", "排版", "意大利"],
      action: "放入观察池",
    },
    {
      title: "中包智能装备为出口项目寻找开料单元",
      source: "exhibition",
      industry: "包装设备",
      region: "中国浙江",
      company: "宁波中包智能装备",
      summary: "展会名片备注 OEM cutting module，可能是渠道而非终端。",
      days: 7,
      strength: 62,
      urgency: 55,
      credibility: 60,
      score: 61,
      keywords: ["OEM", "集成商", "包装"],
      action: "判断是终端还是渠道",
    },
    {
      title: "智裁自动化寻求联合投标伙伴",
      source: "webhook",
      industry: "工业自动化",
      region: "中国广东",
      company: "东莞智裁自动化",
      summary: "主动来询，希望捆绑销售给箱包与鞋材工厂。",
      days: 0,
      strength: 70,
      urgency: 80,
      credibility: 58,
      score: 66,
      keywords: ["渠道", "联合投标"],
      action: "评估渠道政策后回复",
    },
  ];

  const signals = [];
  for (const s of signalsSpec) {
    const company = byName[s.company];
    const grade = s.score >= 80 ? "high" : s.score >= 55 ? "medium" : "low";
    signals.push(
      await prisma.marketSignal.create({
        data: {
          workspaceId: workspace.id,
          title: s.title,
          source: s.source,
          sourceUrl: company.website,
          industry: s.industry,
          region: s.region,
          companyId: company.id,
          companyName: company.name,
          summary: s.summary,
          publishedAt: daysAgo(s.days),
          keywordsJson: JSON.stringify(s.keywords),
          demandStrength: s.strength,
          urgency: s.urgency,
          credibility: s.credibility,
          aiScore: s.score,
          grade,
          recommendedAction: s.action,
          status: "new",
          isDemo: true,
          scanJobId: scanJob.id,
        },
      }),
    );
  }

  const sig = (title: string) => signals.find((s) => s.title === title)!;

  const opps = [
    {
      name: "Müller 柔性裁切产线升级",
      company: "Müller Interior GmbH",
      contact: "Anna Keller",
      signal: "Müller Interior 招聘 Cutting Automation Engineer",
      stage: "need_confirmed",
      score: 93,
      amount: 1860000,
      probability: 48,
      next: "发送试切协议与 ROI 一页纸",
      nextDays: 1,
      closeDays: 45,
      risks: ["决策链未覆盖财务"],
    },
    {
      name: "Bavaria Trim 换型瓶颈项目",
      company: "Bavaria Trim Systems",
      contact: "Lukas Hoffmann",
      signal: "Bavaria Trim 在协会年会上提到换型瓶颈",
      stage: "to_contact",
      score: 86,
      amount: 1420000,
      probability: 28,
      next: "首次触达工厂负责人",
      nextDays: 0,
      closeDays: 70,
      risks: ["高潜未触达"],
    },
    {
      name: "丰泰鞋材新车间定标",
      company: "晋江丰泰鞋材科技",
      contact: "林国辉",
      signal: "丰泰鞋材扩产新闻：新车间将收回外发裁片",
      stage: "proposal",
      score: 89,
      amount: 960000,
      probability: 55,
      next: "提交试点工位布置图",
      nextDays: 2,
      closeDays: 35,
      risks: ["竞品介入"],
    },
    {
      name: "华峰箱包自动裁床导入",
      company: "温州华峰箱包股份",
      contact: "陈晓燕",
      signal: "华峰箱包采购岗在招「熟悉自动裁床」",
      stage: "contacted",
      score: 80,
      amount: 720000,
      probability: 33,
      next: "等待采购回复资料清单",
      nextDays: -2,
      closeDays: 60,
      risks: ["等待回复"],
    },
    {
      name: "Saxony Soft 多层裁切替换",
      company: "Saxony Soft Materials GmbH",
      contact: "Markus Lehmann",
      signal: "Saxony Soft 官网更新「智能裁切」栏目",
      stage: "qualify",
      score: 81,
      amount: 1100000,
      probability: 22,
      next: "补充技术评估人",
      nextDays: 3,
      closeDays: 80,
      risks: [],
    },
    {
      name: "Pacific Bags 裁片内制",
      company: "Pacific Bags Vietnam",
      contact: "Nguyen Thi Mai",
      signal: "Pacific Bags 计划把裁片从外发收回",
      stage: "new",
      score: 78,
      amount: 1580000,
      probability: 18,
      next: "英文开发信 + 决策人确认",
      nextDays: 1,
      closeDays: 90,
      risks: ["高潜未触达"],
    },
    {
      name: "锦程内饰二期裁切线",
      company: "苏州锦程汽车内饰有限公司",
      contact: "周启明",
      signal: "锦程内饰第二条裁切线招标传闻",
      stage: "negotiation",
      score: 69,
      amount: 2100000,
      probability: 41,
      next: "商务条款对标本地服务承诺",
      nextDays: 4,
      closeDays: 50,
      risks: ["价格敏感"],
    },
    {
      name: "海达包装补贴窗口",
      company: "青岛海达包装科技",
      contact: "赵海波",
      signal: "海达包装申报智能工厂补贴",
      stage: "to_contact",
      score: 67,
      amount: 540000,
      probability: 16,
      next: "确认补贴目录是否含裁切",
      nextDays: -5,
      closeDays: 40,
      risks: ["停滞", "超时未跟进"],
    },
    {
      name: "AutoForm 真皮小批量工位",
      company: "Stuttgart AutoForm GmbH",
      contact: "Sophie Wagner",
      signal: "Stuttgart AutoForm 参加 Techtextil 观众名录",
      stage: "won",
      score: 75,
      amount: 430000,
      probability: 100,
      next: "实施进场",
      nextDays: 10,
      closeDays: -12,
      risks: [],
    },
    {
      name: "DecoTex 能耗改造",
      company: "DecoTex Italia S.r.l.",
      contact: "Giulia Romano",
      signal: "DecoTex 关注边角料回收工艺",
      stage: "lost",
      score: 57,
      amount: 390000,
      probability: 0,
      next: "下季再激活",
      nextDays: 60,
      closeDays: 120,
      risks: ["已流失"],
    },
  ];

  const createdOpps = [];
  for (const o of opps) {
    const company = byName[o.company];
    const contact = contactBy(o.company, o.contact);
    const signal = sig(o.signal);
    const row = await prisma.opportunity.create({
      data: {
        workspaceId: workspace.id,
        name: o.name,
        companyId: company.id,
        contactId: contact.id,
        signalId: signal.id,
        source: signal.source,
        industry: o.company && company.industry,
        score: o.score,
        amount: o.amount,
        probability: o.probability,
        stage: o.stage,
        ownerId: user.id,
        nextAction: o.next,
        nextActionAt: daysAgo(-o.nextDays),
        expectedClose: daysAgo(-o.closeDays),
        lastActivityAt: hoursAgo(8 + createdOpps.length),
        riskTagsJson: JSON.stringify(o.risks),
        isDemo: true,
      },
    });
    await prisma.opportunityStageHistory.create({
      data: {
        opportunityId: row.id,
        fromStage: null,
        toStage: o.stage,
        note: "演示数据初始化",
      },
    });
    await prisma.marketSignal.update({
      where: { id: signal.id },
      data: { status: "converted" },
    });
    createdOpps.push(row);
  }

  const oppByName = Object.fromEntries(createdOpps.map((o) => [o.name, o]));

  const tasks = [
    {
      name: "Müller 柔性裁切产线升级",
      title: "向 Anna Keller 发送试切协议",
      category: "ai_recommend",
      due: 0,
      rec: true,
      ai: true,
    },
    {
      name: "Bavaria Trim 换型瓶颈项目",
      title: "首次触达 Lukas Hoffmann",
      category: "high_untouched",
      due: 0,
      rec: true,
      ai: true,
    },
    {
      name: "华峰箱包自动裁床导入",
      title: "跟进采购资料清单回复",
      category: "wait_reply",
      due: -2,
      rec: false,
      ai: false,
    },
    {
      name: "丰泰鞋材新车间定标",
      title: "提交试点工位布置图",
      category: "wait_quote",
      due: 1,
      rec: true,
      ai: false,
    },
    {
      name: "海达包装补贴窗口",
      title: "超时未跟进，重新激活设备部长",
      category: "overdue",
      due: -5,
      rec: true,
      ai: true,
    },
    {
      name: "锦程内饰二期裁切线",
      title: "准备商务谈判底线与本地服务承诺",
      category: "follow_today",
      due: 0,
      rec: false,
      ai: false,
    },
    {
      name: "Pacific Bags 裁片内制",
      title: "高潜机会尚未触达，发英文开发信",
      category: "high_untouched",
      due: 1,
      rec: true,
      ai: true,
    },
    {
      name: "Müller 柔性裁切产线升级",
      title: "预约生产总监 Thomas 视频会议",
      category: "wait_meeting",
      due: 2,
      rec: true,
      ai: false,
    },
    {
      name: "丰泰鞋材新车间定标",
      title: "竞品介入，准备差异对照表",
      category: "high_risk",
      due: 0,
      rec: true,
      ai: true,
    },
    {
      name: "Saxony Soft 多层裁切替换",
      title: "等待样品料片寄出",
      category: "wait_sample",
      due: 3,
      rec: false,
      ai: false,
    },
  ];

  for (const t of tasks) {
    await prisma.followUpTask.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: oppByName[t.name].id,
        ownerId: user.id,
        title: t.title,
        category: t.category,
        dueAt: daysAgo(-t.due),
        status: "open",
        recommended: t.rec,
        aiGenerated: t.ai,
      },
    });
  }

  await prisma.activity.createMany({
    data: [
      {
        workspaceId: workspace.id,
        opportunityId: oppByName["Müller 柔性裁切产线升级"].id,
        type: "note",
        title: "需求确认通话 18 分钟",
        detail: "生产侧确认换型痛点，采购要求先看 ROI。",
        actor: "林知衡",
      },
      {
        workspaceId: workspace.id,
        opportunityId: oppByName["丰泰鞋材新车间定标"].id,
        type: "stage",
        title: "进入方案沟通",
        detail: "客户要求本周看到工位布置图。",
        actor: "林知衡",
      },
      {
        workspaceId: workspace.id,
        opportunityId: oppByName["海达包装补贴窗口"].id,
        type: "risk",
        title: "跟进超时",
        detail: "超过 5 天无活动。",
        actor: "system",
      },
    ],
  });

  await prisma.messageTemplate.createMany({
    data: [
      {
        workspaceId: workspace.id,
        name: "中文开发信-工业裁切",
        channel: "email_zh",
        locale: "zh",
        body: "您好，我们专注柔性材料自动裁切……",
      },
      {
        workspaceId: workspace.id,
        name: "英文开发信-Interior",
        channel: "email_en",
        locale: "en",
        body: "Hi, we help interior plants reduce changeover time…",
      },
    ],
  });

  const apolloSource = createdSources.find((s) => s.type === "apollo")!;
  await prisma.sourceRecord.create({
    data: {
      workspaceId: workspace.id,
      dataSourceId: apolloSource.id,
      title: "Apollo 未配置占位记录",
      rawExcerpt: "演示环境未调用真实 Apollo。配置 APOLLO_API_KEY 后可在数据源中心测试连接。",
      isDemo: true,
    },
  });

  console.log("Seed completed", {
    workspace: workspace.id,
    companies: companies.length,
    contacts: contacts.length,
    signals: signals.length,
    opportunities: createdOpps.length,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
