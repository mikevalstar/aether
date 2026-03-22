import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "#/db";
import { resolveNotePath, searchVault } from "#/lib/obsidian/vault-index";
import { parsePreferences } from "#/lib/preferences";
import type { ObsidianPluginContext, PluginActivityParams, PluginContext } from "./types";

function getObsidianRoot() {
  return process.env.OBSIDIAN_DIR ?? "";
}

function createObsidianPluginContext(): ObsidianPluginContext {
  const obsidianRoot = getObsidianRoot();

  return {
    async read(relativePath: string): Promise<string | null> {
      if (!obsidianRoot) return null;
      let normalized = relativePath.replace(/\\/g, "/").trim();
      const resolved = await resolveNotePath(normalized);
      if (resolved) normalized = resolved;

      const absolutePath = path.join(obsidianRoot, normalized);
      if (!path.resolve(absolutePath).startsWith(path.resolve(obsidianRoot))) return null;

      try {
        return await fs.readFile(absolutePath, "utf8");
      } catch {
        return null;
      }
    },

    async write(relativePath: string, content: string): Promise<void> {
      if (!obsidianRoot) throw new Error("Obsidian vault is not configured");
      let normalized = relativePath.replace(/\\/g, "/").trim();
      if (!normalized.toLowerCase().endsWith(".md")) normalized = `${normalized}.md`;

      const absolutePath = path.join(obsidianRoot, normalized);
      if (!path.resolve(absolutePath).startsWith(path.resolve(obsidianRoot))) {
        throw new Error("Path traversal detected");
      }

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, "utf8");
    },

    async edit(relativePath: string, oldText: string, newText: string): Promise<void> {
      if (!obsidianRoot) throw new Error("Obsidian vault is not configured");
      let normalized = relativePath.replace(/\\/g, "/").trim();
      const resolved = await resolveNotePath(normalized);
      if (resolved) normalized = resolved;

      const absolutePath = path.join(obsidianRoot, normalized);
      if (!path.resolve(absolutePath).startsWith(path.resolve(obsidianRoot))) {
        throw new Error("Path traversal detected");
      }

      const content = await fs.readFile(absolutePath, "utf8");
      if (!content.includes(oldText)) throw new Error("Old text not found in file");
      await fs.writeFile(absolutePath, content.replace(oldText, newText), "utf8");
    },

    async list(folder: string): Promise<string[]> {
      if (!obsidianRoot) return [];
      const normalized = folder.replace(/\\/g, "/").trim();
      const absolutePath = path.join(obsidianRoot, normalized);
      if (!path.resolve(absolutePath).startsWith(path.resolve(obsidianRoot))) return [];

      try {
        const entries = await fs.readdir(absolutePath, { withFileTypes: true });
        return entries
          .filter((e) => e.isFile() && e.name.endsWith(".md"))
          .map((e) => path.join(normalized, e.name).replace(/\\/g, "/"));
      } catch {
        return [];
      }
    },

    async search(query: string): Promise<string[]> {
      const results = await searchVault(query, 20);
      return results.map((r) => r.item.relativePath);
    },
  };
}

export function createPluginContext(pluginId: string, userId: string, threadId?: string, timezone?: string): PluginContext {
  return {
    userId,
    threadId,
    timezone,
    aiConfigFolder: process.env.OBSIDIAN_AI_CONFIG ?? "ai-config",
    aiMemoryFolder: process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory",

    async getOptions<T = Record<string, unknown>>(): Promise<T> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });
      const prefs = parsePreferences(user?.preferences);
      return (prefs.pluginOptions?.[pluginId] ?? {}) as T;
    },

    obsidian: createObsidianPluginContext(),

    async logActivity(params: PluginActivityParams): Promise<void> {
      await prisma.activityLog.create({
        data: {
          type: `plugin:${pluginId}:${params.type}`,
          summary: params.summary,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
          userId,
        },
      });
    },
  };
}
