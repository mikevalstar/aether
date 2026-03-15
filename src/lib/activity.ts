import { prisma } from "#/db";

export type FileChangeSource = "ai" | "manual";

export type LogFileChangeParams = {
	userId: string;
	filePath: string;
	originalContent: string | null;
	newContent: string;
	changeSource: FileChangeSource;
	toolName?: string;
	summary: string;
	metadata?: Record<string, unknown>;
};

/**
 * Create an ActivityLog + FileChangeDetail record.
 * Non-blocking — caller should catch errors to avoid blocking the write.
 */
export async function logFileChange(params: LogFileChangeParams) {
	await prisma.activityLog.create({
		data: {
			type: "file_change",
			summary: params.summary,
			metadata: params.metadata ? JSON.stringify(params.metadata) : null,
			userId: params.userId,
			fileChangeDetail: {
				create: {
					filePath: params.filePath,
					originalContent: params.originalContent,
					newContent: params.newContent,
					changeSource: params.changeSource,
					toolName: params.toolName ?? null,
				},
			},
		},
	});
}
