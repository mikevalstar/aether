import { createFileRoute } from "@tanstack/react-router";
import { useRef, useTransition } from "react";
import { ChatHeader } from "#/components/chat/ChatHeader";
import { ChatWorkspace } from "#/components/chat/ChatWorkspace";
import { toast } from "#/components/ui/sonner";
import { DEFAULT_CHAT_EFFORT, DEFAULT_CHAT_MODEL, slugToThreadId } from "#/lib/chat/chat";
import {
  exportChatThreadToObsidian,
  getChatPageData,
  updateChatThreadEffort,
  updateChatThreadModel,
  updateChatThreadTitle,
} from "#/lib/chat/chat.functions";
import { useChatLayout } from "#/lib/chat/chat-layout-context";

const PENDING_MESSAGE_KEY = "aether:pending-chat-message";

export const Route = createFileRoute("/chat/$threadId")({
  loader: async ({ params }) => {
    const threadId = slugToThreadId(params.threadId);
    return await getChatPageData({ data: { threadId } });
  },
  component: ChatThreadPage,
});

function ChatThreadPage() {
  const data = Route.useLoaderData();
  const { threadId: slug } = Route.useParams();
  const { isBusy, refreshPage, handleRequestDelete, openMobileDrawer, threads } = useChatLayout();
  const [, startTransition] = useTransition();

  const fullThreadId = slugToThreadId(slug);
  const selectedThread = threads.find((t) => t.id === fullThreadId) ?? data.selectedThread;

  // Hooks must be called before any early return
  const consumedThreadRef = useRef<string | null>(null);
  const initialMessageRef = useRef<string | undefined>(undefined);
  if (typeof window !== "undefined" && selectedThread && consumedThreadRef.current !== selectedThread.id) {
    const key = `${PENDING_MESSAGE_KEY}:${selectedThread.id}`;
    const pendingMessage = window.sessionStorage.getItem(key) ?? undefined;
    if (pendingMessage) {
      window.sessionStorage.removeItem(key);
    }
    consumedThreadRef.current = selectedThread.id;
    initialMessageRef.current = pendingMessage;
  }
  const initialMessage = initialMessageRef.current;

  if (!selectedThread) {
    return (
      <>
        <ChatHeader
          title="Thread not found"
          model={DEFAULT_CHAT_MODEL}
          effort={DEFAULT_CHAT_EFFORT}
          showStats={false}
          disabled
          editable={false}
        />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-[var(--ink-soft)]">This thread could not be found.</p>
        </div>
      </>
    );
  }

  const selectedModel = selectedThread.model ?? DEFAULT_CHAT_MODEL;
  const selectedEffort = selectedThread.effort ?? DEFAULT_CHAT_EFFORT;
  const selectedUsageTotals = {
    inputTokens: selectedThread.totalInputTokens ?? 0,
    outputTokens: selectedThread.totalOutputTokens ?? 0,
    estimatedCostUsd: selectedThread.totalEstimatedCostUsd ?? 0,
  };
  const selectedCostLabel =
    selectedUsageTotals.estimatedCostUsd > 0 && selectedUsageTotals.estimatedCostUsd < 0.0001
      ? "<$0.0001"
      : `$${selectedUsageTotals.estimatedCostUsd.toFixed(4)}`;

  return (
    <>
      <ChatHeader
        title={selectedThread.title}
        model={selectedModel}
        effort={selectedEffort}
        inputTokens={selectedUsageTotals.inputTokens}
        outputTokens={selectedUsageTotals.outputTokens}
        costLabel={selectedCostLabel}
        showStats
        disabled={isBusy}
        editable
        showMobileMenu
        onMobileMenuClick={openMobileDrawer}
        onEffortChange={(value) => {
          startTransition(() => {
            void updateChatThreadEffort({
              data: {
                threadId: selectedThread.id,
                effort: value,
              },
            }).then(() => {
              toast.success("Effort updated");
              return refreshPage();
            });
          });
        }}
        onTitleChange={(newTitle) => {
          startTransition(() => {
            void updateChatThreadTitle({
              data: {
                threadId: selectedThread.id,
                title: newTitle,
              },
            }).then(() => {
              toast.success("Title updated");
              return refreshPage();
            });
          });
        }}
        onModelChange={(value) => {
          startTransition(() => {
            void updateChatThreadModel({
              data: {
                threadId: selectedThread.id,
                model: value,
              },
            }).then(() => {
              toast.success("Model updated");
              return refreshPage();
            });
          });
        }}
        onExport={() => {
          startTransition(() => {
            void exportChatThreadToObsidian({
              data: { threadId: selectedThread.id },
            })
              .then((result) => {
                toast.success(`Exported to ${result.relativePath}`);
              })
              .catch((err) => {
                toast.error(err instanceof Error ? err.message : "Export failed");
              });
          });
        }}
        onDelete={() => handleRequestDelete(selectedThread)}
      />
      <div className="min-h-0 flex-1">
        <ChatWorkspace
          key={`${selectedThread.id}:${selectedModel}:${selectedEffort}`}
          threadId={selectedThread.id}
          model={selectedModel}
          effort={selectedEffort}
          messagesJson={data.messagesJson}
          initialMessage={initialMessage}
          onFinish={() => {
            void refreshPage();
          }}
        />
      </div>
    </>
  );
}
