import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspace, getDefaultOwnerId } from "@/lib/workspace";
import { handleRouteError, jsonOk } from "@/lib/http";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  person: z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    seniority: z.string().nullable().optional(),
    organization: z.string(),
    domain: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    enrichmentStatus: z.string(),
    isDemo: z.boolean().optional(),
  }),
  mode: z.enum(["list", "opportunity", "agent"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const workspace = await getWorkspace();
    let company = await prisma.company.findFirst({
      where: {
        workspaceId: workspace.id,
        OR: [
          { name: body.person.organization },
          ...(body.person.domain ? [{ domain: body.person.domain }] : []),
        ],
      },
    });
    if (!company) {
      company = await prisma.company.create({
        data: {
          workspaceId: workspace.id,
          name: body.person.organization,
          industry: "工业自动化",
          region: body.person.location || "未知",
          country: body.person.location || "未知",
          employeeRange: "未知",
          domain: body.person.domain,
          summary: `由决策人搜索加入。${body.person.isDemo ? "演示数据。" : ""}`,
          source: body.person.isDemo ? "demo-search" : "apollo",
          isDemo: Boolean(body.person.isDemo),
        },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        companyId: company.id,
        fullName: body.person.name,
        title: body.person.title,
        seniority: body.person.seniority || "unknown",
        location: body.person.location,
        email: body.person.email,
        phone: body.person.phone,
        linkedinUrl: body.person.linkedinUrl,
        enrichmentStatus: body.person.email || body.person.phone ? "available" : "needs_enrichment",
        isDecisionMaker: true,
        isDemo: Boolean(body.person.isDemo),
        source: body.person.isDemo ? "demo" : "apollo",
      },
    });

    if (body.mode === "list") {
      return jsonOk({ contactId: contact.id, companyId: company.id, linked: "list" });
    }

    const ownerId = await getDefaultOwnerId();
    const opp = await prisma.opportunity.create({
      data: {
        workspaceId: workspace.id,
        name: `${company.name} · 决策人触达`,
        companyId: company.id,
        contactId: contact.id,
        source: body.person.isDemo ? "demo-search" : "apollo",
        industry: company.industry,
        score: 72,
        amount: 800000,
        probability: 22,
        stage: "to_contact",
        ownerId,
        nextAction: `触达 ${contact.fullName}（${contact.title}）`,
        lastActivityAt: new Date(),
        isDemo: Boolean(body.person.isDemo),
      },
    });
    await prisma.opportunityStageHistory.create({
      data: {
        opportunityId: opp.id,
        fromStage: null,
        toStage: "to_contact",
        note: "由决策人搜索转为机会",
      },
    });
    return jsonOk({
      contactId: contact.id,
      companyId: company.id,
      opportunityId: opp.id,
      linked: body.mode,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
