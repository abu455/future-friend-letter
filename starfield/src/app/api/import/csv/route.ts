import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace } from "@/lib/workspace";
import { handleRouteError, jsonError, jsonOk } from "@/lib/http";
import { csvImportSchema } from "@/lib/validators";
import { readJson } from "@/lib/http";
import { sanitizeHtmlSnippet } from "@/lib/sanitize";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req, csvImportSchema);
    const workspace = await getWorkspace();
    const lines = body.csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return jsonError("VALIDATION_ERROR", "CSV 至少需要表头和一行数据", 422);
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = header.findIndex((h) => ["name", "企业", "company"].includes(h));
    const industryIdx = header.findIndex((h) => ["industry", "行业"].includes(h));
    const regionIdx = header.findIndex((h) => ["region", "地区"].includes(h));
    if (nameIdx < 0) return jsonError("VALIDATION_ERROR", "CSV 需要 name/企业 列", 422);

    let created = 0;
    for (const line of lines.slice(1, 51)) {
      const cols = line.split(",").map((c) => sanitizeHtmlSnippet(c.trim().replace(/^"|"$/g, "")));
      const name = cols[nameIdx];
      if (!name) continue;
      await prisma.company.create({
        data: {
          workspaceId: workspace.id,
          name,
          industry: cols[industryIdx] || "工业自动化",
          region: cols[regionIdx] || "未知",
          country: cols[regionIdx] || "未知",
          employeeRange: "未知",
          summary: "由 CSV 导入的演示企业，需人工核验。",
          source: "csv",
          isDemo: true,
        },
      });
      created += 1;
    }

    const ds = await prisma.dataSource.findFirst({
      where: { workspaceId: workspace.id, type: "csv" },
    });
    if (ds) {
      await prisma.dataSource.update({
        where: { id: ds.id },
        data: { lastScanAt: new Date(), lastFoundCount: created, status: "connected" },
      });
    }
    return jsonOk({ created });
  } catch (error) {
    return handleRouteError(error);
  }
}
