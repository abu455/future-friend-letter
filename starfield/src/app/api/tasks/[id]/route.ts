import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { taskPatchSchema } from "@/lib/validators";
import { handleRouteError, jsonError, jsonOk, readJson } from "@/lib/http";
import { serializeTask } from "@/lib/serializers";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = await readJson(req, taskPatchSchema);
    const current = await prisma.followUpTask.findUnique({ where: { id } });
    if (!current) return jsonError("NOT_FOUND", "任务不存在", 404);
    const updated = await prisma.followUpTask.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.dueAt ? { dueAt: new Date(body.dueAt) } : {}),
        ...(body.ownerId ? { ownerId: body.ownerId } : {}),
        ...(body.title ? { title: body.title } : {}),
      },
    });
    if (body.status === "done" && current.opportunityId) {
      await prisma.activity.create({
        data: {
          workspaceId: current.workspaceId,
          opportunityId: current.opportunityId,
          type: "task",
          title: "完成行动",
          detail: current.title,
          actor: "user",
        },
      });
    }
    return jsonOk(serializeTask(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
