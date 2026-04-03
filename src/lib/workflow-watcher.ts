import { promises as fs } from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import matter from "gray-matter";
import { prisma } from "#/db";
import { workflowFrontmatterSchema, workflowValidator } from "#/lib/ai-config-validators/workflow";
import { logger } from "#/lib/logger";
import { startupTimer } from "#/lib/startup-timer";
import type { WorkflowConfig } from "#/lib/workflow-executor";

// ── State ────────────────────────────────────────────────────────────

const workflows = new Map<string, WorkflowConfig>();
let watcher: ReturnType<typeof chokidar.watch> | null = null;
let initPromise: Promise<void> | null = null;

// ── Public API ───────────────────────────────────────────────────────

export function initWorkflowWatcher(): Promise<void> {
  if (initPromise) return initPromise;

  logger.info("Initializing workflow watcher");

  initPromise = doInit();
  return initPromise;
}

export function getWorkflowConfigs(): Map<string, WorkflowConfig> {
  return workflows;
}

export function getWorkflowConfig(filename: string): WorkflowConfig | undefined {
  return workflows.get(filename);
}

export async function closeWorkflowWatcher(): Promise<void> {
  workflows.clear();

  if (watcher) {
    await watcher.close();
    watcher = null;
  }

  initPromise = null;
}

// ── Init ─────────────────────────────────────────────────────────────

async function doInit(): Promise<void> {
  const done = startupTimer("workflow watcher");
  const workflowsDir = getWorkflowsDir();
  if (!workflowsDir) {
    done.skip("no AI config dir configured");
    return;
  }

  // Ensure directory exists
  try {
    await fs.mkdir(workflowsDir, { recursive: true });
  } catch {
    // ignore
  }

  // Read all workflow files
  let files: string[];
  try {
    files = await fs.readdir(workflowsDir);
  } catch {
    done.skip("cannot read workflows directory", { dir: workflowsDir });
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

  // Get existing workflow rows
  const existingWorkflows = await prisma.workflow.findMany({
    where: { userId: adminUser.id },
  });
  const foundFiles = new Set<string>();

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(workflowsDir, file);

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) continue;

    const config = await parseWorkflowFile(filePath);
    if (!config) continue;

    foundFiles.add(file);
    workflows.set(file, config);

    await upsertWorkflowRow(file, config, adminUser.id);
  }

  // Mark deleted files
  for (const existing of existingWorkflows) {
    if (!foundFiles.has(existing.filename) && existing.fileExists) {
      await prisma.workflow.update({
        where: { id: existing.id },
        data: { fileExists: false },
      });
    }
  }

  // Start file watcher
  watcher = chokidar.watch(workflowsDir, {
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
      logger.error({ err }, "Workflow watcher error");
    });

  const count = workflows.size;
  done({ count, dir: workflowsDir });
}

// ── File Handlers ────────────────────────────────────────────────────

async function handleFileAddOrChange(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  if (!filename.endsWith(".md")) return;

  const config = await parseWorkflowFile(filePath);
  if (!config) return;

  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!adminUser) return;

  workflows.set(filename, config);
  await upsertWorkflowRow(filename, config, adminUser.id);

  logger.info({ workflow: filename }, "Workflow updated");
}

async function handleFileDelete(filePath: string): Promise<void> {
  const filename = path.basename(filePath);

  workflows.delete(filename);

  try {
    await prisma.workflow.update({
      where: { filename },
      data: { fileExists: false },
    });
  } catch {
    // row may not exist
  }

  logger.info({ workflow: filename }, "Workflow file deleted");
}

// ── Helpers ──────────────────────────────────────────────────────────

export function getWorkflowsDir(): string {
  const obsidianDir = process.env.OBSIDIAN_DIR ?? "";
  const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG ?? "";
  if (!obsidianDir || !aiConfigRel) return "";
  return path.join(obsidianDir, aiConfigRel, "workflows");
}

export async function parseWorkflowFile(filePath: string): Promise<WorkflowConfig | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = matter(content);
    const fm = parsed.data as Record<string, unknown>;

    const validation = workflowValidator.validate(fm, parsed.content);
    if (!validation.isValid) {
      logger.warn({ file: filePath, errors: validation.errors }, "Workflow validation failed");
      return null;
    }

    const data = workflowFrontmatterSchema.parse(fm);

    return {
      title: data.title,
      description: data.description,
      model: data.model,
      effort: data.effort,
      maxTokens: data.maxTokens,
      notification: data.notification ?? "notify",
      fields: data.fields.map((field) => ({
        ...field,
        options: field.options?.map(String),
      })),
      body: parsed.content,
    };
  } catch (err) {
    logger.error({ file: filePath, err }, "Failed to parse workflow file");
    return null;
  }
}

async function upsertWorkflowRow(filename: string, config: WorkflowConfig, userId: string): Promise<void> {
  await prisma.workflow.upsert({
    where: { filename },
    create: {
      filename,
      title: config.title,
      description: config.description ?? null,
      model: config.model ?? "claude-haiku-4-5",
      effort: config.effort ?? "low",
      maxTokens: config.maxTokens ?? null,
      fieldsJson: JSON.stringify(config.fields),
      fileExists: true,
      userId,
    },
    update: {
      title: config.title,
      description: config.description ?? null,
      model: config.model ?? "claude-haiku-4-5",
      effort: config.effort ?? "low",
      maxTokens: config.maxTokens ?? null,
      fieldsJson: JSON.stringify(config.fields),
      fileExists: true,
    },
  });
}
