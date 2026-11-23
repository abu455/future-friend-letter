import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { companyQuerySchema } from "@/lib/validators";
import { handleRouteError, jsonOk } from "@/lib/http";
import { serializeCompany } from "@/lib/serializers";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const parsed = companyQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const workspace = await getWorkspace();
    const rows = await prisma.company.findMany({
      where: {
        workspaceId: workspace.id,
        ...(parsed.industry ? { industry: parsed.industry } : {}),
        ...(parsed.region ? { region: { contains: parsed.region } } : {}),
        ...(parsed.q
          ? {
              OR: [
                { name: { contains: parsed.q } },
                { summary: { contains: parsed.q } },
                { domain: { contains: parsed.q } },
              ],
            }
          : {}),
      },
      orderBy: { icpFit: "desc" },
      take: 80,
    });
    return jsonOk(rows.map(serializeCompany), publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
