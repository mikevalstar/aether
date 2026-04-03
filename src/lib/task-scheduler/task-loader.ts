import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { taskFrontmatterSchema, taskValidator } from "#/lib/ai-config-validators/task";
import { logger } from "#/lib/logger";
import type { TaskConfig } from "#/lib/task-executor";

export type LoadedTaskConfig = {
  filename: string;
  filePath: string;
  config: TaskConfig;
};

export function getTasksDir(): string {
  const obsidianDir = process.env.OBSIDIAN_DIR ?? "";
  const aiConfigRel = process.env.OBSIDIAN_AI_CONFIG ?? "";
  if (!obsidianDir || !aiConfigRel) return "";
  return path.join(obsidianDir, aiConfigRel, "tasks");
}

export async function loadTaskConfigs(tasksDir: string): Promise<LoadedTaskConfig[]> {
  const files = await fs.readdir(tasksDir);
  const loadedConfigs: LoadedTaskConfig[] = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const filePath = path.join(tasksDir, file);
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat?.isFile()) continue;

    const config = await parseTaskFile(filePath);
    if (!config) continue;

    loadedConfigs.push({ filename: file, filePath, config });
  }

  return loadedConfigs;
}

export async function parseTaskFile(filePath: string): Promise<TaskConfig | null> {
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
      notificationLevel: data.notificationLevel ?? "info",
      notifyUsers: data.notifyUsers ?? ["all"],
      pushMessage: data.pushMessage ?? false,
      body: parsed.content,
    };
  } catch (err) {
    logger.error({ file: filePath, err }, "Failed to parse task file");
    return null;
  }
}
