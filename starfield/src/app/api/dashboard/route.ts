import { handleRouteError, jsonOk } from "@/lib/http";
import { getDashboardData } from "@/lib/queries";
import { serializeOpportunity, serializeSignal, serializeTask } from "@/lib/serializers";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getDashboardData();
    return jsonOk(
      {
        stats: data.stats,
        ranking: data.ranking.map(serializeOpportunity),
        recentSignals: data.recentSignals.map(serializeSignal),
        riskOpps: data.riskOpps.map((o) => ({
          ...serializeOpportunity(o),
          companyName: o.company.name,
        })),
        aiTasks: data.aiTasks.map((t) => ({
          ...serializeTask(t),
          opportunityName: t.opportunity?.name,
        })),
      },
      publicRuntimeFlags(),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
