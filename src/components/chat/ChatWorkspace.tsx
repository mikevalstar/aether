import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Thread } from "#/components/assistant-ui/thread";
import { ChatRunHeader, type ChatRunHeaderProps } from "#/components/chat/ChatRunHeader";
import {
  type AppChatMessage,
  type ChatEffort,
  type ChatModel,
  DEFAULT_CHAT_EFFORT,
  DEFAULT_CHAT_MODEL,
  estimateChatUsageCostUsd,
  parseStoredMessages,
} from "#/lib/chat/chat";
import type { CostBreakdown } from "#/lib/chat/chat-cost-aggregation";
import { computeRunStats } from "#/lib/chat/chat-run";

type HeaderProps = Pick<
  ChatRunHeaderProps,
  | "threadId"
  | "title"
  | "model"
  | "effort"
  | "startedAt"
  | "endedAt"
  | "editable"
  | "parentLink"
  | "onTitleChange"
  | "onModelChange"
  | "onEffortChange"
  | "onDelete"
  | "onExport"
  | "onMenuOpen"
>;

type ChatWorkspaceProps = {
  threadId: string;
  model: ChatModel;
  effort: ChatEffort;
  messagesJson: string;
  initialMessage?: string;
  onFinish?: () => void;
  header: HeaderProps;
  baselineUsage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
  costBreakdown?: CostBreakdown;
};

export function ChatWorkspace({
  threadId,
  model,
  effort,
  messagesJson,
  initialMessage,
  onFinish,
  header,
  baselineUsage,
  costBreakdown,
}: ChatWorkspaceProps) {
  const hasBootstrappedMessage = useRef(false);

  const chat = useChat<AppChatMessage>({
    id: threadId,
    messages: parseStoredMessages(messagesJson),
    transport: new DefaultChatTransport<AppChatMessage>({
      api: "/api/chat",
      prepareSendMessagesRequest: async (options) => ({
        body: {
          ...(options.body ?? {}),
          id: threadId,
          messages: options.messages,
          trigger: options.trigger,
          messageId: options.messageId,
          model: model ?? DEFAULT_CHAT_MODEL,
          effort: effort ?? DEFAULT_CHAT_EFFORT,
        },
      }),
    }),
    onFinish: () => {
      onFinish?.();
    },
  });

  useEffect(() => {
    if (hasBootstrappedMessage.current) return;
    if (!initialMessage?.trim()) return;
    if (chat.messages.length > 0) return;

    hasBootstrappedMessage.current = true;
    void chat.sendMessage({ text: initialMessage.trim() });
  }, [chat, initialMessage]);

  const runtime = useAISDKRuntime(chat);

  // Live clock so the duration updates while streaming
  const [now, setNow] = useState(() => Date.now());
  const isRunning = chat.status === "streaming" || chat.status === "submitted";
  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const status: ChatRunHeaderProps["status"] = chat.error ? "error" : isRunning ? "streaming" : "settled";

  const liveStats = useMemo(() => computeRunStats(chat.messages), [chat.messages]);

  // Pick the higher of baseline (loader) and live (streaming message metadata)
  const inputTokens = Math.max(baselineUsage.inputTokens, liveStats.inputTokens);
  const outputTokens = Math.max(baselineUsage.outputTokens, liveStats.outputTokens);

  const liveCost = estimateChatUsageCostUsd(model, { inputTokens, outputTokens });
  const costUsd = Math.max(baselineUsage.estimatedCostUsd, liveCost);

  const endedAt = isRunning ? new Date(now) : new Date(header.endedAt);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="relative flex h-full min-h-0 flex-col">
        <ChatRunHeader
          {...header}
          endedAt={endedAt}
          status={status}
          inputTokens={inputTokens}
          outputTokens={outputTokens}
          toolCalls={liveStats.toolCalls}
          writes={liveStats.writes}
          costUsd={costUsd}
          costBreakdown={costBreakdown}
          busy={isRunning}
        />
        {chat.error ? (
          <div className="mx-4 mt-4 rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive dark:text-red-200">
            {chat.error.message}
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
