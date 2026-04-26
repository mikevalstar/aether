import { createContext, useContext } from "react";
import type { ChatThreadSummary } from "#/lib/chat/chat";

export type ChatLayoutContext = {
  threads: ChatThreadSummary[];
  selectedThreadId: string | null;
  defaultChatModel: string;
  isBusy: boolean;
  refreshPage: () => Promise<void>;
  handleCreateThread: (model: string, firstMessage?: string, effort?: string) => Promise<void>;
  handleRequestDelete: (thread: ChatThreadSummary) => void;
  openMenu: () => void;
};

export const ChatLayoutCtx = createContext<ChatLayoutContext | null>(null);

export function useChatLayout(): ChatLayoutContext {
  const ctx = useContext(ChatLayoutCtx);
  if (!ctx) throw new Error("useChatLayout must be used inside /chat layout");
  return ctx;
}
