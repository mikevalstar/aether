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
	const withoutPrefix = decoded
		.replace(/^\/+/, "")
		.replace(new RegExp(`^${OBSIDIAN_ROUTE_PREFIX}(?:/|$)`), "");

	const normalized = normalizeRelativePath(withoutPrefix);

	if (normalized === null) {
		return null;
	}

	return stripMarkdownSuffix(normalized);
}

export function resolveObsidianLinkTarget(
	currentRelativePath: string,
	href?: string,
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
	const routePath = normalizeObsidianRoutePath(candidate);

	if (routePath === null) {
		return null;
	}

	return {
		routePath,
		hash: hash ? `#${hash}` : undefined,
	};
}

function stripHashAndQuery(value: string) {
	return value.split("#", 1)[0]?.split("?", 1)[0] ?? value;
}

function extractHash(value: string) {
	const hashIndex = value.indexOf("#");
	return hashIndex >= 0 ? value.slice(hashIndex + 1) : "";
}

function safeDecodeURIComponent(value: string) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function hasProtocol(value: string) {
	return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) || value.startsWith("//");
}

function joinRelativePath(base: string, value: string) {
	if (!base) {
		return value;
	}

	return `${base}/${value}`;
}

function getRelativeDirectory(value: string) {
	const normalized = value.replace(/\\/g, "/");
	const segments = normalized.split("/").filter(Boolean);
	segments.pop();
	return segments.join("/");
}

function stripMarkdownSuffix(value: string) {
	return value.replace(/\.md$/i, "");
}

function normalizeRelativePath(value: string) {
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
 * If `relativePath` is a file inside the AI config directory (top-level or
 * one level of subdirectory like `tasks/`), return its config-relative path.
 * Otherwise return null.
 */
export function getAiConfigFilename(
	relativePath: string,
	aiConfigPath: string | null,
): string | null {
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
