import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ToolSet } from "ai";
import type { ChatModel } from "#/lib/chat-models";
import { getModelProvider, getWebToolVersion } from "#/lib/chat-models";
import { aiMemory } from "#/lib/tools/ai-memory";
import {
  createBoardAddTask,
  createBoardListColumns,
  createBoardListTasks,
  createBoardUpdateTask,
} from "#/lib/tools/board-tools";
import { createCalendarEvents } from "#/lib/tools/calendar-events";
import { exaTools } from "#/lib/tools/exa-tools";
import { fetchUrlMarkdown } from "#/lib/tools/fetch-url-markdown";
import { obsidianAiNotesList } from "#/lib/tools/obsidian-ai-notes";
import { createObsidianToolContext } from "#/lib/tools/obsidian-context";
import { createObsidianEdit } from "#/lib/tools/obsidian-edit";
import { createObsidianRead } from "#/lib/tools/obsidian-read";
import { obsidianSearch } from "#/lib/tools/obsidian-search";
import { obsidianFolders, obsidianList } from "#/lib/tools/obsidian-tree";
import { createObsidianWrite } from "#/lib/tools/obsidian-write";
import { createSendNotification } from "#/lib/tools/send-notification";

const anthropic = createAnthropic();
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export function getModel(modelId: ChatModel) {
  const provider = getModelProvider(modelId);
  if (provider === "openrouter") {
    return openrouter.chat(modelId);
  }
  return anthropic(modelId);
}

function getAnthropicWebTools(): ToolSet {
  const webToolVersion = "latest";
  return webToolVersion === "latest"
    ? {
        web_fetch: anthropic.tools.webFetch_20260209({
          citations: { enabled: true },
          maxUses: 5,
        }),
        web_search: anthropic.tools.webSearch_20260209({
          maxUses: 5,
        }),
      }
    : {
        web_fetch: anthropic.tools.webFetch_20250910({
          citations: { enabled: true },
          maxUses: 5,
        }),
        web_search: anthropic.tools.webSearch_20250305({
          maxUses: 5,
        }),
      };
}

export function createAiTools(model: ChatModel, userId: string, threadId: string, timezone?: string): ToolSet {
  const obsidianCtx = createObsidianToolContext(userId, threadId);
  const obsidianTools: ToolSet = {
    obsidian_folders: obsidianFolders,
    obsidian_list: obsidianList,
    obsidian_search: obsidianSearch,
    obsidian_read: createObsidianRead(obsidianCtx),
    obsidian_write: createObsidianWrite(obsidianCtx),
    obsidian_edit: createObsidianEdit(obsidianCtx),
    obsidian_ai_notes_list: obsidianAiNotesList,
    ai_memory: aiMemory,
  };

  const webToolVersion = getWebToolVersion(model);
  const useExa = webToolVersion === "none";
  const webTools: ToolSet = useExa ? exaTools : getAnthropicWebTools();

  const boardTools: ToolSet = {
    board_list_columns: createBoardListColumns(userId),
    board_list_tasks: createBoardListTasks(userId),
    board_add_task: createBoardAddTask(userId),
    board_update_task: createBoardUpdateTask(userId),
  };

  return {
    ...webTools,
    fetch_url_markdown: fetchUrlMarkdown,
    ...obsidianTools,
    ...boardTools,
    send_notification: createSendNotification(userId),
    calendar_events: createCalendarEvents(timezone),
  };
}

export { anthropic, openrouter };
