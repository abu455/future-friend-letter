import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  DEMO_COMPANIES,
  DEMO_CONTACTS,
  DEMO_DATA_SOURCES,
  DEMO_OPPORTUNITIES,
  DEMO_SIGNALS,
  DEMO_TASKS,
} from "../src/lib/demo-data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed PostgreSQL");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: "demo-workspace" },
    update: { name: "星域科技 · 演示空间", demoMode: true },
    create: {
      id: "demo-workspace",
      name: "星域科技 · 演示空间",
      demoMode: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@xingyu.local" },
    update: { name: "林晓", workspaceId: workspace.id },
    create: {
      id: "demo-user",
      email: "demo@xingyu.local",
      name: "林晓",
      workspaceId: workspace.id,
    },
  });

  for (const source of DEMO_DATA_SOURCES) {
    await prisma.dataSource.upsert({
      where: { id: source.id },
      update: {
        name: source.name,
        type: source.type,
        status: source.status,
        configured: source.configured,
        enabled: source.enabled,
        discovered: source.discovered,
        errorMessage: source.errorMessage,
        usageCurrent: source.usageCurrent,
        usageLimit: source.usageLimit,
        lastScannedAt: source.lastScannedAt
          ? new Date(source.lastScannedAt)
          : null,
      },
      create: {
        ...source,
        workspaceId: workspace.id,
        lastScannedAt: source.lastScannedAt
          ? new Date(source.lastScannedAt)
          : undefined,
      },
    });
  }

  for (const company of DEMO_COMPANIES) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: company,
      create: { ...company, workspaceId: workspace.id },
    });
  }

  for (const contact of DEMO_CONTACTS) {
    await prisma.contact.upsert({
      where: { id: contact.id },
      update: contact,
      create: { ...contact, workspaceId: workspace.id },
    });
  }

  for (const signal of DEMO_SIGNALS) {
    const { companyName: _companyName, x: _x, y: _y, ...data } = signal;
    void _companyName;
    void _x;
    void _y;
    await prisma.marketSignal.upsert({
      where: { id: signal.id },
      update: { ...data, publishedAt: new Date(data.publishedAt) },
      create: {
        ...data,
        workspaceId: workspace.id,
        dataSourceId:
          signal.sourceName.includes("招聘")
            ? "ds-jobs"
            : signal.sourceName.includes("协会")
              ? "ds-association"
              : "ds-website",
        publishedAt: new Date(data.publishedAt),
      },
    });
  }

  for (const opportunity of DEMO_OPPORTUNITIES) {
    const {
      companyName: _companyName,
      primaryContactName: _primaryContactName,
      contactIds,
      stageHistory: _stageHistory,
      owner: _owner,
      ...data
    } = opportunity;
    void _companyName;
    void _primaryContactName;
    void _stageHistory;
    void _owner;
    await prisma.opportunity.upsert({
      where: { id: opportunity.id },
      update: {
        ...data,
        expectedCloseDate: new Date(data.expectedCloseDate),
        lastActivityAt: new Date(data.lastActivityAt),
        ownerId: user.id,
      },
      create: {
        ...data,
        workspaceId: workspace.id,
        ownerId: user.id,
        expectedCloseDate: new Date(data.expectedCloseDate),
        lastActivityAt: new Date(data.lastActivityAt),
        contacts: {
          create: contactIds.map((contactId) => ({
            contactId,
            role: contactId === data.primaryContactId ? "primary" : "stakeholder",
          })),
        },
        stageHistory: {
          create: {
            toStage: data.stage,
            note: "演示数据初始化",
          },
        },
      },
    });
  }

  for (const task of DEMO_TASKS) {
    const { opportunityName: _opportunityName, assignee: _assignee, ...data } =
      task;
    void _opportunityName;
    void _assignee;
    await prisma.followUpTask.upsert({
      where: { id: task.id },
      update: {
        ...data,
        dueAt: new Date(data.dueAt),
        assigneeId: user.id,
      },
      create: {
        ...data,
        workspaceId: workspace.id,
        dueAt: new Date(data.dueAt),
        assigneeId: user.id,
      },
    });
  }

  await prisma.messageTemplate.upsert({
    where: { id: "template-first-touch-en" },
    update: {},
    create: {
      id: "template-first-touch-en",
      workspaceId: workspace.id,
      name: "英文首次触达",
      channel: "email",
      language: "en",
      subject: "A practical efficiency benchmark for {{company}}",
      content:
        "Hi {{contact}}, we suggest validating material yield and changeover time with one real production file.",
      variables: ["company", "contact"],
    },
  });

  await prisma.sourceRecord.upsert({
    where: {
      dataSourceId_externalId: {
        dataSourceId: "ds-website",
        externalId: "demo-record-001",
      },
    },
    update: {},
    create: {
      id: "source-record-001",
      workspaceId: workspace.id,
      dataSourceId: "ds-website",
      marketSignalId: "sig-001",
      externalId: "demo-record-001",
      sourceUrl: "https://example.com/demo-source",
      rawContent: {
        label: "演示数据",
        text: "企业官网公开页面的已清洗演示摘要",
      },
      contentHash: "demo-content-hash-001",
    },
  });

  console.info(
    `Seeded ${DEMO_COMPANIES.length} companies, ${DEMO_SIGNALS.length} signals and ${DEMO_OPPORTUNITIES.length} opportunities.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
