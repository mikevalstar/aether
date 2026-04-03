import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createIdGenerator,
  generateText,
  type LanguageModelUsage,
  stepCountIs,
  streamText,
} from "ai";
import { z } from "zod";
import { prisma } from "#/db";
import { readSystemPrompt, readTitlePromptConfig } from "#/lib/ai-config";
import { createAiTools, getModel } from "#/lib/ai-tools";
import { auth } from "#/lib/auth";
import {
  type AppChatMessage,
  addChatUsageTotals,
  type ChatEffort,
  type ChatModel,
  type ChatTaskType,
  type ChatUsageEntry,
  type ChatUsageTotals,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  estimateChatUsageCostUsd,
  getChatTitleFromMessages,
  getMessageText,
  isChatEffort,
  parseStoredMessages,
  parseUsageHistory,
  serializeMessages,
  serializeUsageHistory,
  usageTotalsFromLanguageModelUsage,
} from "#/lib/chat";
import { CHAT_MODELS, resolveModelId } from "#/lib/chat-models";
import { logger } from "#/lib/logger";
import { parsePreferences } from "#/lib/preferences";
import { buildSkillsPromptSection, readAllSkills } from "#/lib/skills";
import { createLoadSkill } from "#/lib/tools/load-skill";
import { getPluginSystemPrompts } from "#/plugins/index.server";

type TitleGenerationResult = {
  title: string;
  model: ChatModel;
  usage: LanguageModelUsage | undefined;
};

