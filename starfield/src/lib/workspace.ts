import { prisma } from "./db";

export async function getWorkspace() {
  const workspace = await prisma.workspace.findFirst({
    include: { users: true },
    orderBy: { createdAt: "asc" },
  });
  if (!workspace) {
    throw new Error("工作区尚未初始化，请先运行 npm run db:setup");
  }
  return workspace;
}

export async function getDefaultOwnerId() {
  const workspace = await getWorkspace();
  return workspace.users[0]?.id ?? null;
}
