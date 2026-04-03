import { prisma } from "#/db";
import type { TaskConfig } from "#/lib/tasks/task-executor";

export async function findSchedulerAdminUser() {
  return prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
}

export async function getExistingTaskRows(userId: string) {
  return prisma.task.findMany({
    where: { userId },
  });
}

export async function markMissingTaskRows(
  existingTasks: Awaited<ReturnType<typeof getExistingTaskRows>>,
  foundFiles: Set<string>,
) {
  for (const existing of existingTasks) {
    if (!foundFiles.has(existing.filename) && existing.fileExists) {
      await prisma.task.update({
        where: { id: existing.id },
        data: { fileExists: false },
      });
    }
  }
}

export async function upsertTaskRow(filename: string, config: TaskConfig, userId: string): Promise<void> {
  await prisma.task.upsert({
    where: { filename },
    create: {
      filename,
      title: config.title,
      cron: config.cron,
      model: config.model ?? "claude-haiku-4-5",
      effort: config.effort ?? "low",
      enabled: config.enabled,
      endDate: config.endDate ? new Date(config.endDate) : null,
      maxTokens: config.maxTokens ?? null,
      timezone: config.timezone ?? null,
      fileExists: true,
      userId,
    },
    update: {
      title: config.title,
      cron: config.cron,
      model: config.model ?? "claude-haiku-4-5",
      effort: config.effort ?? "low",
      enabled: config.enabled,
      endDate: config.endDate ? new Date(config.endDate) : null,
      maxTokens: config.maxTokens ?? null,
      timezone: config.timezone ?? null,
      fileExists: true,
    },
  });
}
