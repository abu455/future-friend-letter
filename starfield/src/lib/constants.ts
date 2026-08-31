export const APP_NAME = "星域需求雷达与成交智能体";
export const APP_NAME_SHORT = "星域雷达";

export const STAGES = [
  { id: "new", label: "新发现", color: "#2F9BFF" },
  { id: "qualify", label: "待研判", color: "#3DDCFF" },
  { id: "to_contact", label: "待触达", color: "#1677FF" },
  { id: "contacted", label: "已触达", color: "#86A3C3" },
  { id: "need_confirmed", label: "需求确认", color: "#38D996" },
  { id: "proposal", label: "方案沟通", color: "#3DDCFF" },
  { id: "negotiation", label: "商务谈判", color: "#FFB547" },
  { id: "contract", label: "待签约", color: "#FFB547" },
  { id: "won", label: "已成交", color: "#38D996" },
  { id: "lost", label: "已流失", color: "#FF647C" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export const STAGE_LABEL: Record<string, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label]),
);

export const INDUSTRIES = [
  "工业自动化",
  "柔性材料裁切",
  "汽车内饰",
  "箱包制造",
  "包装设备",
  "鞋材加工",
] as const;

export const SIGNAL_GRADES = [
  { id: "high", label: "高潜", color: "#38D996" },
  { id: "medium", label: "一般", color: "#2F9BFF" },
  { id: "low", label: "观察", color: "#86A3C3" },
] as const;

export const SCAN_STEPS = [
  { id: 1, label: "正在理解需求" },
  { id: 2, label: "正在生成ICP" },
  { id: 3, label: "正在扫描市场信号" },
  { id: 4, label: "正在搜索目标企业" },
  { id: 5, label: "正在匹配决策人" },
  { id: 6, label: "正在计算机会分" },
  { id: 7, label: "扫描完成" },
] as const;

export const DATA_SOURCE_TYPES = [
  { type: "apollo", name: "Apollo.io", requiresKey: "APOLLO_API_KEY" },
  { type: "association", name: "行业协会官方网站", requiresKey: null },
  { type: "exhibition", name: "展会公开名录", requiresKey: null },
  { type: "website", name: "企业官网", requiresKey: null },
  { type: "recruitment", name: "招聘信息", requiresKey: null },
  { type: "news", name: "新闻媒体", requiresKey: null },
  { type: "qcc", name: "企查查企业数据", requiresKey: "QCC_APP_KEY" },
  { type: "csv", name: "手动 CSV 导入", requiresKey: null },
  { type: "webhook", name: "Webhook", requiresKey: null },
] as const;

export const TASK_CATEGORIES = [
  { id: "follow_today", label: "今日跟进" },
  { id: "overdue", label: "超时未跟进" },
  { id: "wait_reply", label: "等待回复" },
  { id: "wait_quote", label: "等待报价" },
  { id: "wait_sample", label: "等待样品" },
  { id: "wait_meeting", label: "等待会议" },
  { id: "high_risk", label: "高风险机会" },
  { id: "high_untouched", label: "高潜未触达" },
  { id: "ai_recommend", label: "AI推荐行动" },
] as const;

export const MESSAGE_CHANNELS = [
  { id: "email_zh", label: "中文开发信", locale: "zh" },
  { id: "email_en", label: "英文开发信", locale: "en" },
  { id: "linkedin", label: "LinkedIn 私信", locale: "en" },
  { id: "whatsapp", label: "WhatsApp 消息", locale: "en" },
  { id: "call_opener", label: "电话开场白", locale: "zh" },
  { id: "need_questions", label: "需求确认问题", locale: "zh" },
  { id: "meeting_invite", label: "会议邀请", locale: "zh" },
  { id: "meeting_notes", label: "会议纪要", locale: "zh" },
  { id: "follow_email", label: "跟进邮件", locale: "zh" },
  { id: "quote_follow", label: "报价跟进", locale: "zh" },
  { id: "wakeup", label: "长时间未回复唤醒", locale: "zh" },
] as const;

export const SENIORITY_OPTIONS = [
  "owner",
  "founder",
  "c_suite",
  "partner",
  "vp",
  "head",
  "director",
  "manager",
  "senior",
  "entry",
];

export const EMPLOYEE_RANGES = [
  "1,10",
  "11,20",
  "21,50",
  "51,100",
  "101,200",
  "201,500",
  "501,1000",
  "1001,5000",
  "5001,10000",
  "10001+",
];

export const MAX_AI_INPUT_CHARS = 4000;
export const DEFAULT_SCAN_RATE_LIMIT = 8;
export const DEFAULT_SCAN_MAX_SIGNALS = 20;
