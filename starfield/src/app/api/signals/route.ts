import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { signalQuerySchema } from "@/lib/validators";
import { handleRouteError, jsonOk } from "@/lib/http";
import { serializeSignal } from "@/lib/serializers";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const parsed = signalQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const workspace = await getWorkspace();
    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (parsed.industry) where.industry = parsed.industry;
    if (parsed.region) where.region = { contains: parsed.region };
    if (parsed.grade) where.grade = parsed.grade;
    if (parsed.source) where.source = parsed.source;
    if (parsed.ids) where.id = { in: parsed.ids.split(",").filter(Boolean) };
    if (parsed.range && parsed.range !== "all") {
      const days = Number(parsed.range);
      const from = new Date(Date.now() - days * 86400000);
      where.publishedAt = { gte: from };
    }
    if (parsed.q) {
      where.OR = [
        { title: { contains: parsed.q } },
        { summary: { contains: parsed.q } },
        { companyName: { contains: parsed.q } },
      ];
    }
    const order =
      parsed.sort === "time"
        ? { publishedAt: "desc" as const }
        : parsed.sort === "strength"
          ? { demandStrength: "desc" as const }
          : parsed.sort === "urgency"
            ? { urgency: "desc" as const }
            : { aiScore: "desc" as const };

    const rows = await prisma.marketSignal.findMany({
      where,
      orderBy: order,
      take: 100,
    });
    return jsonOk(rows.map(serializeSignal), {
      ...publicRuntimeFlags(),
      count: rows.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
