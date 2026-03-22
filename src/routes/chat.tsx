import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { GripVerticalIcon, MessageSquarePlusIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { z } from "zod";
import { ChatEmptyState } from "#/components/chat/ChatEmptyState";
import { ChatHeader } from "#/components/chat/ChatHeader";
import { ChatThreadItem } from "#/components/chat/ChatThreadItem";
import { ChatThreadSearchInput, useChatThreadSearch } from "#/components/chat/ChatThreadSearch";
import { ChatWorkspace } from "#/components/chat/ChatWorkspace";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "#/components/ui/drawer";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import { CHAT_MODELS, type ChatEffort, type ChatThreadSummary, DEFAULT_CHAT_EFFORT, DEFAULT_CHAT_MODEL } from "#/lib/chat";
import {
  createChatThread,
  deleteChatThread,
  exportChatThreadToObsidian,
  getChatPageData,
  updateChatThreadEffort,
  updateChatThreadModel,
  updateChatThreadTitle,
} from "#/lib/chat.functions";

const chatSearchSchema = z.object({
  threadId: z.string().optional(),
});

const PENDING_MESSAGE_KEY = "aether:pending-chat-message";
const SIDEBAR_WIDTH_KEY = "aether:chat-sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 460;

export const Route = createFileRoute("/chat")({
  validateSearch: chatSearchSchema,
  beforeLoad: async () => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loaderDeps: ({ search }) => ({ threadId: search.threadId }),
  loader: async ({ deps }) => {
    return await getChatPageData({ data: { threadId: deps.threadId } });
  },
  component: ChatPage,
});

function ChatPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [pendingDeleteThread, setPendingDeleteThread] = useState<ChatThreadSummary | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isMutating, startTransition] = useTransition();
  const [draftModel, setDraftModel] = useState(data.defaultChatModel);
  const [draftEffort, setDraftEffort] = useState<ChatEffort>(DEFAULT_CHAT_EFFORT);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const {
    query: threadSearchQuery,
    setQuery: setThreadSearchQuery,
    filtered: filteredThreads,
  } = useChatThreadSearch(data.threads);

  const refreshPage = useCallback(async () => {
    await router.invalidate();
  }, [router]);
  const selectedThread = data.selectedThread;

  const handleCreateThread = useCallback(
    async (model: string, firstMessage?: string, effort?: string) => {
      const createdThread = await createChatThread({ data: { model, effort } });

      if (typeof window !== "undefined") {
        const key = `${PENDING_MESSAGE_KEY}:${createdThread.id}`;
        if (firstMessage?.trim()) {
          window.sessionStorage.setItem(key, firstMessage.trim());
        } else {
          window.sessionStorage.removeItem(key);
        }
      }

      setPendingThreadId(createdThread.id);
      await navigate({ search: { threadId: createdThread.id } });
      await router.invalidate();
      setPendingThreadId(null);
    },
    [navigate, router],
  );

  const handleDeleteThread = useCallback(
    async (thread: ChatThreadSummary) => {
      await deleteChatThread({ data: { threadId: thread.id } });

      const isCurrentThread = selectedThread?.id === thread.id;
      await navigate({
        search: isCurrentThread ? {} : { threadId: selectedThread?.id },
      });
      await router.invalidate();
      toast.success("Thread deleted");
    },
    [navigate, router, selectedThread],
  );

  const selectedModel = selectedThread?.model ?? DEFAULT_CHAT_MODEL;
  const selectedEffort = selectedThread?.effort ?? DEFAULT_CHAT_EFFORT;
  const isBusy = isMutating || pendingThreadId !== null;
  const emptyStateModel = selectedThread?.model ?? draftModel;
  const emptyStateEffort = selectedThread?.effort ?? draftEffort;
  const selectedUsageTotals = {
    inputTokens: selectedThread?.totalInputTokens ?? 0,
    outputTokens: selectedThread?.totalOutputTokens ?? 0,
    estimatedCostUsd: selectedThread?.totalEstimatedCostUsd ?? 0,
  };
  const selectedCostLabel =
    selectedUsageTotals.estimatedCostUsd > 0 && selectedUsageTotals.estimatedCostUsd < 0.0001
      ? "<$0.0001"
      : `$${selectedUsageTotals.estimatedCostUsd.toFixed(4)}`;

  const currentModelDef = CHAT_MODELS.find((m) => m.id === (selectedThread ? selectedModel : emptyStateModel));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedWidth = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!storedWidth) return;

    const parsedWidth = Number.parseInt(storedWidth, 10);
    if (Number.isNaN(parsedWidth)) return;

    setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsedWidth)));
  }, []);

  // Consume pending message from sessionStorage.
  // Uses a ref to track which thread ID we already consumed for,
  // so the message survives re-renders but is only read once per thread.
  const consumedThreadRef = useRef<string | null>(null);
  const initialMessageRef = useRef<string | undefined>(undefined);
  if (typeof window !== "undefined" && selectedThread?.id && consumedThreadRef.current !== selectedThread.id) {
    const key = `${PENDING_MESSAGE_KEY}:${selectedThread.id}`;
    const pendingMessage = window.sessionStorage.getItem(key) ?? undefined;
    if (pendingMessage) {
      window.sessionStorage.removeItem(key);
    }
    consumedThreadRef.current = selectedThread.id;
    initialMessageRef.current = pendingMessage;
  } else if (!selectedThread?.id) {
    consumedThreadRef.current = null;
    initialMessageRef.current = undefined;
  }
  const initialMessage = initialMessageRef.current;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const handleResizeStart = useCallback(() => {
    if (typeof window === "undefined") return;

    const handlePointerMove = (event: PointerEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const nextWidth = Math.round(containerRect.right - event.clientX);
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, nextWidth)));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, []);

  function handleRequestDelete(thread: ChatThreadSummary) {
    setPendingDeleteThread(thread);
  }

  function handleConfirmDelete() {
    if (!pendingDeleteThread) return;

    startTransition(() => {
      void handleDeleteThread(pendingDeleteThread).then(() => {
        setPendingDeleteThread(null);
      });
    });
  }

  function handleMobileThreadSelect(threadId: string) {
    setMobileDrawerOpen(false);
    void navigate({ search: { threadId } });
  }

  const threadListContent = (
    <>
      <div className="px-2 pb-2">
        <ChatThreadSearchInput value={threadSearchQuery} onChange={setThreadSearchQuery} />
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {filteredThreads.map((thread: ChatThreadSummary) => (
          <ChatThreadItem
            key={thread.id}
            title={thread.title}
            preview={thread.preview}
            updatedAt={thread.updatedAt}
            isActive={thread.id === selectedThread?.id}
            disabled={isBusy}
            onClick={() => handleMobileThreadSelect(thread.id)}
            onDelete={() => handleRequestDelete(thread)}
          />
        ))}

        {data.threads.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-[var(--ink-soft)]">No threads yet</p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">Start a conversation to begin</p>
          </div>
        )}

        {data.threads.length > 0 && filteredThreads.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-[var(--ink-soft)]">No matching threads</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <main className="page-wrap flex h-[calc(100dvh-4.5rem)] min-h-0 px-0 py-0 lg:min-h-[500px] lg:px-4 lg:py-2">
      <div ref={containerRef} className="flex min-h-0 w-full flex-col gap-0 lg:flex-row lg:gap-0">
        {/* Main chat area */}
        <section className="order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-[var(--surface)] lg:rounded-xl lg:border lg:border-[var(--line)] lg:rounded-r-none lg:border-r-0">
          <ChatHeader
            title={selectedThread?.title ?? "New chat"}
            model={selectedThread ? selectedModel : emptyStateModel}
            effort={selectedThread ? selectedEffort : emptyStateEffort}
            inputTokens={selectedUsageTotals.inputTokens}
            outputTokens={selectedUsageTotals.outputTokens}
            costLabel={selectedCostLabel}
            showStats={!!selectedThread}
            disabled={isBusy}
            editable={!!selectedThread}
            showMobileMenu
            onMobileMenuClick={() => setMobileDrawerOpen(true)}
            onEffortChange={(value) => {
              if (!selectedThread) {
                setDraftEffort(value as ChatEffort);
                return;
              }

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
            onTitleChange={
              selectedThread
                ? (newTitle) => {
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
                  }
                : undefined
            }
            onModelChange={(value) => {
              if (!selectedThread) {
                setDraftModel(value as (typeof CHAT_MODELS)[number]["id"]);
                return;
              }

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
            onExport={
              selectedThread
                ? () => {
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
                  }
                : undefined
            }
            onDelete={selectedThread ? () => handleRequestDelete(selectedThread) : undefined}
          />

          <div className="min-h-0 flex-1">
            {selectedThread ? (
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
            ) : (
              <ChatEmptyState
                model={emptyStateModel}
                effort={emptyStateEffort}
                modelLabel={currentModelDef?.label ?? "Claude"}
                disabled={isBusy}
                onModelChange={(value) => {
                  setDraftModel(value as (typeof CHAT_MODELS)[number]["id"]);
                }}
                onEffortChange={(value) => {
                  setDraftEffort(value as ChatEffort);
                }}
                onSend={(message) => {
                  startTransition(() => {
                    void handleCreateThread(emptyStateModel, message, emptyStateEffort);
                  });
                }}
              />
            )}
          </div>
        </section>

        {/* Desktop resize handle */}
        <div className="order-2 hidden w-3 items-stretch justify-center lg:flex">
          <button
            type="button"
            className="group flex w-full cursor-col-resize items-center justify-center rounded-none text-[var(--ink-soft)] transition hover:bg-[var(--teal-subtle)] hover:text-[var(--teal)] focus-visible:bg-[var(--teal-subtle)] focus-visible:outline-none"
            onPointerDown={(event) => {
              event.preventDefault();
              handleResizeStart();
            }}
            onDoubleClick={() => {
              setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
            }}
            aria-label="Resize thread sidebar"
          >
            <GripVerticalIcon className="size-4 transition group-hover:scale-110" />
          </button>
        </div>

        {/* Desktop sidebar */}
        <aside
          className="order-3 hidden min-h-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] lg:flex lg:rounded-l-none"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Threads</h2>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void navigate({ search: {} });
              }}
              disabled={isBusy || !selectedThread}
              className="bg-[var(--teal)] text-white hover:bg-[var(--teal-hover)]"
            >
              <MessageSquarePlusIcon className="size-4" />
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">{threadListContent}</div>
        </aside>

        {/* Mobile drawer */}
        <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen} direction="right">
          <DrawerContent className="h-full">
            <DrawerHeader className="flex flex-row items-center justify-between border-b border-[var(--line)]">
              <DrawerTitle className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                Threads
              </DrawerTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    void navigate({ search: {} });
                  }}
                  disabled={isBusy || !selectedThread}
                  className="bg-[var(--teal)] text-white hover:bg-[var(--teal-hover)]"
                >
                  <MessageSquarePlusIcon className="size-4" />
                  New
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon-sm">
                    <XIcon className="size-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-2">{threadListContent}</div>
          </DrawerContent>
        </Drawer>
      </div>

      <Dialog
        open={pendingDeleteThread !== null}
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setPendingDeleteThread(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete thread?</DialogTitle>
            <DialogDescription>
              {pendingDeleteThread
                ? `This will permanently remove "${pendingDeleteThread.title}" and its messages.`
                : "This will permanently remove the selected thread and its messages."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDeleteThread(null)} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isBusy || !pendingDeleteThread}
            >
              Delete thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
