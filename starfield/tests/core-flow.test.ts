import { describe, expect, it } from "vitest";
import { handleObjectionHeuristic, generateMessageHeuristic, buildForecast } from "@/lib/close-agent";
import { parseDemandHeuristic, scoreOpportunity } from "@/lib/demo-ai";

const opp = {
  id: "opp_1",
  name: "Müller 柔性裁切产线升级",
  industry: "汽车内饰",
  score: 93,
  amount: 1860000,
  probability: 48,
  stage: "need_confirmed",
  nextAction: "发送试切协议",
  lastActivityAt: new Date(),
  riskTagsJson: '["决策链未覆盖财务"]',
  company: {
    name: "Müller Interior GmbH",
    nameEn: "Mueller Interior",
    country: "德国",
    city: "Ingoldstadt",
    employeeRange: "201-500",
    domain: "mueller-interior.example",
    industry: "汽车内饰",
    region: "德国巴伐利亚",
    summary: "座椅面套工厂，评估柔性裁切自动化。",
    contacts: [
      { fullName: "Anna Keller", title: "采购总监" },
      { fullName: "Thomas Berger", title: "生产总监" },
    ],
  },
  contact: { fullName: "Anna Keller", title: "采购总监", isDecisionMaker: true },
  signal: { urgency: 88 },
} as never;

describe("core closed-loop: demand → score → close agent", () => {
  it("parses demand, scores the opportunity, handles objection and drafts outreach", () => {
    const icp = parseDemandHeuristic(
      "寻找德国100—500人的汽车内饰工厂，重点寻找采购总监、生产总监或工厂负责人，客户可能有柔性材料裁切自动化升级需求。",
    );
    expect(icp.industry).toBe("汽车内饰");

    const score = scoreOpportunity({
      demandStrength: 92,
      urgency: 88,
      credibility: 84,
      icpFit: 92,
      hasDecisionMaker: true,
    });
    expect(score).toBeGreaterThan(80);

    const objection = handleObjectionHeuristic("你们价格太高。", opp);
    expect(objection.type).toBe("价格异议");
    expect(objection.avoid).toMatch(/打折|并不贵/);
    expect(objection.reply.length).toBeGreaterThan(20);

    const letter = generateMessageHeuristic("email_zh", opp);
    expect(letter.body).toContain("Müller");
    expect(letter.label).toBe("中文开发信");

    const forecast = buildForecast(opp);
    expect(forecast.rationale.length).toBeGreaterThanOrEqual(3);
    expect(forecast.probability).toBeGreaterThan(0);
    expect(forecast.confidence).toBeGreaterThan(0);
  });
});
