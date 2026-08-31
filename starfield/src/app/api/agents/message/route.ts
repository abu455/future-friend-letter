import { NextRequest } from "next/server";
import { agentMessageSchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { generateMessageHeuristic, loadOpportunity } from "@/lib/close-agent";
import { generateAgentText } from "@/lib/ai";
import { publicRuntimeFlags } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, agentMessageSchema);
    const opp = await loadOpportunity(body.opportunityId);
    if (!opp) return jsonError("NOT_FOUND", "机会不存在", 404);
    const heuristic = generateMessageHeuristic(body.channel, opp);
    const llm = await generateAgentText(
      "你是工业装备销售写手。直接输出可发送文本，不要解释。",
      `渠道：${body.channel}。对象：${opp.contact?.fullName ?? "负责人"}，企业：${opp.company.name}。补充：${body.extra ?? "无"}`,
    );
    const message = {
      ...heuristic,
      body: llm.text || heuristic.body,
      engine: llm.meta.engine,
    };
    const workspace = await getWorkspace();
    await prisma.agentRun.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: body.opportunityId,
        type: "message",
        status: "completed",
        resultJson: JSON.stringify(message),
        demoEngine: llm.meta.engine === "demo",
        model: llm.meta.model,
        messages: {
          create: { role: "assistant", kind: "message", content: message.body },
        },
      },
    });
    await prisma.activity.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: body.opportunityId,
        type: "message",
        title: `生成${heuristic.label}`,
        detail: message.body.slice(0, 240),
        actor: "agent",
      },
    });
    return jsonOk(message, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
