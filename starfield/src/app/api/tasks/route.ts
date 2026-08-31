import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { handleRouteError, jsonOk } from "@/lib/http";
import { serializeTask } from "@/lib/serializers";
import { batchTaskSchema } from "@/lib/validators";
import { readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const workspace = await getWorkspace();
    const rows = await prisma.followUpTask.findMany({
      where: { workspaceId: workspace.id },
      include: { opportunity: { include: { company: true } } },
      orderBy: { dueAt: "asc" },
    });
    return jsonOk(
      rows.map((t) => ({
        ...serializeTask(t),
        opportunityName: t.opportunity?.name,
        companyName: t.opportunity?.company.name,
        opportunityStage: t.opportunity?.stage,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, batchTaskSchema);
    const dueAt =
      body.action === "snooze"
        ? new Date(Date.now() + 2 * 86400000)
        : body.dueAt
          ? new Date(body.dueAt)
          : undefined;
    await prisma.followUpTask.updateMany({
      where: { id: { in: body.ids } },
      data: {
        ...(body.action === "complete" ? { status: "done" } : {}),
        ...(body.action === "snooze" ? { status: "snoozed", dueAt } : {}),
        ...(body.action === "reassign" && body.ownerId ? { ownerId: body.ownerId } : {}),
      },
    });
    return jsonOk({ updated: body.ids.length, action: body.action });
  } catch (error) {
    return handleRouteError(error);
  }
}
