import { after } from "next/server";
import { NextRequest } from "next/server";
import { scanRequestSchema } from "@/lib/validators";
import { createOrResumeScan, runScanPipeline } from "@/lib/scan-engine";
import { handleRouteError, jsonOk, jsonError, clientKey, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getScanRateLimit, publicRuntimeFlags } from "@/lib/env";
import { serializeScanJob } from "@/lib/serializers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const limit = rateLimit(`scan:${clientKey(req)}`, getScanRateLimit());
    if (!limit.ok) {
      return jsonError("RATE_LIMITED", "扫描过于频繁，请稍后再试。", 429, {
        resetAt: limit.resetAt,
      });
    }
    const body = await readJson(req, scanRequestSchema);
    const idempotencyKey =
      body.idempotencyKey ||
      req.headers.get("idempotency-key") ||
      `scan-${Buffer.from(body.query).toString("base64").slice(0, 24)}-${new Date()
        .toISOString()
        .slice(0, 13)}`;
    const job = await createOrResumeScan({
      query: body.query,
      icp: body.icp,
      idempotencyKey,
    });
    if (job.status === "queued" || (job.status === "running" && job.step <= 1 && job.foundCount === 0)) {
      after(() =>
        runScanPipeline(job.id).catch((error) => {
          console.error("[scan]", error instanceof Error ? error.message : error);
        }),
      );
    }
    return jsonOk(serializeScanJob(job), { ...publicRuntimeFlags(), idempotent: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
