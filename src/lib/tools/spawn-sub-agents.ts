import { generateText, stepCountIs, tool } from "ai";
import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "#/db";
import { readSystemPrompt } from "#/lib/ai-config/ai-config";
import { createAiTools, getModel } from "#/lib/ai-tools";
import {
  CHAT_MODELS,
  type ChatModel,
  estimateChatUsageCostUsd,
  serializeUsageHistory,
  usageTotalsFromLanguageModelUsage,
} from "#/lib/chat/chat";
import { logger } from "#/lib/logger";
import type { UserPreferences } from "#/lib/preferences";
import { findSubAgent, type SubAgentEntry } from "#/lib/sub-agents";

export type SpawnSubAgentsParentContext = {
  userId: string;
  parentThreadId: string;
  parentModel: ChatModel;
  parentEffort: string;
  userTimezone?: string;
  userPrefs: UserPreferences;
  userName?: string;
  userEmail?: string;
};

type SpawnResult = {
  agent: string;
  name: string;
  threadId?: string;
  model: ChatModel;
  finalText?: string;
  error?: string;
};

/**
 * Build the tool description, embedding the available sub-agents catalog so
 * the parent AI knows which ones it can spawn and when.
 */
function buildToolDescription(subAgents: SubAgentEntry[]): string {
  const catalogLines = subAgents.map((s) => `- ${s.filename}: ${s.description}`);

  return [
    "Delegate one or more focused subtasks to sub-agents that run in parallel.",
    "Each sub-agent runs its own conversation with the same tool set as you, and ONLY its final assistant message is returned to you — tool calls and intermediate reasoning stay in the sub-agent's own thread.",
    "Use this when you need deep research or multi-step work that would bloat your main context, especially when several independent investigations can happen in parallel.",
    "",
    "Each spawn takes an `agent` (the filename or name of the sub-agent to use) and a `prompt` (the full task, including any context the sub-agent needs — it cannot ask you follow-up questions).",
    "",
    "Available sub-agents:",
    ...catalogLines,
  ].join("\n");
}

/**
 * Extract the final assistant text from a generateText response.
 */
function extractFinalText(response: { text?: string; content?: unknown }): string {
  if (typeof response.text === "string" && response.text.length > 0) return response.text;
  // Fallback: stitch text parts from content if present.
  if (Array.isArray(response.content)) {
    return response.content
      .filter((p) => p && typeof p === "object" && "type" in p && (p as { type: string }).type === "text")
      .map((p) => (p as { text?: string }).text ?? "")
      .join("\n")
      .trim();
  }
  return "";
}

/**
 * Run a single sub-agent synchronously. Persists its full conversation to a
 * new ChatThread linked to the parent, writes a ChatUsageEvent with
 * taskType="sub-agent", and returns only the final assistant text.
 */
