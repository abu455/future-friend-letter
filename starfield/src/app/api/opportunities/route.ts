import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultOwnerId, getWorkspace } from "@/lib/workspace";
import { createOpportunitySchema, opportunityQuerySchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { serializeOpportunity } from "@/lib/serializers";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const parsed = opportunityQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const workspace = await getWorkspace();
    const rows = await prisma.opportunity.findMany({
      where: {
        workspaceId: workspace.id,
        ...(parsed.stage ? { stage: parsed.stage } : {}),
        ...(parsed.q
          ? {
              OR: [
                { name: { contains: parsed.q } },
                { industry: { contains: parsed.q } },
              ],
            }
          : {}),
      },
      include: { company: true, contact: true },
      orderBy: { score: "desc" },
    });
    return jsonOk(rows.map(serializeOpportunity), publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, createOpportunitySchema);
    const workspace = await getWorkspace();
    const company = await prisma.company.findFirst({
      where: { id: body.companyId, workspaceId: workspace.id },
    });
    if (!company) return jsonError("NOT_FOUND", "企业不存在", 404);
    const ownerId = await getDefaultOwnerId();
    const opp = await prisma.opportunity.create({
      data: {
        workspaceId: workspace.id,
        name: body.name,
        companyId: company.id,
        contactId: body.contactId,
        signalId: body.signalId,
        source: body.source,
        industry: body.industry,
        amount: body.amount,
        score: body.score ?? 60,
        probability: 20,
        stage: "new",
        ownerId,
        nextAction: body.nextAction ?? "研判客户并启动成交智能体",
        lastActivityAt: new Date(),
        isDemo: true,
      },
      include: { company: true, contact: true },
    });
    await prisma.opportunityStageHistory.create({
      data: { opportunityId: opp.id, fromStage: null, toStage: "new", note: "手动创建" },
    });
    return jsonOk(serializeOpportunity(opp), { created: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
