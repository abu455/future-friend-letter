import { NextRequest } from "next/server";
import { apolloSearchSchema } from "@/lib/validators";
import { handleRouteError, jsonOk, jsonError } from "@/lib/http";
import { searchApollo, searchLocalDemoPeople } from "@/lib/apollo";
import { publicRuntimeFlags, hasApolloKey } from "@/lib/env";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET() {
  return jsonOk(
    {
      configured: hasApolloKey(),
      endpoint: "https://api.apollo.io/api/v1/mixed_people/api_search",
      header: "x-api-key（仅服务端）",
      note: hasApolloKey()
        ? "已配置密钥，搜索将请求 Apollo。"
        : "未配置 APOLLO_API_KEY。不会把模拟结果伪装成 Apollo 实时数据。",
    },
    publicRuntimeFlags(),
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = apolloSearchSchema.parse(await req.json().catch(() => ({})));
    try {
      const live = await searchApollo(body);
      return jsonOk(live, { ...publicRuntimeFlags(), source: "apollo" });
    } catch (error) {
      if (error instanceof AppError && error.code === "APOLLO_NOT_CONFIGURED") {
        if (body.useDemoFallback) {
          const demo = await searchLocalDemoPeople(body);
          return jsonOk(demo, {
            ...publicRuntimeFlags(),
            source: "demo",
            warning: "API Key 未配置，以下为明确标记的演示联系人，不是 Apollo 实时结果。",
          });
        }
        return jsonError(error.code, error.message, 200, {
          canUseDemoFallback: true,
        });
      }
      if (error instanceof AppError) {
        return jsonError(error.code, error.message, error.status, error.details);
      }
      throw error;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
