import { promises as fs } from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import matter from "gray-matter";
import { prisma } from "#/db";
import { triggerFrontmatterSchema, triggerValidator } from "#/lib/ai-config/validators/trigger";
import { logger } from "#/lib/logger";
import { OBSIDIAN_AI_CONFIG, OBSIDIAN_DIR } from "#/lib/obsidian/obsidian";
import { startupTimer } from "#/lib/startup-timer";

// ── Types ───────────────────────────────────────────────────────────

export type TriggerConfig = {
  title: string;
  type: string;
  pattern?: string;
  /** Restrict to specific user email, or "all" (or undefined = all) */
  user?: string;
  model?: string;
  effort?: string;
  enabled: boolean;
  maxTokens?: number;
  notification: string;
  notificationLevel: string;
  notifyUsers: string[];
  pushMessage: boolean;
  body: string;
};

// ── State ───────────────────────────────────────────────────────────
// Store state on globalThis so it survives Vite HMR module replacement.

type TriggerWatcherState = {
  triggers: Map<string, TriggerConfig>;
  watcher: ReturnType<typeof chokidar.watch> | null;
  initPromise: Promise<void> | null;
};

declare global {
  var __aetherTriggerWatcherState: TriggerWatcherState | undefined;
}

globalThis.__aetherTriggerWatcherState ??= {
  triggers: new Map(),
  watcher: null,
  initPromise: null,
};

function getState(): TriggerWatcherState {
  return globalThis.__aetherTriggerWatcherState!;
}

// ── Public API ──────────────────────────────────────────────────────

export function initTriggerWatcher(): Promise<void> {
  const state = getState();
  // If already initialized and has configs (or watcher running), return the existing promise.
  // If initPromise resolved but map is empty and no watcher, force re-init (HMR recovery).
  if (state.initPromise) {
    if (state.watcher || state.triggers.size > 0) return state.initPromise;
    // Stale resolved promise — reset and re-init
    logger.info("Trigger watcher re-initializing (HMR recovery)");
    state.initPromise = null;
  }

  logger.info("Initializing trigger watcher");

  state.initPromise = doInit();
  return state.initPromise;
}

export function getTriggerConfigs(): Map<string, TriggerConfig> {
  return getState().triggers;
}

export function getTriggerConfig(filename: string): TriggerConfig | undefined {
  return getState().triggers.get(filename);
}

export async function closeTriggerWatcher(): Promise<void> {
  const state = getState();
  state.triggers.clear();

  if (state.watcher) {
    await state.watcher.close();
    state.watcher = null;
  }

  state.initPromise = null;
}

// ── Init ────────────────────────────────────────────────────────────

async function doInit(): Promise<void> {
  const done = startupTimer("trigger watcher");
  const state = getState();
  const triggersDir = getTriggersDir();
  if (!triggersDir) {
    done.skip("no AI config dir configured");
    return;
  }

  // Ensure directory exists
  try {
    await fs.mkdir(triggersDir, { recursive: true });
  } catch {
    // ignore
  }

  // Read all trigger files
  let files: string[];
  try {
    files = await fs.readdir(triggersDir);
  } catch {
    done.skip("cannot read triggers directory", { dir: triggersDir });
    return;
  }

  // Find admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    done.skip("no admin user found");
    return;
  }

  // Get existing trigger rows
  const existingTriggers = await prisma.trigger.findMany({
    where: { userId: adminUser.id },
  });
  const foundFiles = new Set<string>();

  logger.info({ files: files.filter((f) => f.endsWith(".md")), triggersDir }, "Trigger watcher scanning files");

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(triggersDir, file);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) {
      logger.warn({ file: filePath }, "Trigger file stat failed or not a file");
      continue;
    }

    const config = await parseTriggerFile(filePath);
    if (!config) {
      logger.warn({ file: filePath }, "Trigger file parse returned null");
      continue;
    }

    foundFiles.add(file);
    state.triggers.set(file, config);
    logger.info({ trigger: file, type: config.type, enabled: config.enabled }, "Trigger loaded");

    await upsertTriggerRow(file, config, adminUser.id);
  }

  // Mark deleted files
  for (const existing of existingTriggers) {
    if (!foundFiles.has(existing.filename) && existing.fileExists) {
      await prisma.trigger.update({
        where: { id: existing.id },
        data: { fileExists: false },
      });
    }
  }

  // Start file watcher
  state.watcher = chokidar.watch(triggersDir, {
    ignored: (filePath, stats) => {
      if (stats?.isFile() && !filePath.endsWith(".md")) return true;
      return false;
    },
    persistent: true,
    ignoreInitial: true,
  });

  state.watcher
    .on("add", (filePath: string) => void handleFileAddOrChange(filePath))
    .on("change", (filePath: string) => void handleFileAddOrChange(filePath))
    .on("unlink", (filePath: string) => void handleFileDelete(filePath))
    .on("error", (err: unknown) => {
      logger.error({ err }, "Trigger watcher error");
    });

  const count = state.triggers.size;
  done({ count, dir: triggersDir });
}

