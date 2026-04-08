import { Cron } from "croner";
import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { getUserPreferences } from "#/lib/preferences.server";
import { createPluginContext } from "#/plugins/plugin-context";
import type { AetherPlugin } from "#/plugins/types";

// ── Types ────────────────────────────────────────────────────────────

type SystemTask = {
  name: string;
  cron: string;
  handler: () => Promise<void>;
};

// ── System task definitions ──────────────────────────────────────────

const systemTaskDefs: SystemTask[] = [
  {
    name: "cleanup-stale-records",
    cron: "0 * * * *", // every hour
    handler: cleanupStaleRecords,
  },
  {
    name: "cleanup-old-notifications",
    cron: "0 3 * * *", // daily at 3 AM
    handler: cleanupOldNotifications,
  },
  {
    name: "calendar-sync",
    cron: "* * * * *", // every minute — checks per-feed intervals internally
    handler: async () => {
      const { syncCalendarFeeds } = await import("#/lib/calendar/sync");
      await syncCalendarFeeds();
    },
  },
  {
    name: "scheduled-notifications",
    cron: "* * * * *", // every minute — delivers any due scheduled notifications
    handler: async () => {
      const { processDueScheduledNotifications } = await import("#/lib/scheduled-notifications-worker");
      await processDueScheduledNotifications();
    },
  },
];

// ── Running jobs ─────────────────────────────────────────────────────

const systemJobs: Cron[] = [];

export async function startSystemTasks(): Promise<void> {
  // Register built-in system tasks
  for (const def of systemTaskDefs) {
    try {
      const job = new Cron(
        def.cron,
        {
          name: `system:${def.name}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          protect: true,
          catch: (err: unknown) => {
            logger.error({ systemTask: def.name, err }, "System task error");
          },
          unref: true,
        },
        () => {
          def.handler().catch((err) => {
            logger.error({ systemTask: def.name, err }, "Unhandled system task error");
          });
        },
      );
      systemJobs.push(job);
      logger.info({ systemTask: def.name, cron: def.cron }, "System task registered");
    } catch (err) {
      logger.error({ systemTask: def.name, err }, "Failed to register system task");
    }
  }

  // Register plugin scheduled tasks
  await registerPluginScheduledTasks();

  // Catch up on any scheduled notifications that became due while the server was down.
  // This runs once at startup in addition to the per-minute cron job.
  void (async () => {
    try {
      const { processDueScheduledNotifications } = await import("#/lib/scheduled-notifications-worker");
      const result = await processDueScheduledNotifications();
      if (result.claimed > 0) {
        logger.info({ result }, "Startup catch-up processed pending scheduled notifications");
      }
    } catch (err) {
      logger.error({ err }, "Startup catch-up for scheduled notifications failed");
    }
  })();
}

export function stopSystemTasks(): void {
  for (const job of systemJobs) {
    job.stop();
  }
  systemJobs.length = 0;
}

// ── Task: Cleanup old notifications ──────────────────────────────────

async function cleanupOldNotifications(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await prisma.notification.deleteMany({
    where: { read: true, createdAt: { lt: cutoff } },
  });

  if (result.count === 0) return;

  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) return;

  await prisma.activityLog.create({
    data: {
      type: "system_task",
      summary: `Cleaned up ${result.count} old notification(s)`,
      metadata: JSON.stringify({ taskName: "cleanup-old-notifications", deleted: result.count }),
      userId: adminUser.id,
    },
  });

  logger.info({ deleted: result.count }, "Cleaned up old notifications");
}

// ── Task: Cleanup stale records ──────────────────────────────────────

async function cleanupStaleRecords(): Promise<void> {
  // Find stale tasks: file deleted + never run
  const staleTasks = await prisma.task.findMany({
    where: { fileExists: false, lastRunAt: null },
    select: { id: true, filename: true },
  });

  // Find stale workflows: file deleted + never run
  const staleWorkflows = await prisma.workflow.findMany({
    where: { fileExists: false, lastRunAt: null },
    select: { id: true, filename: true },
  });

  if (staleTasks.length === 0 && staleWorkflows.length === 0) {
    return; // nothing to do — no activity log
  }

  // Delete stale records
  if (staleTasks.length > 0) {
    await prisma.task.deleteMany({
      where: { id: { in: staleTasks.map((t) => t.id) } },
    });
  }

  if (staleWorkflows.length > 0) {
    await prisma.workflow.deleteMany({
      where: { id: { in: staleWorkflows.map((w) => w.id) } },
    });
  }

  // Log activity
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) return;

  const parts: string[] = [];
  if (staleTasks.length > 0) {
    parts.push(`${staleTasks.length} stale task(s)`);
  }
  if (staleWorkflows.length > 0) {
    parts.push(`${staleWorkflows.length} stale workflow(s)`);
  }

  await prisma.activityLog.create({
    data: {
      type: "system_task",
      summary: `Cleaned up ${parts.join(" and ")}`,
      metadata: JSON.stringify({
        taskName: "cleanup-stale-records",
        deletedTasks: staleTasks.map((t) => t.filename),
        deletedWorkflows: staleWorkflows.map((w) => w.filename),
      }),
      userId: adminUser.id,
    },
  });

  logger.info(
    {
      deletedTasks: staleTasks.length,
      deletedWorkflows: staleWorkflows.length,
    },
    `Cleaned up ${parts.join(" and ")}`,
  );
}

// ── Plugin scheduled tasks ──────────────────────────────────────────

async function registerPluginScheduledTasks(): Promise<void> {
  const { serverPlugins } = await import("#/plugins/index.server");

  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) {
    logger.info("No admin user — skipping plugin scheduled tasks");
    return;
  }

  const prefs = await getUserPreferences(adminUser.id);
  const enabledIds = new Set(prefs.enabledPlugins ?? []);

  for (const plugin of serverPlugins as AetherPlugin[]) {
    if (!enabledIds.has(plugin.meta.id)) continue;
    if (!plugin.server?.scheduledTasks?.length) continue;

    for (const task of plugin.server.scheduledTasks) {
      const fullName = `plugin:${plugin.meta.id}:${task.name}`;
      try {
        const ctx = createPluginContext(plugin.meta.id, adminUser.id);
        const job = new Cron(
          task.cron,
          {
            name: fullName,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            protect: true,
            catch: (err: unknown) => {
              logger.error({ pluginTask: fullName, err }, "Plugin scheduled task error");
            },
            unref: true,
          },
          () => {
            task.handler(ctx).catch((err) => {
              logger.error({ pluginTask: fullName, err }, "Unhandled plugin scheduled task error");
            });
          },
        );
        systemJobs.push(job);
        logger.info({ pluginTask: fullName, cron: task.cron }, "Plugin scheduled task registered");
      } catch (err) {
        logger.error({ pluginTask: fullName, err }, "Failed to register plugin scheduled task");
      }
    }
  }
}
