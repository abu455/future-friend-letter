import { NextRequest } from "next/server";
import { handleRouteError, jsonOk } from "@/lib/http";
import { buildTrendSeries } from "@/lib/queries";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const range = Number(req.nextUrl.searchParams.get("range") ?? 30);
    const industry = req.nextUrl.searchParams.get("industry") ?? undefined;
    const safe = range === 7 || range === 90 ? range : 30;
    const series = buildTrendSeries(safe, industry);
    return jsonOk({ range: safe, series, isDemo: true }, publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
