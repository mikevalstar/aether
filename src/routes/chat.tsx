import { createFileRoute, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ChatMenuOverlay } from "#/components/chat/ChatMenuOverlay";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import type { ChatThreadSummary } from "#/lib/chat/chat";
import { threadIdToSlug } from "#/lib/chat/chat";
import { createChatThread, deleteChatThread, getChatPageData } from "#/lib/chat/chat.functions";
import type { ChatLayoutContext } from "#/lib/chat/chat-layout-context";
import { ChatLayoutCtx } from "#/lib/chat/chat-layout-context";

const PENDING_MESSAGE_KEY = "aether:pending-chat-message";

export const Route = createFileRoute("/chat")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => {
    return await getChatPageData({ data: {} });
  },
  component: ChatLayout,
});

function ChatLayout() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [pendingDeleteThread, setPendingDeleteThread] = useState<ChatThreadSummary | null>(null);
  const [isMutating, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const selectedThreadId = data.selectedThreadId;

  const refreshPage = useCallback(async () => {
    await router.invalidate();
  }, [router]);

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
      await navigate({ to: "/chat/$threadId", params: { threadId: threadIdToSlug(createdThread.id) } });
      await router.invalidate();
      setPendingThreadId(null);
    },
    [navigate, router],
  );

  const handleDeleteThread = useCallback(
    async (thread: ChatThreadSummary) => {
      await deleteChatThread({ data: { threadId: thread.id } });

      const isCurrentThread = selectedThreadId === thread.id;
      if (isCurrentThread) {
        await navigate({ to: "/chat" });
      }
      await router.invalidate();
      toast.success("Thread deleted");
    },
    [navigate, router, selectedThreadId],
  );

  const isBusy = isMutating || pendingThreadId !== null;

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setMenuOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const ctxValue: ChatLayoutContext = {
    threads: data.threads,
    selectedThreadId,
    defaultChatModel: data.defaultChatModel,
    isBusy,
    refreshPage,
    handleCreateThread,
    handleRequestDelete,
    openMenu,
  };

  return (
    <ChatLayoutCtx.Provider value={ctxValue}>
      <main className="relative flex h-[calc(100svh-1.75rem-env(safe-area-inset-top))] min-h-0 w-full px-0 py-0 lg:h-[calc(100dvh-4.5rem-env(safe-area-inset-top))] lg:min-h-[500px]">
        {/* Faint grid backdrop — chat showcase only */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--line-strong) 1px, transparent 1px), linear-gradient(90deg, var(--line-strong) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </section>

        <ChatMenuOverlay
          open={menuOpen}
          threads={data.threads}
          selectedThreadId={selectedThreadId}
          busy={isBusy}
          onClose={closeMenu}
          onNewChat={() => {
            void navigate({ to: "/chat" });
          }}
          onDeleteThread={handleRequestDelete}
        />

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
    </ChatLayoutCtx.Provider>
  );
}
