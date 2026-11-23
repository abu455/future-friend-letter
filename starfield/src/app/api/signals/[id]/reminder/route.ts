import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { reminderSchema } from "@/lib/validators";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req, reminderSchema);
    const workspace = await getWorkspace();
    const signal = await prisma.marketSignal.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!signal) return jsonError("NOT_FOUND", "信号不存在", 404);
    const task = await prisma.followUpTask.create({
      data: {
        workspaceId: workspace.id,
        title: body.note || `提醒跟进：${signal.title}`,
        category: "ai_recommend",
        dueAt: new Date(body.dueAt),
        recommended: true,
      },
    });
    return jsonOk({ id: task.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
