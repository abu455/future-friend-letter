import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { testApolloConnection } from "@/lib/apollo";
import { hasQccKey } from "@/lib/env";
import { z } from "zod";

export const runtime = "nodejs";

const toggleSchema = z.object({
  enabled: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const workspace = await getWorkspace();
    const ds = await prisma.dataSource.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!ds) return jsonError("NOT_FOUND", "数据源不存在", 404);

    const action = req.nextUrl.searchParams.get("action") || "test";
    if (action === "toggle") {
      const body = toggleSchema.parse(await req.json().catch(() => ({})));
      const enabled = body.enabled ?? !ds.enabled;
      const updated = await prisma.dataSource.update({
        where: { id },
        data: {
          enabled,
          status: enabled ? (ds.configured ? "connected" : "unconfigured") : "paused",
        },
      });
      return jsonOk({ id: updated.id, enabled: updated.enabled, status: updated.status });
    }

    if (ds.type === "apollo") {
      const result = await testApolloConnection();
      await prisma.dataSource.update({
        where: { id },
        data: {
          status: result.ok ? "connected" : "error",
          errorMessage: result.ok ? null : result.message,
          lastScanAt: new Date(),
        },
      });
      return jsonOk(result);
    }

    if (ds.type === "qcc") {
      const ok = hasQccKey();
      const result = {
        ok,
        code: ok ? "OK" : "QCC_NOT_CONFIGURED",
        message: ok
          ? "已配置企查查密钥（真实查询适配器尚未接入生产爬取，仅完成连通性标记）。"
          : "未配置 QCC_APP_KEY / QCC_SECRET_KEY，企查查未接入。",
      };
      await prisma.dataSource.update({
        where: { id },
        data: {
          status: ok ? "connected" : "unconfigured",
          errorMessage: result.ok ? null : result.message,
          lastScanAt: new Date(),
        },
      });
      return jsonOk(result);
    }

    await prisma.dataSource.update({
      where: { id },
      data: {
        status: ds.enabled ? "connected" : "paused",
        lastScanAt: new Date(),
        errorMessage: null,
      },
    });
    return jsonOk({
      ok: true,
      code: "OK",
      message: ds.enabled
        ? `${ds.name} 演示连接正常，最近一次发现 ${ds.lastFoundCount} 条（演示数据）。`
        : "数据源已暂停",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