// ── File Handlers ───────────────────────────────────────────────────

async function handleFileAddOrChange(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  if (!filename.endsWith(".md")) return;

  const config = await parseTriggerFile(filePath);
  if (!config) return;

  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) return;

  getState().triggers.set(filename, config);
  await upsertTriggerRow(filename, config, adminUser.id);

  logger.info({ trigger: filename }, "Trigger updated");
}

async function handleFileDelete(filePath: string): Promise<void> {
  const filename = path.basename(filePath);

  getState().triggers.delete(filename);

  try {
    await prisma.trigger.update({
      where: { filename },
      data: { fileExists: false },
    });
  } catch {
    // row may not exist
  }

  logger.info({ trigger: filename }, "Trigger file deleted");
}

// ── Helpers ─────────────────────────────────────────────────────────

export function getTriggersDir(): string {
  const obsidianDir = OBSIDIAN_DIR;
  const aiConfigRel = OBSIDIAN_AI_CONFIG;
  if (!obsidianDir || !aiConfigRel) return "";
  return path.join(obsidianDir, aiConfigRel, "triggers");
}

export async function parseTriggerFile(filePath: string): Promise<TriggerConfig | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = matter(content);
    const fm = parsed.data as Record<string, unknown>;

    const validation = triggerValidator.validate(fm, parsed.content);
    if (!validation.isValid) {
      logger.warn({ file: filePath, errors: validation.errors }, "Trigger validation failed");
      return null;
    }

    const data = triggerFrontmatterSchema.parse(fm);

    return {
      title: data.title,
      type: data.type,
      pattern: data.pattern,
      user: data.user,
      model: data.model,
      effort: data.effort,
      enabled: data.enabled !== false,
      maxTokens: data.maxTokens,
      notification: data.notification ?? "notify",
      notificationLevel: data.notificationLevel ?? "info",
      notifyUsers: data.notifyUsers ?? ["all"],
      pushMessage: data.pushMessage ?? false,
      body: parsed.content,
    };
  } catch (err) {
    logger.error({ file: filePath, err }, "Failed to parse trigger file");
    return null;
  }
}

async function upsertTriggerRow(filename: string, config: TriggerConfig, userId: string): Promise<void> {
  await prisma.trigger.upsert({
    where: { filename },
    create: {
      filename,
      title: config.title,
      type: config.type,
      pattern: config.pattern ?? null,
      model: config.model ?? "claude-haiku-4-5",
      effort: config.effort ?? "low",
      enabled: config.enabled,
      maxTokens: config.maxTokens ?? null,
      fileExists: true,
      userId,
    },
    update: {
      title: config.title,
      type: config.type,
      pattern: config.pattern ?? null,
      model: config.model ?? "claude-haiku-4-5",
      effort: config.effort ?? "low",
      enabled: config.enabled,
      maxTokens: config.maxTokens ?? null,
      fileExists: true,
    },
  });
}