async function generateChatTitle(userMessage: string): Promise<TitleGenerationResult> {
  try {
    const titleConfig = await readTitlePromptConfig();
    const titleModel = (titleConfig?.model ?? "claude-haiku-4-5") as ChatModel;
    const titleSystemPrompt =
      titleConfig?.prompt ??
      "Generate a short, descriptive title for a chat conversation based on the user's first message. The title must be no more than 10 words. Output only the title text, nothing else. No quotes, no punctuation at the end.";

    const { text, usage } = await generateText({
      model: getModel(titleModel),
      system: titleSystemPrompt,
      prompt: userMessage,
    });

    const title = text.trim().replace(/[."']+$/, "");
    return {
      title: title || getChatTitleFromMessages([]),
      model: titleModel,
      usage,
    };
  } catch {
    return {
      title: userMessage.length <= 72 ? userMessage : `${userMessage.slice(0, 69).trimEnd()}...`,
      model: "claude-haiku-4-5",
      usage: undefined,
    };
  }
}

const chatRequestBodySchema = z
  .object({
    id: z.string().trim().min(1),
    messages: z
      .array(
        z
          .object({
            id: z.string().trim().min(1),
            role: z.string().trim().min(1),
            parts: z.array(z.unknown()),
          })
          .passthrough(),
      )
      .min(1),
    model: z.string().trim().optional(),
    effort: z.string().trim().optional(),
  })
  .passthrough();

function joinQuoted(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join(", ");
}

async function parseChatRequest(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return {
      ok: false as const,
      response: new Response("Invalid chat request: request body must be valid JSON.", { status: 400 }),
    };
  }

  const parsedBody = chatRequestBodySchema.safeParse(json);

  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const path = issue?.path.length ? issue.path.join(".") : "request body";
    const reason = issue?.message ?? "Request body does not match the expected shape.";

    return {
      ok: false as const,
      response: new Response(`Invalid chat request: ${path} ${reason}.`, { status: 400 }),
    };
  }

  const body = parsedBody.data;

  if (body.model) {
    const resolved = resolveModelId(body.model);
    if (!resolved) {
      return {
        ok: false as const,
        response: new Response(
          `Unsupported chat model "${body.model}". Supported models: ${joinQuoted(CHAT_MODELS.map((model) => model.id))}.`,
          { status: 400 },
        ),
      };
    }
    body.model = resolved;
  }

  if (body.effort && !isChatEffort(body.effort)) {
    return {
      ok: false as const,
      response: new Response(
        `Unsupported chat effort "${body.effort}". Supported effort levels: ${joinQuoted(["low", "medium", "high"])}.`,
        { status: 400 },
      ),
    };
  }

  return {
    ok: true as const,
    body: {
      ...body,
      model: body.model as ChatModel | undefined,
      effort: body.effort as ChatEffort | undefined,
    },
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        const parsedRequest = await parseChatRequest(request);
        if (!parsedRequest.ok) {
          return parsedRequest.response;
        }
        const body = parsedRequest.body;
        logger.info({ userId: session.user.id, threadId: body.id, model: body.model }, "Chat request received");
        const threadId = body.id;
        const incomingMessages = body.messages as AppChatMessage[];

        const thread = await prisma.chatThread.findFirst({
          where: {
            id: threadId,
            userId: session.user.id,
          },
        });

        if (!thread) {
          return new Response("Not found", { status: 404 });
        }

        const model = body.model ?? DEFAULT_CHAT_MODEL;
        const effort = body.effort ?? DEFAULT_CHAT_EFFORT;
        const modelDef = CHAT_MODELS.find((m) => m.id === model);
        const userRecord = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { preferences: true },
        });
        const userPrefs = parsePreferences(userRecord?.preferences);
        const userTimezone = userPrefs.timezone;
        const tools = createAiTools(model, session.user.id, thread.id, userTimezone, userPrefs);
        let currentTotals: ChatUsageTotals = {
          inputTokens: thread.totalInputTokens ?? 0,
          outputTokens: thread.totalOutputTokens ?? 0,
          totalTokens: (thread.totalInputTokens ?? 0) + (thread.totalOutputTokens ?? 0),
          estimatedCostUsd: thread.totalEstimatedCostUsd ?? 0,
        };
        let usageHistory = parseUsageHistory(thread.usageHistoryJson ?? "[]");
        const titleUsageEvents: Array<{
          model: ChatModel;
          taskType: ChatTaskType;
          exchangeUsage: ChatUsageTotals;
          createdAt: string;
        }> = [];

        const createUsageUpdate = (
          usage: LanguageModelUsage | undefined,
          messages: AppChatMessage[],
          options?: {
            taskType?: ChatTaskType;
            usageModel?: ChatModel;
          },
        ) => {
          const taskType = options?.taskType ?? "chat";
          const usageModel = options?.usageModel ?? model;
          const usageTotals = usageTotalsFromLanguageModelUsage(usage);
          const exchangeUsage: ChatUsageTotals = {
            ...usageTotals,
            estimatedCostUsd: estimateChatUsageCostUsd(usageModel, usageTotals),
          };
          const nextTotals = addChatUsageTotals(currentTotals, exchangeUsage);
          const assistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
          const usageEntry: ChatUsageEntry = {
            id: `usage_${crypto.randomUUID()}`,
            model: usageModel,
            taskType,
            createdAt: new Date().toISOString(),
            messageId: assistantMessage?.id,
            ...exchangeUsage,
            cumulativeInputTokens: nextTotals.inputTokens,
            cumulativeOutputTokens: nextTotals.outputTokens,
            cumulativeTotalTokens: nextTotals.totalTokens,
            cumulativeEstimatedCostUsd: nextTotals.estimatedCostUsd,
          };

          return {
            exchangeUsage,
            nextTotals,
            usageEntry,
            nextUsageHistory: [...usageHistory, usageEntry],
          };
        };

        // Only generate an AI title on the first message (thread still has default title)
        const existingMessages = parseStoredMessages(thread.messagesJson ?? "[]");
        const isFirstMessage = existingMessages.length === 0 && thread.title === "New chat";

        let title = thread.title;
        if (isFirstMessage) {
          const firstUserText =
            incomingMessages
              .filter((m) => m.role === "user")
              .map((m) => getMessageText(m))
              .find(Boolean) ?? "";
          if (firstUserText) {
            const titleResult = await generateChatTitle(firstUserText);
            title = titleResult.title;

            // Track title generation usage
            if (titleResult.usage) {
              const titleUpdate = createUsageUpdate(titleResult.usage, incomingMessages, {
                taskType: "title",
                usageModel: titleResult.model,
              });
              // Advance cumulative totals so the chat usage stacks on top
              currentTotals = titleUpdate.nextTotals;
              usageHistory = titleUpdate.nextUsageHistory;
              titleUsageEvents.push({
                model: titleResult.model,
                taskType: "title",
                exchangeUsage: titleUpdate.exchangeUsage,
                createdAt: titleUpdate.usageEntry.createdAt,
              });
            }
          }
        }

        await prisma.chatThread.update({
          where: { id: thread.id },
          data: {
            model,
            title,
            messagesJson: serializeMessages(incomingMessages),
          },
        });

        const userName = session.user.name || "User";
        const [configuredPrompt, skills] = await Promise.all([readSystemPrompt(userName), readAllSkills()]);

        if (!configuredPrompt) {
          return new Response("System prompt is not configured", {
            status: 500,
          });
        }

        const pluginPrompts = getPluginSystemPrompts(userPrefs);
        const pluginPromptSection = pluginPrompts.length > 0 ? `\n\n## Plugins\n\n${pluginPrompts.join("\n\n")}` : "";
        const systemPrompt = configuredPrompt + buildSkillsPromptSection(skills) + pluginPromptSection;
        if (skills.length > 0) {
          tools.load_skill = createLoadSkill(skills);
        }
        const toolNames = Object.keys(tools);

        const isAnthropic = modelDef?.provider === "anthropic";
        const result = streamText({
          model: getModel(model),
          system: systemPrompt,
          messages: await convertToModelMessages(incomingMessages),
          tools,
          stopWhen: stepCountIs(20),
          ...(isAnthropic && {
            providerOptions: {
              anthropic: {
                cacheControl: { type: "ephemeral" as const },
                ...(modelDef?.supportsEffort && { effort }),
              },
            },
          }),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: incomingMessages,
          generateMessageId: createIdGenerator({
            prefix: "msg",
            size: 16,
          }),
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return {
                createdAt: Date.now(),
                model,
              };
            }

            if (part.type === "finish") {
              const update = createUsageUpdate(part.totalUsage, incomingMessages);

              return {
                model,
                usage: update.exchangeUsage,
                totals: update.nextTotals,
                usageEntry: update.usageEntry,
              };
            }
          },
          onFinish: async ({ messages }) => {
            const finalMessages = messages as AppChatMessage[];
            const totalUsage = await result.totalUsage;
            const update = createUsageUpdate(totalUsage, finalMessages);
            logger.info(
              {
                threadId: thread.id,
                model,
                inputTokens: update.exchangeUsage.inputTokens,
                outputTokens: update.exchangeUsage.outputTokens,
                costUsd: update.exchangeUsage.estimatedCostUsd,
              },
              "Chat response completed",
            );

            await prisma.$transaction([
              // Create usage events for title generation (if any)
              ...titleUsageEvents.map((titleEvent) =>
                prisma.chatUsageEvent.create({
                  data: {
                    id: `usage_event_${crypto.randomUUID()}`,
                    userId: session.user.id,
                    threadId: thread.id,
                    model: titleEvent.model,
                    taskType: titleEvent.taskType,
                    inputTokens: titleEvent.exchangeUsage.inputTokens,
                    outputTokens: titleEvent.exchangeUsage.outputTokens,
                    totalTokens: titleEvent.exchangeUsage.totalTokens,
                    estimatedCostUsd: titleEvent.exchangeUsage.estimatedCostUsd,
                    createdAt: new Date(titleEvent.createdAt),
                  },
                }),
              ),
              prisma.chatThread.update({
                where: { id: thread.id },
                data: {
                  model,
                  messagesJson: serializeMessages(finalMessages),
                  usageHistoryJson: serializeUsageHistory(update.nextUsageHistory),
                  totalInputTokens: update.nextTotals.inputTokens,
                  totalOutputTokens: update.nextTotals.outputTokens,
                  totalEstimatedCostUsd: update.nextTotals.estimatedCostUsd,
                  systemPromptJson: JSON.stringify(systemPrompt),
                  availableToolsJson: JSON.stringify(toolNames),
                },
              }),
              prisma.chatUsageEvent.create({
                data: {
                  id: `usage_event_${crypto.randomUUID()}`,
                  userId: session.user.id,
                  threadId: thread.id,
                  model,
                  taskType: "chat",
                  inputTokens: update.exchangeUsage.inputTokens,
                  outputTokens: update.exchangeUsage.outputTokens,
                  totalTokens: update.exchangeUsage.totalTokens,
                  estimatedCostUsd: update.exchangeUsage.estimatedCostUsd,
                  createdAt: new Date(update.usageEntry.createdAt),
                },
              }),
            ]);
          },
        });
      },
    },
  },
});
