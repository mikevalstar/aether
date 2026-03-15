import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import matter from "gray-matter";
import { logFileChange } from "#/lib/activity";
import { ensureSession } from "#/lib/auth.functions";
import {
	normalizeObsidianRoutePath,
	type ObsidianDocument,
	type ObsidianTreeNode,
	type ObsidianViewerData,
	toObsidianRoutePath,
} from "#/lib/obsidian";

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
		const discovered = await discoverObsidianTree(
			obsidianRoot,
			aiConfigRel,
			aiMemoryRel,
		);
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
			document:
				discovered.documents.find(
					(document) => document.routePath === requestedPath,
				) ?? null,
			requestedPath,
			configured: true,
		};
	});

async function discoverObsidianTree(
	obsidianRoot: string,
	aiConfigRel: string,
	aiMemoryRel: string,
) {
	const documents: DiscoveredDocument[] = [];
	const tree = await buildTree(
		obsidianRoot,
		"",
		aiConfigRel,
		aiMemoryRel,
		documents,
	);

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

		const relativePath = relativeDirectory
			? path.posix.join(relativeDirectory, entry.name)
			: entry.name;

		if (entry.isDirectory()) {
			const children = await buildTree(
				obsidianRoot,
				relativePath,
				aiConfigRel,
				aiMemoryRel,
				documents,
			);

			if (children.length > 0) {
				const normalizedPath = normalizePosix(relativePath);
				const isAiConfig =
					aiConfigRel !== "" && normalizedPath === normalizePosix(aiConfigRel);
				const isAiMemory =
					aiMemoryRel !== "" && normalizedPath === normalizePosix(aiMemoryRel);

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

async function readObsidianDocument(
	obsidianRoot: string,
	relativePath: string,
): Promise<DiscoveredDocument> {
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
		.replace(/[-_]+/g, " ")
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
		if (
			!normalized ||
			normalized.includes("..") ||
			normalized.startsWith("/")
		) {
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
			console.error("Activity log failed:", err);
		}

		return { success: true };
	});

function normalizePosix(value: string) {
	return value.replace(/\\/g, "/").replace(/\/+$/, "");
}
