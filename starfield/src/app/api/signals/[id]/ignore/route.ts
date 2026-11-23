import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const workspace = await getWorkspace();
    const signal = await prisma.marketSignal.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!signal) return jsonError("NOT_FOUND", "信号不存在", 404);
    const updated = await prisma.marketSignal.update({
      where: { id },
      data: { status: "ignored" },
    });
    return jsonOk({ id: updated.id, status: updated.status });
  } catch (error) {
    return handleRouteError(error);
  }
}
