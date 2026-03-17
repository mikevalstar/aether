import { generateText, stepCountIs } from "ai";
import { prisma } from "#/db";
import { readTaskPromptConfig } from "#/lib/ai-config";
import { anthropic, createAiTools } from "#/lib/ai-tools";
import {
	type ChatModel,
	DEFAULT_CHAT_EFFORT,
	DEFAULT_CHAT_MODEL,
	estimateChatUsageCostUsd,
	isChatEffort,
	isChatModel,
	serializeUsageHistory,
	usageTotalsFromLanguageModelUsage,
} from "#/lib/chat";
import { CHAT_MODELS } from "#/lib/chat-models";
import { formatIsoDate } from "#/lib/date";
import { logger } from "#/lib/logger";
import { type NotificationLevel, notify } from "#/lib/notify";

export type TaskConfig = {
	title: string;
	cron: string;
	model?: string;
	effort?: string;
	enabled: boolean;
	endDate?: string;
	maxTokens?: number;
	timezone?: string;
	notification: NotificationLevel;
	body: string;
};

export async function executeTask(filename: string, config: TaskConfig): Promise<void> {
	const startTime = Date.now();

	// Find first admin user
	const adminUser = await prisma.user.findFirst({
		where: { role: "admin" },
		orderBy: { createdAt: "asc" },
	});

	if (!adminUser) {
		logger.error("No admin user found for task execution");
		return;
	}

	// Resolve model and effort
	const taskPromptConfig = await readTaskPromptConfig(adminUser.name);
	const model = resolveModel(config.model, taskPromptConfig.model);
	const effort = resolveEffort(config.effort, taskPromptConfig.effort);
	const modelDef = CHAT_MODELS.find((m) => m.id === model);

	// Create ChatThread for this run
	const threadId = `thread_${crypto.randomUUID()}`;
	await prisma.chatThread.create({
		data: {
			id: threadId,
			type: "task",
			title: config.title,
			model,
			effort,
			sourceTaskFile: filename,
			userId: adminUser.id,
		},
	});

	const systemPrompt = taskPromptConfig.prompt;

	// Substitute placeholders in the task body
	const aiMemoryPath = process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory";
	const taskBody = config.body
		.replace(/\{\{date\}\}/g, formatIsoDate(new Date()))
		.replace(/\{\{userName\}\}/g, adminUser.name)
		.replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath);

	const tools = createAiTools(model, adminUser.id, threadId);
	const toolNames = Object.keys(tools);

	try {
		const result = await generateText({
			model: anthropic(model),
			system: systemPrompt,
			prompt: taskBody,
			tools,
			stopWhen: stepCountIs(10),
			...(config.maxTokens ? { maxTokens: config.maxTokens } : {}),
			providerOptions: {
				anthropic: {
					cacheControl: { type: "ephemeral" as const },
					...(modelDef?.supportsEffort && { effort }),
				},
			},
		});

		// Build messages for storage — response.messages are ResponseMessage[], serialize directly
		const messagesJson = JSON.stringify(result.response.messages);
		const usage = usageTotalsFromLanguageModelUsage(result.usage);
		const estimatedCost = estimateChatUsageCostUsd(model, usage);

		const usageEntry = {
			id: `usage_${crypto.randomUUID()}`,
			model,
			taskType: "task" as const,
			createdAt: new Date().toISOString(),
			...usage,
			estimatedCostUsd: estimatedCost,
			cumulativeInputTokens: usage.inputTokens,
			cumulativeOutputTokens: usage.outputTokens,
			cumulativeTotalTokens: usage.totalTokens,
			cumulativeEstimatedCostUsd: estimatedCost,
		};

		const durationMs = Date.now() - startTime;

		await prisma.$transaction([
			prisma.chatThread.update({
				where: { id: threadId },
				data: {
					messagesJson,
					usageHistoryJson: serializeUsageHistory([usageEntry]),
					totalInputTokens: usage.inputTokens,
					totalOutputTokens: usage.outputTokens,
					totalEstimatedCostUsd: estimatedCost,
					systemPromptJson: JSON.stringify(systemPrompt),
					availableToolsJson: JSON.stringify(toolNames),
				},
			}),
			prisma.chatUsageEvent.create({
				data: {
					id: `usage_event_${crypto.randomUUID()}`,
					userId: adminUser.id,
					threadId,
					model,
					taskType: "task",
					inputTokens: usage.inputTokens,
					outputTokens: usage.outputTokens,
					totalTokens: usage.totalTokens,
					estimatedCostUsd: estimatedCost,
				},
			}),
			prisma.activityLog.create({
				data: {
					type: "cron_task",
					summary: `Ran task: ${config.title}`,
					metadata: JSON.stringify({
						taskFile: filename,
						chatThreadId: threadId,
						model,
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						estimatedCostUsd: estimatedCost,
						durationMs,
						success: true,
					}),
					userId: adminUser.id,
				},
			}),
			prisma.task.update({
				where: { filename },
				data: {
					lastRunAt: new Date(),
					lastRunStatus: "success",
					lastThreadId: threadId,
				},
			}),
		]);

		logger.info(
			{
				task: filename,
				threadId,
				model,
				inputTokens: usage.inputTokens,
				outputTokens: usage.outputTokens,
				costUsd: estimatedCost,
				durationMs,
			},
			"Task completed successfully",
		);

		if (config.notification !== "silent") {
			await notify({
				userId: adminUser.id,
				title: `Task completed: ${config.title}`,
				link: `/tasks`,
				pushToPhone: config.notification === "push",
			});
		}
	} catch (err) {
		const durationMs = Date.now() - startTime;
		const errorMessage = err instanceof Error ? err.message : "Unknown error";

		logger.error({ task: filename, err, durationMs }, "Task execution failed");

		await prisma.$transaction([
			prisma.chatThread.update({
				where: { id: threadId },
				data: {
					messagesJson: JSON.stringify([
						{
							id: `msg_${crypto.randomUUID()}`,
							role: "assistant",
							parts: [
								{
									type: "text",
									text: `Task execution failed: ${errorMessage}`,
								},
							],
						},
					]),
				},
			}),
			prisma.activityLog.create({
				data: {
					type: "cron_task",
					summary: `Task failed: ${config.title}`,
					metadata: JSON.stringify({
						taskFile: filename,
						chatThreadId: threadId,
						error: errorMessage,
						durationMs,
						success: false,
					}),
					userId: adminUser.id,
				},
			}),
			prisma.task.update({
				where: { filename },
				data: {
					lastRunAt: new Date(),
					lastRunStatus: "error",
					lastThreadId: threadId,
				},
			}),
		]);

		if (config.notification !== "silent") {
			await notify({
				userId: adminUser.id,
				title: `Task failed: ${config.title}`,
				body: errorMessage,
				link: `/tasks`,
				pushToPhone: true,
			});
		}
	}
}

function resolveModel(taskModel?: string, configModel?: string): ChatModel {
	if (taskModel && isChatModel(taskModel)) return taskModel;
	if (configModel && isChatModel(configModel)) return configModel;
	return DEFAULT_CHAT_MODEL;
}

function resolveEffort(taskEffort?: string, configEffort?: string): string {
	if (taskEffort && isChatEffort(taskEffort)) return taskEffort;
	if (configEffort && isChatEffort(configEffort)) return configEffort;
	return DEFAULT_CHAT_EFFORT;
}
