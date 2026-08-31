import { NextRequest } from "next/server";
import { closeAgentSchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { runFullCloseAgent } from "@/lib/close-agent";
import { publicRuntimeFlags } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, closeAgentSchema);
    const result = await runFullCloseAgent(body.opportunityId);
    if (!result) return jsonError("NOT_FOUND", "机会不存在", 404);
    const workspace = await getWorkspace();
    await prisma.agentRun.create({
      data: {
        workspaceId: workspace.id,
        opportunityId: body.opportunityId,
        type: body.focus,
        status: "completed",
        resultJson: JSON.stringify(result),
        model: result.model,
        demoEngine: result.engine === "demo",
      },
    });
    return jsonOk(result, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
