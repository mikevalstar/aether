import {
  normalizeRelativePath,
  resolveLinkTarget,
  safeDecodeURIComponent,
  stripHashAndQuery,
  stripMarkdownSuffix,
} from "#/lib/path-utils";

export type ObsidianTreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      isAiConfig: boolean;
      isAiMemory: boolean;
      children: ObsidianTreeNode[];
    }
  | {
      type: "file";
      name: string;
      title: string;
      routePath: string;
      relativePath: string;
    };

export type ObsidianDocument = {
  title: string;
  body: string;
  rawContent: string;
  routePath: string;
  relativePath: string;
  frontmatter: Record<string, string | number | boolean | string[] | null>;
};

export type ObsidianViewerData = {
  tree: ObsidianTreeNode[];
  aiConfigPath: string | null;
  aiMemoryPath: string | null;
  document: ObsidianDocument | null;
  requestedPath: string;
  configured: boolean;
};

const OBSIDIAN_ROUTE_PREFIX = "o";

export function getObsidianHref(routePath: string) {
  return routePath ? `/o/${routePath}` : "/o";
}

export function toObsidianRoutePath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);

  if (normalized === null) {
    return "";
  }

  return stripMarkdownSuffix(normalized);
}

export function normalizeObsidianRoutePath(input?: string | null) {
  if (!input) {
    return "";
  }

  const decoded = safeDecodeURIComponent(stripHashAndQuery(input).trim());
  const withoutPrefix = decoded.replace(/^\/+/, "").replace(new RegExp(`^${OBSIDIAN_ROUTE_PREFIX}(?:/|$)`), "");

  const normalized = normalizeRelativePath(withoutPrefix);

  if (normalized === null) {
    return null;
  }

  return stripMarkdownSuffix(normalized);
}

export function resolveObsidianLinkTarget(currentRelativePath: string, href?: string) {
  return resolveLinkTarget(currentRelativePath, href, normalizeObsidianRoutePath);
}

/**
 * If `relativePath` is a file inside the AI config directory (top-level or
 * one level of subdirectory like `tasks/`), return its config-relative path.
 * Otherwise return null.
 */
export function getAiConfigFilename(relativePath: string, aiConfigPath: string | null): string | null {
  if (!aiConfigPath) return null;

  const normalized = relativePath.replace(/\\/g, "/");
  const prefix = `${aiConfigPath.replace(/\\/g, "/").replace(/\/+$/, "")}/`;

  if (!normalized.startsWith(prefix)) return null;

  const filename = normalized.slice(prefix.length);

  // Allow top-level files and one level of subdirectory (e.g. "tasks/daily-summary.md")
  const segments = filename.split("/");
  if (segments.length > 2) return null;

  return filename;
}
