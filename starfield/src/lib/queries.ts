import { prisma } from "./db";
import { getWorkspace } from "./workspace";
import { INDUSTRIES } from "./constants";

export async function getDashboardData() {
  const workspace = await getWorkspace();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    todaySignals,
    highPotential,
    companies,
    opps,
    openTasks,
    recentSignals,
    riskOpps,
    aiTasks,
  ] = await Promise.all([
    prisma.marketSignal.count({
      where: { workspaceId: workspace.id, publishedAt: { gte: startOfDay } },
    }),
    prisma.opportunity.count({
      where: { workspaceId: workspace.id, score: { gte: 80 }, stage: { notIn: ["won", "lost"] } },
    }),
    prisma.company.count({ where: { workspaceId: workspace.id } }),
    prisma.opportunity.findMany({
      where: { workspaceId: workspace.id, stage: { notIn: ["lost"] } },
    }),
    prisma.followUpTask.count({
      where: { workspaceId: workspace.id, status: "open" },
    }),
    prisma.marketSignal.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { aiScore: "desc" },
      take: 24,
    }),
    prisma.opportunity.findMany({
      where: {
        workspaceId: workspace.id,
        stage: { notIn: ["won", "lost"] },
        OR: [
          { riskTagsJson: { contains: "停滞" } },
          { riskTagsJson: { contains: "超时" } },
          { riskTagsJson: { contains: "竞品" } },
        ],
      },
      include: { company: true },
      take: 6,
    }),
    prisma.followUpTask.findMany({
      where: { workspaceId: workspace.id, status: "open", recommended: true },
      include: { opportunity: true },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
  ]);

  const pipelineAmount = opps.reduce((s, o) => s + o.amount, 0);
  const avgProb =
    opps.length === 0 ? 0 : Math.round(opps.reduce((s, o) => s + o.probability, 0) / opps.length);

  const ranking = [...opps]
    .filter((o) => !["won", "lost"].includes(o.stage))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    stats: {
      todaySignals,
      highPotential,
      apolloTargets: companies,
      pipelineAmount,
      avgProb,
      openTasks,
    },
    ranking,
    recentSignals,
    riskOpps,
    aiTasks,
    demoMode: workspace.demoMode,
  };
}

export function buildTrendSeries(range: 7 | 30 | 90, industry?: string) {
  const days = range;
  const industries = industry ? [industry] : [...INDUSTRIES];
  const series = industries.map((name, idx) => {
    const points = [];
    let value = 40 + idx * 6;
    for (let i = days - 1; i >= 0; i--) {
      const wave = Math.sin((days - i) / 4 + idx) * (6 + idx);
      const drift = (days - i) * (idx % 2 === 0 ? 0.35 : -0.12);
      value = Math.max(12, Math.min(98, 48 + wave + drift + (idx === 1 ? 8 : 0)));
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      points.push({
        date: date.toISOString().slice(0, 10),
        value: Math.round(value),
      });
    }
    const last = points[points.length - 1]?.value ?? 0;
    const prev = points[Math.max(0, points.length - 8)]?.value ?? last;
    const change = prev === 0 ? 0 : Math.round(((last - prev) / prev) * 100);
    const direction = change > 3 ? "up" : change < -3 ? "down" : "flat";
    return {
      industry: name,
      heat: last,
      change,
      direction,
      signalCount: 4 + ((idx * 3 + days) % 11),
      points,
    };
  });
  return series;
}
