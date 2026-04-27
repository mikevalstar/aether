import { readUIMessageStream, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "#/db";
import { readSystemPrompt } from "#/lib/ai-config/ai-config";
import { createAiTools, getModel } from "#/lib/ai-tools";
import {
  type ChatModel,
  estimateChatUsageCostUsd,
  serializeUsageHistory,
  usageTotalsFromLanguageModelUsage,
} from "#/lib/chat/chat";
import { getChatModelDef } from "#/lib/chat/chat-model-def.server";
import { type ChatEffort, isChatEffort } from "#/lib/chat/chat-models";
import { getDefaultMaxTokensForEffort } from "#/lib/chat/max-tokens";
import { snapshotModelMeta } from "#/lib/chat/model-snapshot";
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

/** Per-spawn state that is snapshotted and yielded to the parent UI stream. */
type SpawnState = {
  agent: string;
  name: string;
  model: ChatModel;
  threadId?: string;
  status: "pending" | "running" | "done" | "error";
  text: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  error?: string;
};

/** Output schema yielded on every snapshot. Shape must stay stable. */
const spawnStateSchema = z.object({
  agent: z.string(),
  name: z.string(),
  model: z.string(),
  threadId: z.string().optional(),
  status: z.enum(["pending", "running", "done", "error"]),
  text: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  estimatedCostUsd: z.number(),
  error: z.string().optional(),
});

const spawnOutputSchema = z.object({
  spawns: z.array(spawnStateSchema),
});

const STREAM_TICK_MS = 100;

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

/** Snapshot of the whole output — mutating the underlying map won't leak to the client, AI SDK serializes on send. */
function snapshot(states: Map<string, SpawnState>): { spawns: SpawnState[] } {
  return { spawns: [...states.values()].map((s) => ({ ...s })) };
}

/**
 * Drive a single sub-agent via streamText, mutating its shared state object as
 * text streams in. Persists the full conversation + usage event at the end.
 * Never throws — errors are captured into state.error so other spawns aren't cancelled.
 */
async function runSubAgent(
  subAgent: SubAgentEntry,
  userPrompt: string,
  parent: SpawnSubAgentsParentContext,
  state: SpawnState,
  notify: () => void,
): Promise<void> {
  const modelDef = await getChatModelDef(state.model, parent.userId);

  const threadId = `thread_${nanoid(10)}`;
  state.threadId = threadId;

  const title = `${subAgent.name}: ${userPrompt.slice(0, 60).trimEnd()}${userPrompt.length > 60 ? "..." : ""}`;

  const userVars = {
    userName: parent.userName ?? "User",
    userEmail: parent.userEmail,
    timezone: parent.userTimezone,
  };
  const baseSystemPrompt = (await readSystemPrompt(userVars)) ?? "";
  const systemPrompt = `${baseSystemPrompt}\n\n## Sub-Agent Role\n\n${subAgent.body}`.trim();

  // Full parent tool set. `spawn_sub_agents` is wired in by each runner *after*
  // `createAiTools()`, so sub-agents naturally never see it — no recursion.
  const tools = createAiTools(state.model, parent.userId, threadId, parent.userTimezone, parent.userPrefs);
  const toolNames = Object.keys(tools);

  const modelMeta = await snapshotModelMeta(state.model, parent.userId);
  await prisma.chatThread.create({
    data: {
      id: threadId,
      type: "sub-agent",
      title,
      model: state.model,
      modelLabel: modelMeta.modelLabel,
      modelProvider: modelMeta.modelProvider,
      effort: parent.parentEffort,
      parentThreadId: parent.parentThreadId,
      subAgentFilename: subAgent.filename,
      userId: parent.userId,
    },
  });

  state.status = "running";
  notify();

  const startedAt = Date.now();

  try {
    const isAnthropic = modelDef?.provider === "anthropic";
    const isOpenRouter = modelDef?.provider === "openrouter";
    const effort: ChatEffort = isChatEffort(parent.parentEffort) ? parent.parentEffort : "low";
    const maxOutputTokens = modelDef?.supportsEffort ? getDefaultMaxTokensForEffort(effort) : undefined;
    const result = streamText({
      model: getModel(state.model),
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(20),
      ...(maxOutputTokens && { maxOutputTokens }),
      providerOptions: {
        ...(isAnthropic && {
          anthropic: {
            cacheControl: { type: "ephemeral" as const },
            ...(modelDef?.supportsEffort && { effort }),
          },
        }),
        ...(isOpenRouter &&
          modelDef?.supportsEffort && {
            openrouter: { reasoning: { effort } },
          }),
      },
    });

    // Consume the UI-message stream so we get assembled UIMessages (the shape
    // the chat UI expects) and can track live text for the parent UI snapshots.
    const assistantMessages: UIMessage[] = [];
    const assistantById = new Map<string, UIMessage>();

    for await (const message of readUIMessageStream({ stream: result.toUIMessageStream() })) {
      if (!assistantById.has(message.id)) {
        assistantById.set(message.id, message);
        assistantMessages.push(message);
      } else {
        // Replace in-place so the array stays ordered and references the latest snapshot.
        const idx = assistantMessages.findIndex((m) => m.id === message.id);
        if (idx >= 0) assistantMessages[idx] = message;
        assistantById.set(message.id, message);
      }

      // Extract current text from the latest message's text parts for the live
      // preview in the parent transcript.
      state.text = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("\n")
        .trim();
      notify();
    }

    const totalUsage = await result.totalUsage;
    const usage = usageTotalsFromLanguageModelUsage(totalUsage);
    const estimatedCost = estimateChatUsageCostUsd(state.model, usage, modelDef?.pricing);
    const finalText = await result.text;

    // Build the full conversation: a synthetic user message with the prompt,
    // followed by the streamed assistant messages.
    const userUIMessage: UIMessage = {
      id: `msg_${nanoid(10)}`,
      role: "user",
      parts: [{ type: "text", text: userPrompt }],
    };
    const allMessages = [userUIMessage, ...assistantMessages];

    state.text = finalText;
    state.status = "done";
    state.inputTokens = usage.inputTokens;
    state.outputTokens = usage.outputTokens;
    state.estimatedCostUsd = estimatedCost;
    notify();

    const usageEntry = {
      id: `usage_${nanoid(10)}`,
      model: state.model,
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
          messagesJson: JSON.stringify(allMessages),
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
          model: state.model,
          modelLabel: modelMeta.modelLabel,
          modelProvider: modelMeta.modelProvider,
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
        model: state.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: estimatedCost,
        durationMs: Date.now() - startedAt,
      },
      "Sub-agent completed",
    );
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

    state.status = "error";
    state.error = errorMessage;
    notify();

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
    outputSchema: spawnOutputSchema,
    async *execute({ spawns }) {
      // Initialize per-spawn state. Unknown agents get an immediate error.
      const states = new Map<string, SpawnState>();
      const runnable: Array<{ subAgent: SubAgentEntry; prompt: string; state: SpawnState }> = [];

      for (let i = 0; i < spawns.length; i++) {
        const spawn = spawns[i];
        const key = `${i}:${spawn.agent}`;
        const subAgent = findSubAgent(subAgents, spawn.agent);

        if (!subAgent) {
          const state: SpawnState = {
            agent: spawn.agent,
            name: spawn.agent,
            model: parent.parentModel,
            status: "error",
            text: "",
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
            error: `Sub-agent "${spawn.agent}" not found. Available: ${subAgents.map((s) => s.filename).join(", ")}`,
          };
          states.set(key, state);
          continue;
        }

        const state: SpawnState = {
          agent: subAgent.filename,
          name: subAgent.name,
          model: subAgent.model ?? parent.parentModel,
          status: "pending",
          text: "",
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
        };
        states.set(key, state);
        runnable.push({ subAgent, prompt: spawn.prompt, state });
      }

      // Throttled notify — wakes the generator loop on each state change, then
      // coalesces further changes for STREAM_TICK_MS before yielding again.
      let wake: () => void = () => {};
      let wakePromise: Promise<void> = new Promise<void>((resolve) => {
        wake = resolve;
      });
      const resetWake = () => {
        wakePromise = new Promise<void>((resolve) => {
          wake = resolve;
        });
      };

      let dirty = false;
      const notify = () => {
        dirty = true;
        wake();
      };

      // Kick off all runnable spawns in parallel.
      const allDone = Promise.all(runnable.map((r) => runSubAgent(r.subAgent, r.prompt, parent, r.state, notify)));
      allDone.finally(() => wake());

      // Emit the initial snapshot so the UI shows pending cards right away.
      yield snapshot(states);

      // Yield throttled snapshots until every runnable spawn is settled.
      let settled = false;
      allDone.finally(() => {
        settled = true;
      });

      while (!settled) {
        await wakePromise;
        resetWake();

        if (dirty) {
          dirty = false;
          yield snapshot(states);
        }

        // Coalesce: sleep for the tick before the next yield.
        if (!settled) {
          await new Promise((r) => setTimeout(r, STREAM_TICK_MS));
        }
      }

      // Make sure any final mutations that happened during the tick are flushed.
      yield snapshot(states);
    },
  });
}
