import {
  normalizeRelativePath,
  resolveLinkTarget,
  safeDecodeURIComponent,
  stripHashAndQuery,
  stripMarkdownSuffix,
} from "#/lib/path-utils";

export type RequirementTreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: RequirementTreeNode[];
    }
  | {
      type: "file";
      name: string;
      title: string;
      routePath: string;
      relativePath: string;
      status?: string;
      lastUpdated?: string;
    };

export type RequirementDocument = {
  title: string;
  body: string;
  routePath: string;
  relativePath: string;
  status?: string;
  owner?: string;
  lastUpdated?: string;
  canonicalFile?: string;
};

export type RequirementsViewerData = {
  tree: RequirementTreeNode[];
  document: RequirementDocument | null;
  requestedPath: string;
};

const REQUIREMENTS_ROUTE_PREFIX = "requirements";
const REQUIREMENTS_DOCS_PREFIX = "docs/requirements";

export function getRequirementHref(routePath: string) {
  return routePath ? `/requirements/${routePath}` : "/requirements";
}

export function toRequirementRoutePath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);

  if (normalized === null) {
    return "";
  }

  return stripIndexSuffix(stripMarkdownSuffix(normalized));
}

export function normalizeRequirementRoutePath(input?: string | null) {
  if (!input) {
    return "";
  }

  const decoded = safeDecodeURIComponent(stripHashAndQuery(input).trim());
  const withoutPrefix = decoded
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${REQUIREMENTS_ROUTE_PREFIX}(?:/|$)`), "")
    .replace(new RegExp(`^${REQUIREMENTS_DOCS_PREFIX}(?:/|$)`), "");

  const normalized = normalizeRelativePath(withoutPrefix);

  if (normalized === null) {
    return null;
  }

  return stripIndexSuffix(stripMarkdownSuffix(normalized));
}

export function resolveRequirementLinkTarget(currentRelativePath: string, href?: string) {
  return resolveLinkTarget(currentRelativePath, href, normalizeRequirementRoutePath);
}

function stripIndexSuffix(value: string) {
  if (value === "index") {
    return "";
  }

  return value.replace(/\/index$/i, "");
}
