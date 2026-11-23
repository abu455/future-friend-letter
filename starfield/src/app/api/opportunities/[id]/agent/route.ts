import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { startAgentSchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { runFullCloseAgent } from "@/lib/close-agent";
import { getWorkspace } from "@/lib/workspace";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req, startAgentSchema);
    const workspace = await getWorkspace();
    const opp = await prisma.opportunity.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!opp) return jsonError("NOT_FOUND", "机会不存在", 404);

    const result = await runFullCloseAgent(id);
    if (!result) return jsonError("NOT_FOUND", "无法读取机会数据", 404);

    const run = await prisma.agentRun.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: id,
        type: body.type,
        status: "completed",
        inputJson: JSON.stringify({ type: body.type }),
        resultJson: JSON.stringify(result),
        model: result.model,
        demoEngine: result.engine === "demo",
        messages: {
          create: [
            {
              role: "assistant",
              kind: "analysis",
              content: JSON.stringify(result.analysis),
            },
            {
              role: "assistant",
              kind: "strategy",
              content: JSON.stringify(result.strategy),
            },
            {
              role: "assistant",
              kind: "forecast",
              content: JSON.stringify(result.forecast),
            },
          ],
        },
      },
    });

    await prisma.opportunity.update({
      where: { id },
      data: {
        probability: result.forecast.probability,
        nextAction: result.strategy.nextBestAction,
        lastActivityAt: new Date(),
      },
    });

    await prisma.followUpTask.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: id,
        ownerId: opp.ownerId,
        title: result.strategy.nextBestAction.slice(0, 180),
        category: "ai_recommend",
        dueAt: new Date(Date.now() + 86400000),
        recommended: true,
        aiGenerated: true,
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: id,
        type: "agent",
        title: "成交智能体完成分析",
        detail: `成交概率预测 ${result.forecast.probability}%，引擎 ${result.engine}`,
        actor: "agent",
      },
    });

    return jsonOk({ runId: run.id, ...result }, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
