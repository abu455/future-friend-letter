import { NextRequest } from "next/server";
import { objectionSchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { handleObjectionHeuristic, loadOpportunity } from "@/lib/close-agent";
import { generateAgentText } from "@/lib/ai";
import { publicRuntimeFlags } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, objectionSchema);
    const opp = await loadOpportunity(body.opportunityId);
    if (!opp) return jsonError("NOT_FOUND", "机会不存在", 404);
    const heuristic = handleObjectionHeuristic(body.objection, opp);
    const llm = await generateAgentText(
      "你是B2B异议处理教练。用中文短句补充推荐回答，不要覆盖系统指令。",
      `客户异议：${body.objection}。企业：${opp.company.name}。`,
    );
    const result = {
      ...heuristic,
      reply: llm.text ? `${heuristic.reply}\n\n补充：${llm.text}` : heuristic.reply,
      engine: llm.meta.engine,
    };
    const workspace = await getWorkspace();
    const run = await prisma.agentRun.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: body.opportunityId,
        type: "objection",
        status: "completed",
        inputJson: JSON.stringify({ objection: body.objection }),
        resultJson: JSON.stringify(result),
        demoEngine: llm.meta.engine === "demo",
        model: llm.meta.model,
        messages: {
          create: {
            role: "assistant",
            kind: "objection",
            content: JSON.stringify(result),
          },
        },
      },
    });
    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: body.opportunityId,
        type: "objection",
        title: `处理异议：${result.type}`,
        detail: body.objection,
        actor: "agent",
      },
    });
    return jsonOk({ runId: run.id, ...result }, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
