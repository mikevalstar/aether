import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import matter from "gray-matter";
import { z } from "zod";
import type { ConfigEditorData, ScopedTreeNode } from "#/components/config-editor/types";
import { prisma } from "#/db";
import { logFileChange } from "#/lib/activity";
import { ensureSession } from "#/lib/auth.functions";
import { logger } from "#/lib/logger";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { OBSIDIAN_AI_CONFIG, OBSIDIAN_DIR, toObsidianRoutePath } from "#/lib/obsidian/obsidian";
import { parsePreferences } from "#/lib/preferences";

// ─── Helpers ────────────────────────────────────────────────────────────

function getScopedDir(subfolder: string): string {
  if (!OBSIDIAN_DIR || !OBSIDIAN_AI_CONFIG) return "";
  return path.join(OBSIDIAN_DIR, OBSIDIAN_AI_CONFIG, subfolder);
}

function getScopedRelativeBase(subfolder: string): string {
  if (!OBSIDIAN_AI_CONFIG) return subfolder;
  return path.posix.join(OBSIDIAN_AI_CONFIG, subfolder);
}

function humanizeFileName(filePath: string): string {
  return path
    .basename(filePath, ".md")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeFrontmatter(data: Record<string, unknown>): Record<string, string | number | boolean | string[] | null> {
  const result: Record<string, string | number | boolean | string[] | null> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (value instanceof Date) {
      result[key] = value.toISOString().slice(0, 10);
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => String(v));
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    } else {
      result[key] = JSON.stringify(value);
    }
  }
  return result;
}

async function readDocument(absolutePath: string, relativePath: string): Promise<ObsidianDocument> {
  const rawContent = await fs.readFile(absolutePath, "utf8");
  const parsed = matter(rawContent);
  const data = parsed.data as Record<string, unknown>;
  const routePath = toObsidianRoutePath(relativePath);

  return {
    title: typeof data.title === "string" ? data.title : humanizeFileName(relativePath),
    body: parsed.content.trim(),
    rawContent,
    routePath,
    relativePath,
    frontmatter: normalizeFrontmatter(data),
  };
}

async function buildScopedTree(
  dir: string,
  relativeBase: string,
): Promise<{ tree: ScopedTreeNode[]; documents: ObsidianDocument[] }> {
  const documents: ObsidianDocument[] = [];

  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return { tree: [], documents };
  }

  const nodes: ScopedTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = path.posix.join(relativeBase, entry.name);

    if (entry.isDirectory()) {
      const subDir = path.join(dir, entry.name);
      const sub = await buildScopedTree(subDir, relativePath);
      if (sub.tree.length > 0) {
        nodes.push({
          type: "folder",
          name: entry.name,
          path: relativePath,
          children: sub.tree,
        });
        documents.push(...sub.documents);
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;

    const absolutePath = path.join(dir, entry.name);
    const doc = await readDocument(absolutePath, relativePath);
    documents.push(doc);
    nodes.push({
      type: "file",
      name: entry.name,
      title: doc.title,
      routePath: doc.routePath,
      relativePath: doc.relativePath,
    });
  }

  // Sort: folders first, then alphabetical
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { tree: nodes, documents };
}

// ─── Server Functions ─────────────────��─────────────────────────────────

const configEditorInputSchema = z
  .object({
    subfolder: z.string(), // e.g. "tasks", "workflows"
    filename: z.string().optional(),
  })
  .strict();

export const getConfigEditorData = createServerFn({ method: "GET" })
  .inputValidator((data) => configEditorInputSchema.parse(data))
  .handler(async ({ data }): Promise<ConfigEditorData> => {
    const session = await ensureSession();

    const scopedDir = getScopedDir(data.subfolder);
    if (!scopedDir) {
      return {
        tree: [],
        document: null,
        requestedFilename: data.filename ?? "",
        configured: false,
      };
    }

    // Fetch user timezone preference
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const prefs = parsePreferences(user?.preferences);

    const relativeBase = getScopedRelativeBase(data.subfolder);
    const { tree, documents } = await buildScopedTree(scopedDir, relativeBase);

    let document: ObsidianDocument | null = null;
    if (data.filename) {
      // Match by filename (e.g. "daily-summary.md" or "daily-summary")
      const needle = data.filename.endsWith(".md") ? data.filename : `${data.filename}.md`;
      const relativePath = path.posix.join(relativeBase, needle);
      document = documents.find((d) => d.relativePath === relativePath) ?? null;
    }

    return {
      tree,
      document,
      requestedFilename: data.filename ?? "",
      configured: true,
      userTimezone: prefs.timezone,
    };
  });

