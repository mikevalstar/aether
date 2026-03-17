import { promises as fs } from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "#/db";
import { logFileChange } from "#/lib/activity";
import { ensureSession } from "#/lib/auth.functions";

type ActivityListInput = {
	page?: number;
	type?: string;
};

export type ActivityListItem = {
	id: string;
	type: string;
	summary: string;
	metadata: string | null;
	createdAt: string;
	fileChangeDetail: {
		filePath: string;
		changeSource: string;
	} | null;
};

export type ActivityListResult = {
	items: ActivityListItem[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

const PAGE_SIZE = 50;

export const getActivityList = createServerFn({ method: "GET" })
	.inputValidator((data: ActivityListInput) => data)
	.handler(async ({ data }): Promise<ActivityListResult> => {
		const session = await ensureSession();
		const page = Math.max(1, data.page ?? 1);
		const typeFilter = data.type && data.type !== "all" ? data.type : undefined;

		const where = {
			userId: session.user.id,
			...(typeFilter ? { type: typeFilter } : {}),
		};

		const [items, total] = await Promise.all([
			prisma.activityLog.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				include: {
					fileChangeDetail: {
						select: { filePath: true, changeSource: true },
					},
				},
			}),
			prisma.activityLog.count({ where }),
		]);

		return {
			items: items.map((item) => ({
				...item,
				createdAt: item.createdAt.toISOString(),
			})),
			total,
			page,
			pageSize: PAGE_SIZE,
			totalPages: Math.ceil(total / PAGE_SIZE),
		};
	});

export type ActivityChatThread = {
	id: string;
	title: string;
	model: string;
	messagesJson: string;
	systemPromptJson: string | null;
	availableToolsJson: string | null;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalEstimatedCostUsd: number;
	createdAt: string;
};

export type ActivityDetail = {
	id: string;
	type: string;
	summary: string;
	metadata: string | null;
	createdAt: string;
	fileChangeDetail: {
		id: string;
		filePath: string;
		originalContent: string | null;
		newContent: string;
		changeSource: string;
		toolName: string | null;
	} | null;
	currentFileContent: string | null;
	fileExists: boolean;
	chatThread: ActivityChatThread | null;
};

export const getActivityDetail = createServerFn({ method: "GET" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }): Promise<ActivityDetail | null> => {
		const session = await ensureSession();

		const item = await prisma.activityLog.findFirst({
			where: { id: data.id, userId: session.user.id },
			include: { fileChangeDetail: true },
		});

		if (!item) return null;

		let currentFileContent: string | null = null;
		let fileExists = false;

		if (item.fileChangeDetail) {
			const obsidianRoot = process.env.OBSIDIAN_DIR ?? "";
			if (obsidianRoot) {
				const absolutePath = path.join(obsidianRoot, item.fileChangeDetail.filePath);
				try {
					currentFileContent = await fs.readFile(absolutePath, "utf8");
					fileExists = true;
				} catch {
					fileExists = false;
				}
			}
		}

		// Fetch chat thread for cron_task/workflow/system_task activities
		let chatThread: ActivityChatThread | null = null;
		if (item.type === "cron_task" || item.type === "workflow" || item.type === "system_task") {
			try {
				const metadata = item.metadata ? JSON.parse(item.metadata) : null;
				const chatThreadId = metadata?.chatThreadId;
				if (chatThreadId) {
					const thread = await prisma.chatThread.findUnique({
						where: { id: chatThreadId },
						select: {
							id: true,
							title: true,
							model: true,
							messagesJson: true,
							systemPromptJson: true,
							availableToolsJson: true,
							totalInputTokens: true,
							totalOutputTokens: true,
							totalEstimatedCostUsd: true,
							createdAt: true,
						},
					});
					if (thread) {
						chatThread = {
							...thread,
							createdAt: thread.createdAt.toISOString(),
						};
					}
				}
			} catch {
				// metadata parse failed or thread not found — that's fine
			}
		}

		return {
			...item,
			createdAt: item.createdAt.toISOString(),
			currentFileContent,
			fileExists,
			chatThread,
		};
	});

export const revertFileChange = createServerFn({ method: "POST" })
	.inputValidator((data: { activityLogId: string }) => data)
	.handler(async ({ data }) => {
		const session = await ensureSession();

		const item = await prisma.activityLog.findFirst({
			where: { id: data.activityLogId, userId: session.user.id },
			include: { fileChangeDetail: true },
		});

		if (!item || !item.fileChangeDetail) {
			throw new Error("Not found");
		}

		const obsidianRoot = process.env.OBSIDIAN_DIR ?? "";
		if (!obsidianRoot) {
			throw new Error("Obsidian vault not configured");
		}

		const detail = item.fileChangeDetail;
		const absolutePath = path.join(obsidianRoot, detail.filePath);
		const fileName = path.basename(detail.filePath);

		// Read current content before revert for the new activity log
		let currentContent: string | null = null;
		try {
			currentContent = await fs.readFile(absolutePath, "utf8");
		} catch {
			// File may not exist
		}

		if (detail.originalContent === null) {
			// File was new — revert means delete it
			try {
				await fs.unlink(absolutePath);
			} catch {
				// File may already be gone
			}

			await logFileChange({
				userId: session.user.id,
				filePath: detail.filePath,
				originalContent: currentContent,
				newContent: "",
				changeSource: "manual",
				summary: `Reverted ${fileName} (deleted)`,
			});
		} else {
			// Restore original content
			const dir = path.dirname(absolutePath);
			await fs.mkdir(dir, { recursive: true });
			await fs.writeFile(absolutePath, detail.originalContent, "utf8");

			await logFileChange({
				userId: session.user.id,
				filePath: detail.filePath,
				originalContent: currentContent,
				newContent: detail.originalContent,
				changeSource: "manual",
				summary: `Reverted ${fileName}`,
			});
		}

		return { success: true };
	});
