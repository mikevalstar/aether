import { createAnthropic } from "@ai-sdk/anthropic";
import type { ToolSet } from "ai";
import type { ChatModel } from "#/lib/chat-models";
import { getWebToolVersion } from "#/lib/chat-models";
import { createBoardAddTask, createBoardListTasks, createBoardUpdateTask } from "#/lib/tools/board-tools";
import { calendarEvents } from "#/lib/tools/calendar-events";
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

/**
 * Create the full set of AI tools for a given model/user/thread context.
 * Shared between the chat API endpoint and the task executor.
 */
export function createAiTools(model: ChatModel, userId: string, threadId: string): ToolSet {
	const obsidianCtx = createObsidianToolContext(userId, threadId);
	const obsidianTools: ToolSet = {
		obsidian_folders: obsidianFolders,
		obsidian_list: obsidianList,
		obsidian_search: obsidianSearch,
		obsidian_read: createObsidianRead(obsidianCtx),
		obsidian_write: createObsidianWrite(obsidianCtx),
		obsidian_edit: createObsidianEdit(obsidianCtx),
		obsidian_ai_notes_list: obsidianAiNotesList,
	};

	const webToolVersion = getWebToolVersion(model);
	const webTools: ToolSet =
		webToolVersion === "latest"
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

	const boardTools: ToolSet = {
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
		calendar_events: calendarEvents,
	};
}

export { anthropic };
