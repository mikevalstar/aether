import { promises as fs } from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { Cron } from "croner";
import matter from "gray-matter";
import { prisma } from "#/db";
import { taskFrontmatterSchema, taskValidator } from "#/lib/ai-config-validators/task";
import { logger } from "#/lib/logger";
import { startSystemTasks, stopSystemTasks } from "#/lib/system-tasks";
import { executeTask, type TaskConfig } from "#/lib/task-executor";

// ── Types ────────────────────────────────────────────────────────────

export type ScheduledTaskInfo = {
  filename: string;
  title: string;
  cron: string;
  model: string;
  effort: string;
  enabled: boolean;
  endDate?: string;
  maxTokens?: number;
  timezone?: string;
  nextRun: Date | null;
  isBusy: boolean;
  isRunning: boolean;
};

type ScheduledTask = {
  config: TaskConfig;
  job: Cron | null;
};

// ── State ────────────────────────────────────────────────────────────

const tasks = new Map<string, ScheduledTask>();
let watcher: ReturnType<typeof chokidar.watch> | null = null;
let initPromise: Promise<void> | null = null;

const GRACE_WINDOW_MS = 60_000; // 60 seconds

// ── Public API ───────────────────────────────────────────────────────

export function initScheduler(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = doInit();
  return initPromise;
}

export function getScheduledTasks(): ScheduledTaskInfo[] {
  return Array.from(tasks.entries()).map(([filename, { config, job }]) => ({
    filename,
    title: config.title,
    cron: config.cron,
    model: config.model ?? "claude-haiku-4-5",
    effort: config.effort ?? "low",
    enabled: config.enabled,
    endDate: config.endDate,
    maxTokens: config.maxTokens,
    timezone: config.timezone,
    nextRun: job?.nextRun() ?? null,
    isBusy: job?.isBusy() ?? false,
    isRunning: job?.isRunning() ?? false,
  }));
}

export async function triggerTask(filename: string): Promise<void> {
  const task = tasks.get(filename);
  if (!task) throw new Error(`Task not found: ${filename}`);

  logger.info({ task: filename }, "Manually triggering task");
  await executeTask(filename, task.config);
}

export async function closeScheduler(): Promise<void> {
  stopSystemTasks();

  for (const [, { job }] of tasks) {
    job?.stop();
  }
  tasks.clear();

  if (watcher) {
    await watcher.close();
    watcher = null;
  }

  initPromise = null;
}

// ── Init ─────────────────────────────────────────────────────────────

async function doInit(): Promise<void> {
  const tasksDir = getTasksDir();
  if (!tasksDir) {
    logger.info("No AI config dir configured, skipping task scheduler");
    return;
  }

  // Ensure the tasks directory exists
  try {
    await fs.mkdir(tasksDir, { recursive: true });
  } catch {
    // ignore
  }

  const cronDisabled = process.env.DISABLE_CRON === "true";
  if (cronDisabled) {
    logger.info("DISABLE_CRON=true — scheduler disabled, syncing task DB only");
  }

  // Read all task files
  let files: string[];
  try {
    files = await fs.readdir(tasksDir);
  } catch {
    logger.warn({ dir: tasksDir }, "Cannot read tasks directory");
    return;
  }

  // Find admin user for DB operations
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    logger.warn("No admin user found, skipping task scheduler init");
    return;
  }

  // Get existing task rows for restart guard
  const existingTasks = await prisma.task.findMany({
    where: { userId: adminUser.id },
  });
  const taskRowsByFilename = new Map(existingTasks.map((t) => [t.filename, t]));

  // Mark all existing tasks as fileExists: false initially, then flip as we find files
  const foundFiles = new Set<string>();

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(tasksDir, file);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) continue;

    const config = await parseTaskFile(filePath);
    if (!config) continue;

    foundFiles.add(file);

    // Upsert task row
    await upsertTaskRow(file, config, adminUser.id);

    if (cronDisabled) continue;

    // Create cron job
    const existingRow = taskRowsByFilename.get(file);
    const job = createCronJob(file, config, existingRow?.lastRunAt ?? null);
    tasks.set(file, { config, job });
  }

  // Mark deleted files
  for (const existing of existingTasks) {
    if (!foundFiles.has(existing.filename) && existing.fileExists) {
      await prisma.task.update({
        where: { id: existing.id },
        data: { fileExists: false },
      });
    }
  }

  if (cronDisabled) return;

  // Start file watcher
  watcher = chokidar.watch(tasksDir, {
    ignored: (filePath, stats) => {
      if (stats?.isFile() && !filePath.endsWith(".md")) return true;
      return false;
    },
    persistent: true,
    ignoreInitial: true,
  });

  watcher
    .on("add", (filePath: string) => void handleFileAddOrChange(filePath))
    .on("change", (filePath: string) => void handleFileAddOrChange(filePath))
    .on("unlink", (filePath: string) => void handleFileDelete(filePath))
    .on("error", (err: unknown) => {
      logger.error({ err }, "Task watcher error");
    });

  // Register code-defined system tasks (cleanup, etc.)
  startSystemTasks();

  const taskCount = tasks.size;
  logger.info({ taskCount, dir: tasksDir }, `Task scheduler initialized with ${taskCount} task(s)`);
}

