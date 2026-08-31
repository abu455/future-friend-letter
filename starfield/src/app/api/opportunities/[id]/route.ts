import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { patchOpportunitySchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { serializeOpportunity } from "@/lib/serializers";
import { STAGE_LABEL } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const workspace = await getWorkspace();
    const opp = await prisma.opportunity.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        company: { include: { contacts: true } },
        contact: true,
        signal: true,
        stageHistory: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        tasks: { orderBy: { dueAt: "asc" } },
        agentRuns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!opp) return jsonError("NOT_FOUND", "机会不存在", 404);
    return jsonOk({
      ...serializeOpportunity(opp),
      company: opp.company,
      contact: opp.contact,
      contacts: opp.company.contacts,
      signal: opp.signal,
      stageHistory: opp.stageHistory,
      activities: opp.activities,
      tasks: opp.tasks,
      agentRuns: opp.agentRuns.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        demoEngine: r.demoEngine,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req, patchOpportunitySchema);
    const workspace = await getWorkspace();
    const current = await prisma.opportunity.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!current) return jsonError("NOT_FOUND", "机会不存在", 404);

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        ...(body.stage ? { stage: body.stage } : {}),
        ...(body.probability !== undefined ? { probability: body.probability } : {}),
        ...(body.amount !== undefined ? { amount: body.amount } : {}),
        ...(body.score !== undefined ? { score: body.score } : {}),
        ...(body.contactId !== undefined ? { contactId: body.contactId } : {}),
        ...(body.nextAction !== undefined ? { nextAction: body.nextAction } : {}),
        ...(body.nextActionAt !== undefined
          ? { nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null }
          : {}),
        ...(body.expectedClose !== undefined
          ? { expectedClose: body.expectedClose ? new Date(body.expectedClose) : null }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.riskTags ? { riskTagsJson: JSON.stringify(body.riskTags) } : {}),
        ...(body.name ? { name: body.name } : {}),
        lastActivityAt: new Date(),
      },
      include: { company: true, contact: true },
    });

    if (body.stage && body.stage !== current.stage) {
      await prisma.opportunityStageHistory.create({
        data: {
          opportunityId: id,
          fromStage: current.stage,
          toStage: body.stage,
          note: `阶段由「${STAGE_LABEL[current.stage] ?? current.stage}」变更为「${STAGE_LABEL[body.stage] ?? body.stage}」`,
        },
      });
      await prisma.activity.create({
        data: {
          workspaceId: workspace.id,
          opportunityId: id,
          type: "stage",
          title: "阶段变更",
          detail: `${STAGE_LABEL[current.stage] ?? current.stage} → ${STAGE_LABEL[body.stage] ?? body.stage}`,
          actor: "user",
        },
      });
    }

    if (body.probability !== undefined && body.probability !== current.probability) {
      await prisma.activity.create({
        data: {
          workspaceId: workspace.id,
          opportunityId: id,
          type: "forecast",
          title: "成交概率更新",
          detail: `${current.probability}% → ${body.probability}%`,
          actor: "user",
        },
      });
    }

    return jsonOk(serializeOpportunity(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
