import { promises as fs } from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import Fuse from "fuse.js";
import matter from "gray-matter";
import { logger } from "#/lib/logger";

// ── Types ────────────────────────────────────────────────────────────

export type IndexedNote = {
	relativePath: string;
	title: string;
	aliases: string[];
	tags: string[];
	headings: string[];
	folder: string;
	mtime: number;
	bodySnippet: string;
};

export type VaultSearchResult = {
	item: IndexedNote;
	score: number;
	matches?: ReadonlyArray<{
		key?: string;
		value?: string;
		indices: ReadonlyArray<readonly [number, number]>;
	}>;
};

// ── State ────────────────────────────────────────────────────────────

const notes = new Map<string, IndexedNote>();
let fuseIndex: Fuse<IndexedNote> | null = null;
let watcher: ReturnType<typeof chokidar.watch> | null = null;
let initPromise: Promise<void> | null = null;
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let isReady = false;

const FUSE_OPTIONS = {
	keys: [
		{ name: "title", weight: 1.0 },
		{ name: "aliases", weight: 0.8 },
		{ name: "tags", weight: 0.7 },
		{ name: "headings", weight: 0.6 },
		{ name: "relativePath", weight: 0.4 },
		{ name: "bodySnippet", weight: 0.3 },
	],
	threshold: 0.4,
	includeScore: true,
	includeMatches: true,
};

// Debounce fuse rebuild — Obsidian auto-saves frequently
const REBUILD_DEBOUNCE_MS = 300;

// ── Public API ───────────────────────────────────────────────────────

/**
 * Initialize the vault index. Safe to call multiple times — only runs once.
 * Resolves when the initial scan is complete and the fuse index is ready.
 */
export function initVaultIndex(): Promise<void> {
	if (initPromise) return initPromise;

	const root = getObsidianRoot();
	if (!root) {
		initPromise = Promise.resolve();
		return initPromise;
	}

	initPromise = new Promise<void>((resolve) => {
		watcher = chokidar.watch(root, {
			ignored: (filePath, stats) => {
				const basename = path.basename(filePath);
				if (basename.startsWith(".")) return true;
				if (stats?.isFile() && !filePath.endsWith(".md")) return true;
				return false;
			},
			persistent: true,
		});

		watcher
			.on("add", (filePath: string) => {
				void indexFile(root, filePath).then(() => {
					if (isReady) scheduleRebuild();
				});
			})
			.on("change", (filePath: string) => {
				void indexFile(root, filePath).then(() => {
					if (isReady) scheduleRebuild();
				});
			})
			.on("unlink", (filePath: string) => {
				const rel = toRelativePath(root, filePath);
				notes.delete(rel);
				if (isReady) scheduleRebuild();
			})
			.on("ready", () => {
				isReady = true;
				rebuildFuseIndex();
				resolve();
			})
			.on("error", (err: unknown) => {
				logger.error({ err }, "Vault index watcher error");
			});
	});

	return initPromise;
}

/**
 * Search the vault using fuzzy matching. Waits for index to be ready.
 */
export async function searchVault(query: string, limit = 20): Promise<VaultSearchResult[]> {
	await initVaultIndex();

	if (!fuseIndex || notes.size === 0) return [];

	return fuseIndex.search(query, { limit }).map((result) => ({
		item: result.item,
		score: result.score ?? 1,
		matches: result.matches,
	}));
}

/**
 * Get a specific note from the index by relative path.
 */
export async function getIndexedNote(relativePath: string): Promise<IndexedNote | undefined> {
	await initVaultIndex();
	return notes.get(relativePath);
}

/**
 * Get all indexed notes. Waits for index to be ready.
 */
export async function getAllIndexedNotes(): Promise<IndexedNote[]> {
	await initVaultIndex();
	return Array.from(notes.values());
}

/**
 * Get index stats for diagnostics.
 */
export async function getIndexStats() {
	await initVaultIndex();
	return {
		totalNotes: notes.size,
		isReady,
		hasWatcher: watcher !== null,
	};
}

/**
 * Close the watcher and clear state. Safe to call multiple times.
 * After closing, initVaultIndex() can be called again to restart.
 */
