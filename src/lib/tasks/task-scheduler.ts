import { promises as fs } from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { Cron, scheduledJobs } from "croner";
import { prisma } from "#/db";
import { logger } from "#/lib/logger";
import { startupTimer } from "#/lib/startup-timer";
import { startSystemTasks, stopSystemTasks } from "#/lib/system-tasks";
import { executeTask, type TaskConfig } from "#/lib/tasks/task-executor";
import { getTasksDir, type LoadedTaskConfig, loadTaskConfigs, parseTaskFile } from "#/lib/tasks/task-loader";
import {
  findSchedulerAdminUser,
  getExistingTaskRows,
  markMissingTaskRows,
  upsertTaskRow,
} from "#/lib/tasks/task-sync";

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
// Store scheduler state on globalThis so it survives Vite HMR module replacement.
// Without this, HMR creates a fresh empty Map while the app-runtime's global
// startPromise still references the old (resolved) init — causing "task not found".

type SchedulerState = {
  tasks: Map<string, ScheduledTask>;
  watcher: ReturnType<typeof chokidar.watch> | null;
  initPromise: Promise<void> | null;
};

declare global {
  var __aetherSchedulerState: SchedulerState | undefined;
}

globalThis.__aetherSchedulerState ??= {
  tasks: new Map(),
  watcher: null,
  initPromise: null,
};

const { tasks } = globalThis.__aetherSchedulerState;

const state = globalThis.__aetherSchedulerState;

function getWatcher() {
  return state.watcher;
}
function setWatcher(w: ReturnType<typeof chokidar.watch> | null) {
  state.watcher = w;
}
function getInitPromise() {
  return state.initPromise;
}
function setInitPromise(p: Promise<void> | null) {
  state.initPromise = p;
}

const GRACE_WINDOW_MS = 60_000; // 60 seconds

// ── Public API ───────────────────────────────────────────────────────

export function initScheduler(): Promise<void> {
  const existing = getInitPromise();
  if (existing) return existing;

  logger.info("Initializing task scheduler");

  const p = doInit();
  setInitPromise(p);
  return p;
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
  if (!task) {
    logger.error({ filename, loadedTasks: Array.from(tasks.keys()), count: tasks.size }, "Task not found in scheduler map");
    throw new Error(`Task not found: ${filename}`);
  }

  logger.info({ task: filename }, "Manually triggering task");
  await executeTask(filename, task.config);
}

export async function closeScheduler(): Promise<void> {
  stopSystemTasks();

  for (const [, { job }] of tasks) {
    job?.stop();
  }
  tasks.clear();

  const w = getWatcher();
  if (w) {
    await w.close();
    setWatcher(null);
  }

  setInitPromise(null);
}

// ── Init ─────────────────────────────────────────────────────────────

async function doInit(): Promise<void> {
  const done = startupTimer("task scheduler");
  const tasksDir = getTasksDir();
  if (!tasksDir) {
    done.skip("no AI config dir configured");
    return;
  }

  // Ensure the tasks directory exists
  try {
    await fs.mkdir(tasksDir, { recursive: true });
  } catch {
    // ignore
  }

  const cronDisabled = process.env.DISABLE_CRON === "true";
  const tasksDisabled = cronDisabled || process.env.DISABLE_TASKS === "true";
  if (cronDisabled) {
    logger.info("DISABLE_CRON=true — scheduler disabled, syncing task DB only");
  } else if (tasksDisabled) {
    logger.info("DISABLE_TASKS=true — file-based tasks disabled, system tasks will still run");
  }

  let loadedTasks: LoadedTaskConfig[];
  try {
    loadedTasks = await loadTaskConfigs(tasksDir);
  } catch {
    done.skip("cannot read tasks directory", { dir: tasksDir });
    return;
  }

  const adminUser = await findSchedulerAdminUser();

  if (!adminUser) {
    done.skip("no admin user found");
    return;
  }

  const existingTasks = await getExistingTaskRows(adminUser.id);
  const taskRowsByFilename = new Map(existingTasks.map((t) => [t.filename, t]));

  const foundFiles = new Set<string>();

  for (const { filename, config } of loadedTasks) {
    foundFiles.add(filename);

    await upsertTaskRow(filename, config, adminUser.id);

    if (tasksDisabled) continue;

    const existingRow = taskRowsByFilename.get(filename);
    const job = createCronJob(filename, config, existingRow?.lastRunAt ?? null);
    tasks.set(filename, { config, job });
  }

  await markMissingTaskRows(existingTasks, foundFiles);

  // When DISABLE_CRON is set, skip everything (tasks + system tasks)
  if (cronDisabled) return;

  // When only DISABLE_TASKS is set, skip file watcher but still start system tasks
  if (!tasksDisabled) {
    // Start file watcher
    const newWatcher = chokidar.watch(tasksDir, {
      ignored: (filePath, stats) => {
        if (stats?.isFile() && !filePath.endsWith(".md")) return true;
        return false;
      },
      persistent: true,
      ignoreInitial: true,
    });
    setWatcher(newWatcher);

    newWatcher
      .on("add", (filePath: string) => void handleFileAddOrChange(filePath))
      .on("change", (filePath: string) => void handleFileAddOrChange(filePath))
      .on("unlink", (filePath: string) => void handleFileDelete(filePath))
      .on("error", (err: unknown) => {
        logger.error({ err }, "Task watcher error");
      });
  }

  // Register code-defined system tasks (cleanup, etc.)
  startSystemTasks();

  const taskCount = tasks.size;
  done({ taskCount, dir: tasksDir });
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

function createCronJob(filename: string, config: TaskConfig, lastRunAt: Date | null): Cron | null {
  // Remove any existing croner job with the same name to avoid "name already taken" errors.
  // This handles cases where stop() didn't fully unregister the name (e.g. paused jobs).
  const existingByName = scheduledJobs.find((j) => j.name === config.title);
  if (existingByName) {
    existingByName.stop();
  }

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
