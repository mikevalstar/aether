import { generateText, stepCountIs } from "ai";
import { prisma } from "#/db";
import { readWorkflowPromptConfig } from "#/lib/ai-config";
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

export type WorkflowField = {
	name: string;
	label: string;
	type: string;
	required: boolean;
	placeholder?: string;
	options?: string[];
	default?: string;
};

export type WorkflowConfig = {
	title: string;
	description?: string;
	model?: string;
	effort?: string;
	maxTokens?: number;
	fields: WorkflowField[];
	body: string;
};

export async function executeWorkflow(
	filename: string,
	config: WorkflowConfig,
	formValues: Record<string, string>,
	userId: string,
): Promise<{ threadId: string; success: boolean }> {
	const startTime = Date.now();

	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) {
		throw new Error("User not found");
	}

	// Resolve model and effort
	const workflowPromptConfig = await readWorkflowPromptConfig(user.name);
	const model = resolveModel(config.model, workflowPromptConfig.model);
	const effort = resolveEffort(config.effort, workflowPromptConfig.effort);
	const modelDef = CHAT_MODELS.find((m) => m.id === model);

	// Create ChatThread for this run
	const threadId = `thread_${crypto.randomUUID()}`;
	await prisma.chatThread.create({
		data: {
			id: threadId,
			type: "workflow",
			title: config.title,
			model,
			effort,
			sourceWorkflowFile: filename,
			userId,
		},
	});

	const systemPrompt = workflowPromptConfig.prompt;

	// Substitute placeholders in the workflow body
	const aiMemoryPath = process.env.OBSIDIAN_AI_MEMORY ?? "ai-memory";
	let workflowBody = config.body
		.replace(/\{\{date\}\}/g, formatIsoDate(new Date()))
		.replace(/\{\{userName\}\}/g, user.name)
		.replace(/\{\{aiMemoryPath\}\}/g, aiMemoryPath);

	// Substitute form field values
	for (const field of config.fields) {
		const value = formValues[field.name]?.trim() || "not entered";
		workflowBody = workflowBody.replace(new RegExp(`\\{\\{${field.name}\\}\\}`, "g"), value);
	}

	const tools = createAiTools(model, userId, threadId);

	try {
		const result = await generateText({
			model: anthropic(model),
			system: systemPrompt,
			prompt: workflowBody,
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

		const messagesJson = JSON.stringify(result.response.messages);
		const usage = usageTotalsFromLanguageModelUsage(result.usage);
		const estimatedCost = estimateChatUsageCostUsd(model, usage);

		const usageEntry = {
			id: `usage_${crypto.randomUUID()}`,
			model,
			taskType: "workflow" as const,
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
				},
			}),
			prisma.chatUsageEvent.create({
				data: {
					id: `usage_event_${crypto.randomUUID()}`,
					userId,
					threadId,
					model,
					taskType: "workflow",
					inputTokens: usage.inputTokens,
					outputTokens: usage.outputTokens,
					totalTokens: usage.totalTokens,
					estimatedCostUsd: estimatedCost,
				},
			}),
			prisma.activityLog.create({
				data: {
					type: "workflow",
					summary: `Ran workflow: ${config.title}`,
					metadata: JSON.stringify({
						workflowFile: filename,
						chatThreadId: threadId,
						model,
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						estimatedCostUsd: estimatedCost,
						durationMs,
						success: true,
						formValues,
					}),
					userId,
				},
			}),
			prisma.workflow.update({
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
				workflow: filename,
				threadId,
				model,
				inputTokens: usage.inputTokens,
				outputTokens: usage.outputTokens,
				costUsd: estimatedCost,
				durationMs,
			},
			"Workflow completed successfully",
		);

		return { threadId, success: true };
	} catch (err) {
		const durationMs = Date.now() - startTime;
		const errorMessage = err instanceof Error ? err.message : "Unknown error";

		logger.error({ workflow: filename, err, durationMs }, "Workflow execution failed");

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
									text: `Workflow execution failed: ${errorMessage}`,
								},
							],
						},
					]),
				},
			}),
			prisma.activityLog.create({
				data: {
					type: "workflow",
					summary: `Workflow failed: ${config.title}`,
					metadata: JSON.stringify({
						workflowFile: filename,
						chatThreadId: threadId,
						error: errorMessage,
						durationMs,
						success: false,
						formValues,
					}),
					userId,
				},
			}),
			prisma.workflow.update({
				where: { filename },
				data: {
					lastRunAt: new Date(),
					lastRunStatus: "error",
					lastThreadId: threadId,
				},
			}),
		]);

		return { threadId, success: false };
	}
}

function resolveModel(workflowModel?: string, configModel?: string): ChatModel {
	if (workflowModel && isChatModel(workflowModel)) return workflowModel;
	if (configModel && isChatModel(configModel)) return configModel;
	return DEFAULT_CHAT_MODEL;
}

function resolveEffort(workflowEffort?: string, configEffort?: string): string {
	if (workflowEffort && isChatEffort(workflowEffort)) return workflowEffort;
	if (configEffort && isChatEffort(configEffort)) return configEffort;
	return DEFAULT_CHAT_EFFORT;
}
