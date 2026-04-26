import { createFileRoute, redirect } from "@tanstack/react-router";
import { MenuIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { z } from "zod";
import { ChatEmptyState } from "#/components/chat/ChatEmptyState";
import { Button } from "#/components/ui/button";
import type { ChatEffort, ChatModel } from "#/lib/chat/chat";
import { CHAT_MODELS, DEFAULT_CHAT_EFFORT, threadIdToSlug } from "#/lib/chat/chat";
import { useChatLayout } from "#/lib/chat/chat-layout-context";

const searchSchema = z.object({
  threadId: z.string().optional(),
});

export const Route = createFileRoute("/chat/")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
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
  const { defaultChatModel, isBusy, handleCreateThread, openMenu } = useChatLayout();
  const [draftModel, setDraftModel] = useState<ChatModel>(defaultChatModel as ChatModel);
  const [draftEffort, setDraftEffort] = useState<ChatEffort>(DEFAULT_CHAT_EFFORT);
  const [, startTransition] = useTransition();

  const currentModelDef = CHAT_MODELS.find((m) => m.id === draftModel);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-end px-4 py-3 lg:px-6 lg:py-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 inline-flex items-center gap-2 border-[var(--line-strong)] bg-[var(--bg)] px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]"
          onClick={openMenu}
          title="Open chat menu"
          aria-label="Open chat menu"
        >
          <MenuIcon className="size-3.5" />
          <span>Threads</span>
          <span className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-px text-[9px] tracking-[0.1em] text-[var(--ink-faint)]">
            ⌘J
          </span>
        </Button>
      </div>
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
    </div>
  );
}
