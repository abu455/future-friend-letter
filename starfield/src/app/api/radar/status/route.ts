import { NextRequest } from "next/server";
import { getScanStatus } from "@/lib/scan-engine";
import { handleRouteError, jsonOk, jsonError } from "@/lib/http";
import { serializeScanJob } from "@/lib/serializers";
import { publicRuntimeFlags } from "@/lib/env";
import { SCAN_STEPS } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("jobId") ?? undefined;
    const job = await getScanStatus(id);
    if (!job) {
      return jsonError("NOT_FOUND", "没有正在进行的扫描任务", 404);
    }
    return jsonOk(
      { ...serializeScanJob(job), steps: SCAN_STEPS },
      publicRuntimeFlags(),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
