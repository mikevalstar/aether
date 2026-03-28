import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import matter from "gray-matter";
import { z } from "zod";
import { ensureSession } from "#/lib/auth.functions";
import {
  normalizeRequirementRoutePath,
  type RequirementDocument,
  type RequirementsViewerData,
  type RequirementTreeNode,
  toRequirementRoutePath,
} from "#/lib/requirements";

const requirementsViewerInputSchema = z
  .object({
    path: z.string().trim().optional(),
  })
  .strict();

type RequirementFrontmatter = {
  title?: unknown;
  status?: unknown;
  owner?: unknown;
  last_updated?: unknown;
  canonical_file?: unknown;
};

type DiscoveredRequirementDocument = RequirementDocument;

const REQUIREMENTS_ROOT = path.join(process.cwd(), "docs", "requirements");

export const getRequirementsViewerData = createServerFn({ method: "GET" })
  .inputValidator((data) => requirementsViewerInputSchema.parse(data))
  .handler(async ({ data }): Promise<RequirementsViewerData> => {
    await ensureSession();

    const discovered = await discoverRequirementTree();
    const requestedPath = normalizeRequirementRoutePath(data.path);

    if (requestedPath === null) {
      return {
        tree: discovered.tree,
        document: null,
        requestedPath: data.path ?? "",
      };
    }

    return {
      tree: discovered.tree,
      document: discovered.documents.find((document) => document.routePath === requestedPath) ?? null,
      requestedPath,
    };
  });

async function discoverRequirementTree() {
  const documents: DiscoveredRequirementDocument[] = [];
  const tree = await buildTree("", documents);

  return { tree, documents };
}

async function buildTree(
  relativeDirectory: string,
  documents: DiscoveredRequirementDocument[],
): Promise<RequirementTreeNode[]> {
  const absoluteDirectory = path.join(REQUIREMENTS_ROOT, relativeDirectory);
  const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  const nodes: RequirementTreeNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const relativePath = relativeDirectory ? path.posix.join(relativeDirectory, entry.name) : entry.name;

    if (entry.isDirectory()) {
      const children = await buildTree(relativePath, documents);

      if (children.length > 0) {
        nodes.push({
          type: "folder",
          name: entry.name,
          path: relativePath,
          children,
        });
      }

      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    const document = await readRequirementDocument(relativePath);
    documents.push(document);
    nodes.push({
      type: "file",
      name: entry.name,
      title: document.title,
      routePath: document.routePath,
      relativePath: document.relativePath,
      status: document.status,
      lastUpdated: document.lastUpdated,
    });
  }

  return sortTreeNodes(nodes);
}

async function readRequirementDocument(relativePath: string): Promise<DiscoveredRequirementDocument> {
  const absolutePath = path.join(REQUIREMENTS_ROOT, relativePath);
  const rawDocument = await fs.readFile(absolutePath, "utf8");
  const parsed = matter(rawDocument);
  const data = parsed.data as RequirementFrontmatter;
  const routePath = toRequirementRoutePath(relativePath);

  return {
    title: toFrontmatterText(data.title) || humanizeFileName(relativePath),
    body: parsed.content.trim(),
    routePath,
    relativePath,
    status: toFrontmatterText(data.status),
    owner: toFrontmatterText(data.owner),
    lastUpdated: toFrontmatterText(data.last_updated),
    canonicalFile: toFrontmatterText(data.canonical_file),
  };
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

function sortTreeNodes(nodes: RequirementTreeNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }

    if (left.type === "file" && right.type === "file") {
      if (left.routePath === "") return -1;
      if (right.routePath === "") return 1;
      return left.title.localeCompare(right.title);
    }

    return left.name.localeCompare(right.name);
  });
}

function humanizeFileName(relativePath: string) {
  return path
    .basename(relativePath, ".md")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
