/**
 * Shared path normalization and route resolution utilities used by
 * both the Obsidian and Requirements document viewers.
 */

export function stripHashAndQuery(value: string) {
  return value.split("#", 1)[0]?.split("?", 1)[0] ?? value;
}

export function extractHash(value: string) {
  const hashIndex = value.indexOf("#");
  return hashIndex >= 0 ? value.slice(hashIndex + 1) : "";
}

export function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function hasProtocol(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) || value.startsWith("//");
}

export function joinRelativePath(base: string, value: string) {
  if (!base) {
    return value;
  }

  return `${base}/${value}`;
}

export function getRelativeDirectory(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  segments.pop();
  return segments.join("/");
}

export function stripMarkdownSuffix(value: string) {
  return value.replace(/\.md$/i, "");
}

export function normalizeRelativePath(value: string) {
  const normalized = value.replace(/\\/g, "/").trim();

  if (!normalized) {
    return "";
  }

  const segments: string[] = [];

  for (const segment of normalized.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (segments.length === 0) {
        return null;
      }

      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.join("/");
}

/**
 * Resolve a link target relative to a current document path.
 * Returns the resolved route path and optional hash, or null if the link
 * is external, empty, or a bare anchor.
 *
 * @param normalizeRoutePath - domain-specific function to normalize a route path (e.g. obsidian vs requirements)
 */
export function resolveLinkTarget(
  currentRelativePath: string,
  href: string | undefined,
  normalizeRoutePath: (input: string) => string | null,
) {
  if (!href) {
    return null;
  }

  const trimmedHref = href.trim();

  if (!trimmedHref || trimmedHref.startsWith("#") || hasProtocol(trimmedHref)) {
    return null;
  }

  const hash = extractHash(trimmedHref);
  const linkPath = stripHashAndQuery(trimmedHref);
  const candidate = linkPath.startsWith("/")
    ? linkPath
    : joinRelativePath(getRelativeDirectory(currentRelativePath), linkPath);
  const routePath = normalizeRoutePath(candidate);

  if (routePath === null) {
    return null;
  }

  return {
    routePath,
    hash: hash ? `#${hash}` : undefined,
  };
}
