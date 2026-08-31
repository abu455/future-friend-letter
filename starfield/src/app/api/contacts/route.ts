import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { contactQuerySchema } from "@/lib/validators";
import { handleRouteError, jsonOk } from "@/lib/http";
import { serializeContact } from "@/lib/serializers";
import { publicRuntimeFlags } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const parsed = contactQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const workspace = await getWorkspace();
    const rows = await prisma.contact.findMany({
      where: {
        workspaceId: workspace.id,
        ...(parsed.companyId ? { companyId: parsed.companyId } : {}),
        ...(parsed.seniority ? { seniority: parsed.seniority } : {}),
        ...(parsed.q
          ? {
              OR: [
                { fullName: { contains: parsed.q } },
                { title: { contains: parsed.q } },
              ],
            }
          : {}),
      },
      include: { company: true },
      take: 80,
    });
    return jsonOk(rows.map(serializeContact), publicRuntimeFlags());
  } catch (error) {
    return handleRouteError(error);
  }
}
