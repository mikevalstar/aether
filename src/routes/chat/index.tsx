import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { z } from "zod";
import { ChatEmptyState } from "#/components/chat/ChatEmptyState";
import { ChatHeader } from "#/components/chat/ChatHeader";
import type { ChatEffort, ChatModel } from "#/lib/chat/chat";
import { CHAT_MODELS, DEFAULT_CHAT_EFFORT, threadIdToSlug } from "#/lib/chat/chat";
import { useChatLayout } from "#/lib/chat/chat-layout-context";

const searchSchema = z.object({
  threadId: z.string().optional(),
});

export const Route = createFileRoute("/chat/")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    // Backward compat: redirect ?threadId=thread_xxx → /chat/xxx
    if (search.threadId) {
      throw redirect({
        to: "/chat/$threadId",
        params: { threadId: threadIdToSlug(search.threadId) },
      });
    }
  },
  component: ChatIndex,
});

function ChatIndex() {
  const { defaultChatModel, isBusy, handleCreateThread, openMobileDrawer } = useChatLayout();
  const [draftModel, setDraftModel] = useState<ChatModel>(defaultChatModel as ChatModel);
  const [draftEffort, setDraftEffort] = useState<ChatEffort>(DEFAULT_CHAT_EFFORT);
  const [, startTransition] = useTransition();

  const currentModelDef = CHAT_MODELS.find((m) => m.id === draftModel);

  return (
    <>
      <ChatHeader
        title="New chat"
        model={draftModel}
        effort={draftEffort}
        inputTokens={0}
        outputTokens={0}
        costUsd={0}
        showStats={false}
        disabled={isBusy}
        editable={false}
        showMobileMenu
        onMobileMenuClick={openMobileDrawer}
        onEffortChange={(value) => setDraftEffort(value as ChatEffort)}
        onModelChange={(value) => setDraftModel(value as (typeof CHAT_MODELS)[number]["id"])}
      />
      <div className="min-h-0 flex-1">
        <ChatEmptyState
          model={draftModel}
          effort={draftEffort}
          modelLabel={currentModelDef?.label ?? "Claude"}
          disabled={isBusy}
          onModelChange={(value) => setDraftModel(value as (typeof CHAT_MODELS)[number]["id"])}
          onEffortChange={(value) => setDraftEffort(value as ChatEffort)}
          onSend={(message) => {
            startTransition(() => {
              void handleCreateThread(draftModel, message, draftEffort);
            });
          }}
        />
      </div>
    </>
  );
}
