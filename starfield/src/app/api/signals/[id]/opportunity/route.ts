import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { convertSignalSchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { getDefaultOwnerId, getWorkspace } from "@/lib/workspace";
import { serializeOpportunity } from "@/lib/serializers";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req, convertSignalSchema);
    const workspace = await getWorkspace();
    const signal = await prisma.marketSignal.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!signal) return jsonError("NOT_FOUND", "信号不存在", 404);

    const existing = await prisma.opportunity.findFirst({
      where: { signalId: signal.id },
    });
    if (existing) {
      return jsonOk(serializeOpportunity(existing), { alreadyExisted: true });
    }

    const ownerId = body.ownerId ?? (await getDefaultOwnerId());
    const companyId = signal.companyId;
    if (!companyId) {
      return jsonError("VALIDATION_ERROR", "该信号尚未匹配企业，无法转入机会池", 422);
    }

    const amount = body.amount ?? Math.round(800000 * (signal.aiScore / 80));
    const opp = await prisma.opportunity.create({
      data: {
        workspaceId: workspace.id,
        name: `${signal.companyName} · ${signal.industry}需求`,
        companyId,
        signalId: signal.id,
        source: signal.source,
        industry: signal.industry,
        score: signal.aiScore,
        amount,
        probability: Math.min(40, Math.round(signal.aiScore * 0.35)),
        stage: "new",
        ownerId,
        nextAction: signal.recommendedAction,
        nextActionAt: new Date(Date.now() + 86400000),
        lastActivityAt: new Date(),
        isDemo: signal.isDemo,
      },
      include: { company: true, contact: true },
    });

    await prisma.opportunityStageHistory.create({
      data: {
        opportunityId: opp.id,
        fromStage: null,
        toStage: "new",
        note: "由市场信号转入机会池",
      },
    });
    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: opp.id,
        type: "convert",
        title: "信号转入机会池",
        detail: signal.title,
        actor: "user",
      },
    });
    await prisma.marketSignal.update({
      where: { id: signal.id },
      data: { status: "converted" },
    });
    await prisma.followUpTask.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: opp.id,
        ownerId,
        title: `研判 ${signal.companyName} 并确认决策人`,
        category: "ai_recommend",
        dueAt: new Date(Date.now() + 86400000),
        recommended: true,
        aiGenerated: true,
      },
    });

    return jsonOk(serializeOpportunity(opp), { created: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
