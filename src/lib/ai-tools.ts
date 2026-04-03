import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ToolSet } from "ai";
import { minimax as createMinimax } from "vercel-minimax-ai-provider";
import type { ChatModel } from "#/lib/chat-models";
import { getModelProvider, getProviderModelId, getWebToolVersion, supportsCodeExecution } from "#/lib/chat-models";
import type { UserPreferences } from "#/lib/preferences";
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
import { listModels } from "#/lib/tools/list-models";
import { listUsers } from "#/lib/tools/list-users";
import { obsidianAiNotesList } from "#/lib/tools/obsidian-ai-notes";
import { createObsidianToolContext } from "#/lib/tools/obsidian-context";
import { createObsidianEdit } from "#/lib/tools/obsidian-edit";
import { createObsidianRead } from "#/lib/tools/obsidian-read";
import { obsidianSearch } from "#/lib/tools/obsidian-search";
import { obsidianFolders, obsidianList } from "#/lib/tools/obsidian-tree";
import { createObsidianWrite } from "#/lib/tools/obsidian-write";
import { createSendNotification } from "#/lib/tools/send-notification";
import { getPluginTools } from "#/plugins/index.server";

const anthropic = createAnthropic();
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

export function getModel(modelId: ChatModel) {
  const provider = getModelProvider(modelId);
  if (provider === "minimax") {
    if (process.env.MINIMAX_API_KEY) {
      return createMinimax(getProviderModelId(modelId, "minimax"));
    }
    return openrouter.chat(getProviderModelId(modelId, "openrouter"));
  }
  if (provider === "openrouter") {
    return openrouter.chat(getProviderModelId(modelId, "openrouter"));
  }
  return anthropic(getProviderModelId(modelId, "anthropic"));
}

function getAnthropicWebTools(webToolVersion: "latest" | "legacy"): ToolSet {
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

export function createAiTools(
  model: ChatModel,
  userId: string,
  threadId: string,
  timezone?: string,
  prefs?: UserPreferences,
): ToolSet {
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
  const webTools: ToolSet = useExa ? exaTools : getAnthropicWebTools(webToolVersion as "latest" | "legacy");

  const boardTools: ToolSet = {
    board_list_columns: createBoardListColumns(userId),
    board_list_tasks: createBoardListTasks(userId),
    board_add_task: createBoardAddTask(userId),
    board_update_task: createBoardUpdateTask(userId),
  };

  const pluginTools = prefs ? getPluginTools(userId, threadId, timezone, prefs) : {};

  const codeExecutionTools: ToolSet = supportsCodeExecution(model)
    ? { code_execution: anthropic.tools.codeExecution_20260120() }
    : {};

  return {
    ...webTools,
    ...codeExecutionTools,
    fetch_url_markdown: fetchUrlMarkdown,
    ...obsidianTools,
    ...boardTools,
    send_notification: createSendNotification(userId),
    calendar_events: createCalendarEvents(userId, timezone),
    list_models: listModels,
    list_users: listUsers,
    ...pluginTools,
  };
}

/** Category + conditional metadata for each tool, used by the chat debug page. */
export function getToolCategories(): Record<string, { category: string; conditional?: string }> {
  return {
    // Web (Anthropic)
    web_search: { category: "Web", conditional: "Anthropic models only" },
    web_fetch: { category: "Web", conditional: "Anthropic models only" },
    // Code
    code_execution: { category: "Code", conditional: "Sonnet 4.6 and Opus 4.6 only" },
    // Utility
    fetch_url_markdown: { category: "Utility" },
    send_notification: { category: "Utility" },
    calendar_events: { category: "Utility" },
    // Obsidian
    obsidian_folders: { category: "Obsidian" },
    obsidian_list: { category: "Obsidian" },
    obsidian_search: { category: "Obsidian" },
    obsidian_read: { category: "Obsidian" },
    obsidian_write: { category: "Obsidian" },
    obsidian_edit: { category: "Obsidian" },
    obsidian_ai_notes_list: { category: "Obsidian" },
    // System
    list_models: { category: "System" },
    list_users: { category: "System" },
    // Memory
    ai_memory: { category: "Memory" },
    // Board
    board_list_columns: { category: "Board" },
    board_list_tasks: { category: "Board" },
    board_add_task: { category: "Board" },
    board_update_task: { category: "Board" },
    // Skills
    load_skill: { category: "Skills", conditional: "Only when skills are configured" },
  };
}

export { anthropic, openrouter };