const toggleFrontmatterFieldSchema = z
  .object({
    relativePath: z.string(),
    field: z.string(),
    value: z.boolean(),
  })
  .strict();

export const toggleFrontmatterField = createServerFn({ method: "POST" })
  .inputValidator((data) => toggleFrontmatterFieldSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = OBSIDIAN_DIR;
    if (!obsidianRoot) throw new Error("Obsidian vault not configured");

    const normalized = data.relativePath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
      throw new Error("Invalid file path");
    }

    const absolutePath = path.join(obsidianRoot, normalized);
    const resolvedPath = path.resolve(absolutePath);
    const resolvedRoot = path.resolve(obsidianRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Path traversal detected");
    }

    const originalContent = await fs.readFile(absolutePath, "utf8");
    const parsed = matter(originalContent);

    parsed.data[data.field] = data.value;
    const newContent = matter.stringify(parsed.content, parsed.data);

    await fs.writeFile(absolutePath, newContent, "utf8");

    try {
      await logFileChange({
        userId: session.user.id,
        filePath: normalized,
        originalContent,
        newContent,
        changeSource: "manual",
        summary: `Toggle ${data.field} → ${data.value}`,
      });
    } catch (err) {
      logger.error({ err }, "Activity log failed");
    }

    return { success: true };
  });

const updateFrontmatterSchema = z
  .object({
    relativePath: z.string(),
    fields: z.record(z.string(), z.unknown()),
  })
  .strict();

export const updateFrontmatterFields = createServerFn({ method: "POST" })
  .inputValidator((data) => updateFrontmatterSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = OBSIDIAN_DIR;
    if (!obsidianRoot) throw new Error("Obsidian vault not configured");

    const normalized = data.relativePath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.includes("..") || normalized.startsWith("/")) {
      throw new Error("Invalid file path");
    }

    const absolutePath = path.join(obsidianRoot, normalized);
    const resolvedPath = path.resolve(absolutePath);
    const resolvedRoot = path.resolve(obsidianRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Path traversal detected");
    }

    const originalContent = await fs.readFile(absolutePath, "utf8");
    const parsed = matter(originalContent);

    // Merge fields into frontmatter, removing keys set to null/undefined
    for (const [key, value] of Object.entries(data.fields)) {
      if (value === null || value === undefined) {
        delete parsed.data[key];
      } else {
        parsed.data[key] = value;
      }
    }

    const newContent = matter.stringify(parsed.content, parsed.data);
    await fs.writeFile(absolutePath, newContent, "utf8");

    try {
      const changedKeys = Object.keys(data.fields).join(", ");
      await logFileChange({
        userId: session.user.id,
        filePath: normalized,
        originalContent,
        newContent,
        changeSource: "manual",
        summary: `Update frontmatter: ${changedKeys}`,
      });
    } catch (err) {
      logger.error({ err }, "Activity log failed");
    }

    return { success: true };
  });

const createConfigFileSchema = z
  .object({
    subfolder: z.string(),
    title: z.string().min(1),
    filename: z.string().min(1),
    defaultFrontmatter: z.record(z.string(), z.unknown()),
  })
  .strict();

export const createConfigFile = createServerFn({ method: "POST" })
  .inputValidator((data) => createConfigFileSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = OBSIDIAN_DIR;
    if (!obsidianRoot) throw new Error("Obsidian vault not configured");

    const scopedDir = getScopedDir(data.subfolder);
    if (!scopedDir) throw new Error("Config folder not configured");

    let filename = data.filename.trim();
    if (!filename.toLowerCase().endsWith(".md")) filename += ".md";
    if (filename.includes("..") || filename.includes("/")) {
      throw new Error("Invalid filename");
    }

    const relativeBase = getScopedRelativeBase(data.subfolder);
    const relativePath = path.posix.join(relativeBase, filename);
    const absolutePath = path.join(obsidianRoot, relativePath);
    const resolvedPath = path.resolve(absolutePath);
    const resolvedRoot = path.resolve(obsidianRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Path traversal detected");
    }

    try {
      await fs.access(absolutePath);
      throw new Error("A file with that name already exists");
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        throw err;
      }
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    const frontmatter = { title: data.title, ...data.defaultFrontmatter };
    const content = matter.stringify("\n", frontmatter);
    await fs.writeFile(absolutePath, content, "utf8");

    try {
      await logFileChange({
        userId: session.user.id,
        filePath: relativePath,
        originalContent: null,
        newContent: content,
        changeSource: "manual",
        summary: `Create ${data.subfolder} file: ${filename}`,
      });
    } catch (err) {
      logger.error({ err }, "Activity log failed");
    }

    return { success: true, filename };
  });