export async function closeVaultIndex(): Promise<void> {
	if (rebuildTimer) {
		clearTimeout(rebuildTimer);
		rebuildTimer = null;
	}
	if (watcher) {
		await watcher.close();
		watcher = null;
	}
	notes.clear();
	fuseIndex = null;
	isReady = false;
	initPromise = null;
}

// ── Internals ────────────────────────────────────────────────────────

function getObsidianRoot() {
	return process.env.OBSIDIAN_DIR ?? "";
}

function toRelativePath(root: string, absolutePath: string) {
	return path.relative(root, absolutePath).replace(/\\/g, "/");
}

async function indexFile(root: string, absolutePath: string) {
	const rel = toRelativePath(root, absolutePath);

	try {
		const [content, stat] = await Promise.all([fs.readFile(absolutePath, "utf8"), fs.stat(absolutePath)]);

		const parsed = matter(content);
		const data = parsed.data as Record<string, unknown>;

		const note: IndexedNote = {
			relativePath: rel,
			title: extractTitle(data, rel),
			aliases: extractStringArray(data.aliases),
			tags: deduplicateStrings([...extractStringArray(data.tags), ...extractInlineTags(parsed.content)]),
			headings: extractHeadings(parsed.content),
			folder: path.dirname(rel) === "." ? "" : path.dirname(rel),
			mtime: stat.mtimeMs,
			bodySnippet: parsed.content.slice(0, 500),
		};

		notes.set(rel, note);
	} catch {
		// skip unreadable files
	}
}

function scheduleRebuild() {
	if (rebuildTimer) clearTimeout(rebuildTimer);
	rebuildTimer = setTimeout(() => {
		rebuildFuseIndex();
		rebuildTimer = null;
	}, REBUILD_DEBOUNCE_MS);
}

function rebuildFuseIndex() {
	fuseIndex = new Fuse(Array.from(notes.values()), FUSE_OPTIONS);
}

// ── Parsers ──────────────────────────────────────────────────────────

function extractTitle(frontmatter: Record<string, unknown>, relativePath: string): string {
	if (typeof frontmatter.title === "string" && frontmatter.title.trim()) {
		return frontmatter.title.trim();
	}
	// Humanize filename
	return path
		.basename(relativePath, ".md")
		.replace(/[-_]+/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());
}

function extractStringArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((v): v is string => typeof v === "string" && !!v.trim());
	}
	if (typeof value === "string" && value.trim()) {
		return value
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

/**
 * Extract inline #tags from markdown content (not inside code blocks).
 */
function extractInlineTags(content: string): string[] {
	const tags: string[] = [];
	// Match #tag patterns not inside code fences
	const lines = content.split("\n");
	let inCodeBlock = false;

	for (const line of lines) {
		if (line.trimStart().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;

		const matches = line.matchAll(/(?:^|\s)#([a-zA-Z][\w/-]*)/g);
		for (const match of matches) {
			if (match[1]) tags.push(match[1]);
		}
	}

	return tags;
}

/**
 * Extract markdown headings (# through ####).
 */
function extractHeadings(content: string): string[] {
	const headings: string[] = [];
	const lines = content.split("\n");
	let inCodeBlock = false;

	for (const line of lines) {
		if (line.trimStart().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;

		const match = line.match(/^#{1,4}\s+(.+)/);
		if (match?.[1]) {
			headings.push(match[1].trim());
		}
	}

	return headings;
}

function deduplicateStrings(arr: string[]): string[] {
	return [...new Set(arr)];
}

// ── Eager initialization ─────────────────────────────────────────────
// Fire-and-forget: starts indexing as soon as this module is imported.
// Consumers can await initVaultIndex() or searchVault() if they need
// to guarantee the index is ready.
void initVaultIndex();

// ── Cleanup ──────────────────────────────────────────────────────────
// Close watcher on process exit to avoid file descriptor leaks.
function handleShutdown() {
	void closeVaultIndex();
}
process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

// Clean up on Vite HMR to prevent stacking watchers during dev.
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		void closeVaultIndex();
	});
}