async function runSubAgent(
  subAgent: SubAgentEntry,
  userPrompt: string,
  parent: SpawnSubAgentsParentContext,
): Promise<SpawnResult> {
  const model: ChatModel = subAgent.model ?? parent.parentModel;
  const modelDef = CHAT_MODELS.find((m) => m.id === model);

  const threadId = `thread_${nanoid(10)}`;
  const title = `${subAgent.name}: ${userPrompt.slice(0, 60).trimEnd()}${userPrompt.length > 60 ? "..." : ""}`;

  // Compose the sub-agent's system prompt: base system prompt + sub-agent body.
  const userVars = {
    userName: parent.userName ?? "User",
    userEmail: parent.userEmail,
    timezone: parent.userTimezone,
  };
  const baseSystemPrompt = (await readSystemPrompt(userVars)) ?? "";
  const systemPrompt = `${baseSystemPrompt}\n\n## Sub-Agent Role\n\n${subAgent.body}`.trim();

  // Tools: full parent tool set. `spawn_sub_agents` itself is wired in by the
  // chat/task/workflow/trigger runners separately, so createAiTools naturally
  // excludes it — preventing recursion.
  const tools = createAiTools(model, parent.userId, threadId, parent.userTimezone, parent.userPrefs);
  const toolNames = Object.keys(tools);

  await prisma.chatThread.create({
    data: {
      id: threadId,
      type: "sub-agent",
      title,
      model,
      effort: parent.parentEffort,
      parentThreadId: parent.parentThreadId,
      subAgentFilename: subAgent.filename,
      userId: parent.userId,
    },
  });

  const startedAt = Date.now();

  try {
    const result = await generateText({
      model: getModel(model),
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(20),
      ...(modelDef?.provider === "anthropic" && {
        providerOptions: {
          anthropic: {
            cacheControl: { type: "ephemeral" as const },
            ...(modelDef?.supportsEffort && { effort: parent.parentEffort }),
          },
        },
      }),
    });

    const messagesJson = JSON.stringify(result.response.messages);
    const usage = usageTotalsFromLanguageModelUsage(result.usage);
    const estimatedCost = estimateChatUsageCostUsd(model, usage);
    const finalText = extractFinalText(result);

    const usageEntry = {
      id: `usage_${nanoid(10)}`,
      model,
      taskType: "sub-agent" as const,
      createdAt: new Date().toISOString(),
      ...usage,
      estimatedCostUsd: estimatedCost,
      cumulativeInputTokens: usage.inputTokens,
      cumulativeOutputTokens: usage.outputTokens,
      cumulativeTotalTokens: usage.totalTokens,
      cumulativeEstimatedCostUsd: estimatedCost,
    };

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
          id: `usage_event_${nanoid(10)}`,
          userId: parent.userId,
          threadId,
          model,
          taskType: "sub-agent",
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsd: estimatedCost,
        },
      }),
    ]);

    logger.info(
      {
        parentThreadId: parent.parentThreadId,
        subAgent: subAgent.filename,
        threadId,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: estimatedCost,
        durationMs: Date.now() - startedAt,
      },
      "Sub-agent completed",
    );

    return {
      agent: subAgent.filename,
      name: subAgent.name,
      threadId,
      model,
      finalText,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      {
        parentThreadId: parent.parentThreadId,
        subAgent: subAgent.filename,
        threadId,
        err,
      },
      "Sub-agent failed",
    );

    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        messagesJson: JSON.stringify([
          {
            id: `msg_${nanoid(10)}`,
            role: "assistant",
            parts: [{ type: "text", text: `Sub-agent execution failed: ${errorMessage}` }],
          },
        ]),
      },
    });

    return {
      agent: subAgent.filename,
      name: subAgent.name,
      threadId,
      model,
      error: errorMessage,
    };
  }
}

/**
 * Create the `spawn_sub_agents` tool for a parent AI context.
 * Returns undefined if no sub-agents are configured (nothing to spawn).
 */
export function createSpawnSubAgents(subAgents: SubAgentEntry[], parent: SpawnSubAgentsParentContext) {
  if (subAgents.length === 0) return undefined;

  return tool({
    description: buildToolDescription(subAgents),
    inputSchema: z.object({
      spawns: z
        .array(
          z.object({
            agent: z.string().min(1).describe("The sub-agent filename (e.g. research.md) or name"),
            prompt: z.string().min(1).describe("The full task prompt for the sub-agent"),
          }),
        )
        .min(1)
        .max(25),
    }),
    execute: async ({ spawns }) => {
      const settled = await Promise.all(
        spawns.map(async (spawn): Promise<SpawnResult> => {
          const subAgent = findSubAgent(subAgents, spawn.agent);
          if (!subAgent) {
            return {
              agent: spawn.agent,
              name: spawn.agent,
              model: parent.parentModel,
              error: `Sub-agent "${spawn.agent}" not found. Available: ${subAgents.map((s) => s.filename).join(", ")}`,
            };
          }
          return runSubAgent(subAgent, spawn.prompt, parent);
        }),
      );

      return {
        spawns: settled.map((s) => ({
          agent: s.agent,
          name: s.name,
          model: s.model,
          threadId: s.threadId,
          ...(s.error ? { error: s.error } : { finalText: s.finalText ?? "" }),
        })),
      };
    },
  });
}
