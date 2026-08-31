import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { handleRouteError, jsonOk } from "@/lib/http";
import { serializeDataSource } from "@/lib/serializers";
import { hasApolloKey, hasQccKey, publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    const workspace = await getWorkspace();
    const rows = await prisma.dataSource.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
    });
    const mapped = rows.map((row) => {
      const serialized = serializeDataSource(row);
      if (row.type === "apollo") {
        serialized.configured = hasApolloKey();
        serialized.status = hasApolloKey() ? "connected" : "unconfigured";
        serialized.errorMessage = hasApolloKey()
          ? null
          : "未配置 APOLLO_API_KEY";
      }
      if (row.type === "qcc") {
        serialized.configured = hasQccKey();
        serialized.status = hasQccKey() ? "connected" : "unconfigured";
        serialized.errorMessage = hasQccKey() ? null : "未配置企查查密钥，真实接口未接入。";
      }
      return serialized;
    });
    return jsonOk(mapped, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
