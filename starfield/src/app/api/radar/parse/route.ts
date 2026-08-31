import { NextRequest } from "next/server";
import { parseDemandSchema } from "@/lib/validators";
import { parseDemandWithAi } from "@/lib/ai";
import { handleRouteError, jsonOk, readJson } from "@/lib/http";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, parseDemandSchema);
    const result = await parseDemandWithAi(body.query);
    return jsonOk({ icp: result.icp, engine: result.meta }, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