// ── File Handlers ────────────────────────────────────────────────────

async function handleFileAddOrChange(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  if (!filename.endsWith(".md")) return;

  const config = await parseTaskFile(filePath);
  if (!config) return;

  // Stop existing job
  const existing = tasks.get(filename);
  existing?.job?.stop();

  // Find admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) return;

  await upsertTaskRow(filename, config, adminUser.id);

  const taskRow = await prisma.task.findUnique({ where: { filename } });
  const job = createCronJob(filename, config, taskRow?.lastRunAt ?? null);
  tasks.set(filename, { config, job });

  logger.info({ task: filename, cron: config.cron }, "Task updated");
}

async function handleFileDelete(filePath: string): Promise<void> {
  const filename = path.basename(filePath);

  const existing = tasks.get(filename);
  existing?.job?.stop();
  tasks.delete(filename);

  try {
    await prisma.task.update({
      where: { filename },
      data: { fileExists: false },
    });
  } catch {
    // row may not exist
  }

  logger.info({ task: filename }, "Task file deleted");
}

// ── Helpers ──────────────────────────────────────────────────────────

function getTasksDir(): string {
  const obsidianDir = process.env.OBSIDIAN_DIR ?? "";
  const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG ?? "";
  if (!obsidianDir || !aiConfigRel) return "";
  return path.join(obsidianDir, aiConfigRel, "tasks");
}

async function parseTaskFile(filePath: string): Promise<TaskConfig | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = matter(content);
    const fm = parsed.data as Record<string, unknown>;

    const validation = taskValidator.validate(fm, parsed.content);
    if (!validation.isValid) {
      logger.warn({ file: filePath, errors: validation.errors }, "Task validation failed");
      return null;
    }

    const data = taskFrontmatterSchema.parse(fm);

    return {
      title: data.title,
      cron: data.cron,
      model: data.model,
      effort: data.effort,
      enabled: data.enabled !== false,
      endDate: data.endDate,
      maxTokens: data.maxTokens,
      timezone: data.timezone,
      notification: data.notification ?? "notify",
      body: parsed.content,
    };
  } catch (err) {
    logger.error({ file: filePath, err }, "Failed to parse task file");
    return null;
  }
}

function createCronJob(filename: string, config: TaskConfig, lastRunAt: Date | null): Cron | null {
  if (!config.enabled) {
    // Create a paused job so nextRun is still available
    try {
      return new Cron(config.cron, {
        name: config.title,
        timezone: config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        paused: true,
        unref: true,
        ...(config.endDate ? { stopAt: config.endDate } : {}),
      });
    } catch {
      return null;
    }
  }

  // Restart guard: check if next run is within grace window of now
  let startAt: Date | undefined;
  if (lastRunAt) {
    try {
      const tz = config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tempJob = new Cron(config.cron, { paused: true, timezone: tz });
      const nextAfterLastRun = tempJob.nextRun(lastRunAt);
      tempJob.stop();
      if (nextAfterLastRun) {
        const now = Date.now();
        const nextTime = nextAfterLastRun.getTime();
        if (nextTime <= now && now - nextTime < GRACE_WINDOW_MS) {
          // The next scheduled run just passed — skip it to avoid double-run
          const skipJob = new Cron(config.cron, { paused: true, timezone: tz });
          const futureRun = skipJob.nextRun();
          skipJob.stop();
          if (futureRun) {
            startAt = futureRun;
          }
        }
      }
    } catch {
      // ignore, just don't apply restart guard
    }
  }

  try {
    return new Cron(
      config.cron,
      {
        name: config.title,
        timezone: config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        protect: true,
        catch: (err: unknown) => {
          logger.error({ task: filename, err }, "Task cron error");
        },
        unref: true,
        ...(config.endDate ? { stopAt: config.endDate } : {}),
        ...(startAt ? { startAt } : {}),
      },
      () => {
        void executeTask(filename, config);
      },
    );
  } catch (err) {
    logger.error({ task: filename, err }, "Failed to create cron job");
    return null;
  }
}

async function upsertTaskRow(filename: string, config: TaskConfig, userId: string): Promise<void> {
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

// ── Eager initialization ─────────────────────────────────────────────
void initScheduler();

// ── Cleanup ──────────────────────────────────────────────────────────
function handleShutdown() {
  void closeScheduler();
}
process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void closeScheduler();
  });
}
