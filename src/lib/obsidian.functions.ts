import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import matter from "gray-matter";
import { prisma } from "#/db";
import { logFileChange } from "#/lib/activity";
import { ensureSession } from "#/lib/auth.functions";
import { logger } from "#/lib/logger";
import {
  normalizeObsidianRoutePath,
  type ObsidianDocument,
  type ObsidianTreeNode,
  type ObsidianViewerData,
  toObsidianRoutePath,
} from "#/lib/obsidian";
import { parsePreferences } from "#/lib/preferences";

type ObsidianViewerInput = {
  path?: string;
};

type DiscoveredDocument = ObsidianDocument;

function getObsidianRoot() {
  return process.env.OBSIDIAN_DIR ?? "";
}

function getAiConfigRelPath() {
  return process.env.OBSIDIAN_AI_CONFIG ?? "";
}

function getAiMemoryRelPath() {
  return process.env.OBSIDIAN_AI_MEMORY ?? "";
}

export const getObsidianViewerData = createServerFn({ method: "GET" })
  .inputValidator((data: ObsidianViewerInput) => data)
  .handler(async ({ data }): Promise<ObsidianViewerData> => {
    await ensureSession();

    const obsidianRoot = getObsidianRoot();
    if (!obsidianRoot) {
      return {
        tree: [],
        aiConfigPath: null,
        aiMemoryPath: null,
        document: null,
        requestedPath: data.path ?? "",
        configured: false,
      };
    }

    const aiConfigRel = getAiConfigRelPath();
    const aiMemoryRel = getAiMemoryRelPath();
    const discovered = await discoverObsidianTree(obsidianRoot, aiConfigRel, aiMemoryRel);
    const requestedPath = normalizeObsidianRoutePath(data.path);

    if (requestedPath === null) {
      return {
        tree: discovered.tree,
        aiConfigPath: aiConfigRel || null,
        aiMemoryPath: aiMemoryRel || null,
        document: null,
        requestedPath: data.path ?? "",
        configured: true,
      };
    }

    return {
      tree: discovered.tree,
      aiConfigPath: aiConfigRel || null,
      aiMemoryPath: aiMemoryRel || null,
      document: discovered.documents.find((document) => document.routePath === requestedPath) ?? null,
      requestedPath,
      configured: true,
    };
  });

async function discoverObsidianTree(obsidianRoot: string, aiConfigRel: string, aiMemoryRel: string) {
  const documents: DiscoveredDocument[] = [];
  const tree = await buildTree(obsidianRoot, "", aiConfigRel, aiMemoryRel, documents);

  return { tree, documents };
}

async function buildTree(
  obsidianRoot: string,
  relativeDirectory: string,
  aiConfigRel: string,
  aiMemoryRel: string,
  documents: DiscoveredDocument[],
): Promise<ObsidianTreeNode[]> {
  const absoluteDirectory = path.join(obsidianRoot, relativeDirectory);
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: ObsidianTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const relativePath = relativeDirectory ? path.posix.join(relativeDirectory, entry.name) : entry.name;

    if (entry.isDirectory()) {
      const children = await buildTree(obsidianRoot, relativePath, aiConfigRel, aiMemoryRel, documents);

      if (children.length > 0) {
        const normalizedPath = normalizePosix(relativePath);
        const isAiConfig = aiConfigRel !== "" && normalizedPath === normalizePosix(aiConfigRel);
        const isAiMemory = aiMemoryRel !== "" && normalizedPath === normalizePosix(aiMemoryRel);

        nodes.push({
          type: "folder",
          name: entry.name,
          path: relativePath,
          isAiConfig,
          isAiMemory,
          children,
        });
      }

      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const document = await readObsidianDocument(obsidianRoot, relativePath);
    documents.push(document);
    nodes.push({
      type: "file",
      name: entry.name,
      title: document.title,
      routePath: document.routePath,
      relativePath: document.relativePath,
    });
  }

  return sortTreeNodes(nodes);
}

async function readObsidianDocument(obsidianRoot: string, relativePath: string): Promise<DiscoveredDocument> {
  const absolutePath = path.join(obsidianRoot, relativePath);
  const rawDocument = await fs.readFile(absolutePath, "utf8");
  const parsed = matter(rawDocument);
  const data = parsed.data as Record<string, unknown>;
  const routePath = toObsidianRoutePath(relativePath);

  return {
    title: toFrontmatterText(data.title) || humanizeFileName(relativePath),
    body: parsed.content.trim(),
    rawContent: rawDocument,
    routePath,
    relativePath,
    frontmatter: normalizeFrontmatter(data),
  };
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

function toFrontmatterText(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function sortTreeNodes(nodes: ObsidianTreeNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

function humanizeFileName(relativePath: string) {
  return path
    .basename(relativePath, ".md")
    .replace(/_+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type SaveObsidianDocumentInput = {
  relativePath: string;
  content: string;
};

export const saveObsidianDocument = createServerFn({ method: "POST" })
  .inputValidator((data: SaveObsidianDocumentInput) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = getObsidianRoot();
    if (!obsidianRoot) {
      throw new Error("Obsidian vault not configured");
    }

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

    let originalContent: string | null = null;
    try {
      originalContent = await fs.readFile(absolutePath, "utf8");
    } catch {
      // File doesn't exist yet — originalContent stays null
    }

    await fs.writeFile(absolutePath, data.content, "utf8");

    try {
      const fileName = path.basename(normalized);
      await logFileChange({
        userId: session.user.id,
        filePath: normalized,
        originalContent,
        newContent: data.content,
        changeSource: "manual",
        summary: `Manual save ${fileName}`,
      });
    } catch (err) {
      logger.error({ err }, "Activity log failed");
    }

    return { success: true };
  });

export type ObsidianTemplate = {
  name: string;
  filename: string;
};

const TEMPLATES_DIR = path.join(import.meta.dirname, "obsidian", "templates");

async function readTemplatesFromDir(dir: string): Promise<ObsidianTemplate[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => ({
      name: humanizeFileName(e.name),
      filename: e.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const listObsidianTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<ObsidianTemplate[]> => {
  const session = await ensureSession();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const prefs = parsePreferences(user?.preferences);
  const obsidianRoot = getObsidianRoot();

  if (prefs.obsidianTemplatesFolder && obsidianRoot) {
    const vaultDir = path.join(obsidianRoot, prefs.obsidianTemplatesFolder);
    const resolved = path.resolve(vaultDir);
    if (resolved.startsWith(path.resolve(obsidianRoot))) {
      const templates = await readTemplatesFromDir(vaultDir);
      if (templates.length > 0) return templates;
    }
  }

  return readTemplatesFromDir(TEMPLATES_DIR);
});

type CreateObsidianFileInput = {
  folder: string;
  filename: string;
  templateFilename?: string;
};

export const createObsidianFile = createServerFn({ method: "POST" })
  .inputValidator((data: CreateObsidianFileInput) => data)
  .handler(async ({ data }) => {
    const session = await ensureSession();

    const obsidianRoot = getObsidianRoot();
    if (!obsidianRoot) {
      throw new Error("Obsidian vault not configured");
    }

    // Sanitize filename
    let filename = data.filename.trim();
    if (!filename) throw new Error("Filename is required");
    if (!filename.toLowerCase().endsWith(".md")) filename += ".md";

    // Build relative path
    const folder = data.folder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const relativePath = folder ? `${folder}/${filename}` : filename;

    if (relativePath.includes("..")) {
      throw new Error("Invalid file path");
    }

    const absolutePath = path.join(obsidianRoot, relativePath);
    const resolvedPath = path.resolve(absolutePath);
    const resolvedRoot = path.resolve(obsidianRoot);

    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error("Path traversal detected");
    }

    // Check file doesn't already exist
    try {
      await fs.access(absolutePath);
      throw new Error("A file with that name already exists in this folder");
    } catch (err) {
      if (err instanceof Error && err.message.includes("already exists")) {
        throw err;
      }
      // File doesn't exist — good
    }

    // Load template content or use blank
    let content: string;
    if (data.templateFilename) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
      });
      const prefs = parsePreferences(user?.preferences);

      let templatePath: string;
      let templateBaseDir: string;

      if (prefs.obsidianTemplatesFolder && obsidianRoot) {
        const vaultTemplatesDir = path.join(obsidianRoot, prefs.obsidianTemplatesFolder);
        const candidatePath = path.join(vaultTemplatesDir, data.templateFilename);
        const resolvedCandidate = path.resolve(candidatePath);
        if (
          resolvedCandidate.startsWith(path.resolve(obsidianRoot)) &&
          (await fs
            .access(candidatePath)
            .then(() => true)
            .catch(() => false))
        ) {
          templatePath = candidatePath;
          templateBaseDir = vaultTemplatesDir;
        } else {
          templatePath = path.join(TEMPLATES_DIR, data.templateFilename);
          templateBaseDir = TEMPLATES_DIR;
        }
      } else {
        templatePath = path.join(TEMPLATES_DIR, data.templateFilename);
        templateBaseDir = TEMPLATES_DIR;
      }

      const resolvedTemplate = path.resolve(templatePath);
      if (!resolvedTemplate.startsWith(path.resolve(templateBaseDir))) {
        throw new Error("Invalid template");
      }
      const raw = await fs.readFile(templatePath, "utf8");
      const title = humanizeFileName(filename);
      const date = new Date().toISOString().slice(0, 10);
      content = raw.replace(/\{\{title\}\}/g, title).replace(/\{\{date\}\}/g, date);
    } else {
      const title = humanizeFileName(filename);
      content = `---\ntitle: "${title}"\n---\n\n`;
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");

    try {
      await logFileChange({
        userId: session.user.id,
        filePath: relativePath,
        originalContent: null,
        newContent: content,
        changeSource: "manual",
        summary: `Created ${filename}`,
      });
    } catch (err) {
      logger.error({ err }, "Activity log failed");
    }

    return { relativePath, routePath: toObsidianRoutePath(relativePath) };
  });

export const listObsidianFolders = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  await ensureSession();

  const obsidianRoot = getObsidianRoot();
  if (!obsidianRoot) return [];

  const folders: string[] = [""];
  await collectFolders(obsidianRoot, "", folders);
  return folders;
});

async function collectFolders(root: string, relative: string, out: string[]) {
  const abs = path.join(root, relative);
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    out.push(rel);
    await collectFolders(root, rel, out);
  }
}

function normalizePosix(value: string) {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}
