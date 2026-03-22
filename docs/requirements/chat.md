---
title: Chat
status: in-progress
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/chat.md
---

# Chat

## Purpose

- Problem: Give authenticated users a persistent AI chat workspace inside Aether for day-to-day questions, drafting, and web-assisted research.
- Outcome: Users can create and manage chat threads, talk to multiple AI models in multiple turns, inspect tool use, and see token and cost totals per thread.
- Notes: This document reflects the current implementation in `/chat` and `/api/chat`, including UI behavior already wired through Assistant UI and Vercel AI SDK.

## Current Reality

- Current behavior: Chat is an authenticated thread-based interface with persistent history, model selection, effort level control, streaming responses, message editing, regeneration, branch navigation, tool inspection, markdown rendering, @-mention autocomplete, thread search, AI-generated titles, editable titles, export to Obsidian, and per-thread usage tracking.
- Constraints: Threads are scoped to the signed-in user in Prisma; messages and usage history are stored as JSON on `ChatThread`; model support includes Anthropic Claude models and OpenRouter-hosted models; tool access varies by model provider.
- Non-goals: Shared threads, multi-user collaboration, thread archive/restore, message search, and guaranteed attachment processing rules are not implemented.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Access control | done | Only authenticated users can load the chat page, fetch thread data, or send chat requests. |
| Thread management | done | Users can create, select, search, and permanently delete their own chat threads. |
| Conversation experience | done | Users can hold multi-turn conversations with streaming responses, editing, reload, and branch navigation. |
| Model and tool support | done | Each thread uses a selected AI model with configurable effort level; tool availability and web tool version depend on the model and provider. |
| Usage tracking | done | The system records per-response token and cost data and shows cumulative totals for the selected thread. |
| AI-generated titles | done | On first message, the system calls Haiku to generate a short descriptive title for the thread. |
| Editable titles | done | Users can click the thread title in the header to edit it inline. |
| Export to Obsidian | done | Users can export any chat thread as a Markdown file to a configurable Obsidian vault folder with YAML frontmatter metadata. |
| Tool ecosystem | done | The AI has access to web search, Obsidian vault tools, kanban board tools, calendar, notifications, AI memory, skills, and plugin-provided tools. |
| @-mention autocomplete | done | Users can type `@` in the composer to search and insert Obsidian file references. |
| Context compaction | planned | Long conversations should be compacted to reduce token usage and stay within context limits. |
| Attachments | in-progress | The composer and transcript support attachments in the UI, but product rules for storage and model handling are not yet explicitly defined. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Chat route gating | done | `/chat` redirects anonymous users to `/login` before loading thread data. | Inline |
| Thread sidebar | done | Users can switch threads, create a new one, resize the sidebar, search threads, and delete with confirmation. | Inline |
| Thread search | done | Users can fuzzy-search threads by title and preview text in the sidebar. | Inline |
| Mobile thread drawer | done | On smaller screens, threads are accessed via a right-side drawer instead of the sidebar. | Inline |
| Empty-state start | done | Users can begin a new thread from the empty state with a drafted first message, chosen model, and effort level. | Inline |
| Streaming workspace | done | Existing threads load into Assistant UI with streaming responses from `/api/chat`. | Inline |
| Message controls | done | Assistant messages support copy, export, reload, and edited-branch navigation; user messages support editing. | Inline |
| Tool inspection | done | Tool calls are grouped in the transcript and can be inspected in a detail drawer. | Inline |
| Usage accounting | done | Thread totals and usage events are updated after each completed assistant response, including title generation usage. | Inline |
| AI-generated titles | done | On first message, the system calls Haiku to generate a short title (max 10 words) with configurable prompt. | Inline |
| Editable titles | done | Users can click the thread title in the header to edit it inline; saves on blur or Enter, cancels on Escape. | Inline |
| Effort level | done | Users can set an effort level (low, medium, high) per thread for models that support it (Sonnet, Opus). | Inline |
| @-mention autocomplete | done | Typing `@` in the composer triggers a popover to search and insert Obsidian file references. | Inline |
| Skills system | done | Skills are loaded from Obsidian config and injected into the system prompt; the AI can load full skill instructions via the `load_skill` tool. | Inline |
| Plugin tools | done | Enabled plugins can contribute additional tools and system prompt sections to the chat. | Inline |
| Export to Obsidian | done | Users can export any chat thread as a Markdown file into their Obsidian vault with frontmatter metadata. | Inline |
| Context compaction | planned | Automatically compact long conversations at 50k input tokens using Anthropic's server-side compaction. | Inline |
| Attachment UI | in-progress | Users can add, preview, and remove attachments in the composer and view them on sent user messages. | Inline |

## Detail

### Access control and thread scoping

- Requirement: The system must gate chat UI and API access to authenticated users and must only expose threads owned by the active user.
- Notes: `/chat` uses `getSession()` in `beforeLoad` to redirect to `/login`; server functions use `ensureSession()`; `/api/chat` returns `401` without a session and looks up the thread by both `id` and `session.user.id`.
- Dependencies: `src/routes/chat.tsx`, `src/lib/chat.functions.ts`, `src/routes/api/chat.ts`, `src/lib/auth.functions.ts`.
- Follow-up: Align error UX for server-function failures so thread authorization errors are surfaced more deliberately in the UI.

### Thread lifecycle and persistence

- Requirement: Users must be able to create, select, search, persist, and delete chat threads, with each thread restoring its saved messages, model, and effort level.
- Notes: `getChatPageData()` loads up to 500 user threads (type `"chat"`) ordered by `updatedAt desc`; `createChatThread()` creates a new `ChatThread` with a generated ID, default or selected model, and effort level; deleting a thread permanently removes it; titles are AI-generated on first message and previews are derived from the last message. Thread search uses Fuse.js fuzzy matching on title and preview fields.
- Dependencies: `src/routes/chat.tsx`, `src/lib/chat.functions.ts`, `src/lib/chat.ts`, `src/components/chat/ChatThreadSearch.tsx`.
- Follow-up: Decide whether to add soft delete or archive behavior before thread volume grows.

### Starting and continuing conversations

- Requirement: Users must be able to start a conversation from an empty state or continue an existing thread with streamed assistant responses.
- Notes: The empty state accepts a draft message with model and effort selection, sends on `Enter`, and stores the first message in `sessionStorage` until the new thread loads; `ChatWorkspace` bootstraps that first message only when the thread is still empty. Both the empty-state composer and the active-thread composer support @-mention autocomplete for Obsidian files.
- Dependencies: `src/routes/chat.tsx`, `src/components/chat/ChatWorkspace.tsx`, `src/components/chat/ChatEmptyState.tsx`.
- Follow-up: Decide whether the empty-state composer should match the richer attachment-enabled composer used inside an active thread.

### Conversation controls and branching

- Requirement: The transcript must support editing prior user messages, reloading assistant turns, and navigating between resulting branches.
- Notes: Assistant UI primitives provide edit composers, reload actions, and branch pickers for both assistant and user messages; the current UI exposes these controls directly in the message chrome.
- Dependencies: `src/components/assistant-ui/thread.tsx`.
- Follow-up: Confirm whether branch terminology needs explicit product copy so users understand edited/regenerated paths.

### Model selection and tool access

- Requirement: Each thread must use one supported AI model with an optional effort level, and tool availability must depend on that model's provider and capabilities.
- Notes: Supported models are Claude Haiku 4.5, Claude Sonnet 4.6, Claude Opus 4.6 (Anthropic), MiniMax M2.7, and GLM-5 (OpenRouter). Anthropic models use native web tools (`web_search`, `web_fetch`) with version-specific APIs: Haiku uses legacy versions, Sonnet and Opus use latest versions. OpenRouter models use Exa-based web search and fetch tools instead. All models also get `fetch_url_markdown`. Sonnet and Opus support effort levels (low, medium, high) via Anthropic's provider options. Anthropic models use ephemeral cache control. The selected model and effort are persisted to the thread and sent with each request. Tool-use steps are capped at 10 per response (`stepCountIs(10)`).
- Dependencies: `src/lib/chat-models.ts`, `src/lib/ai-tools.ts`, `src/routes/chat.tsx`, `src/routes/api/chat.ts`, `src/lib/tools/fetch-url-markdown.ts`, `src/lib/tools/exa-tools.ts`.
- Follow-up: Decide whether model changes should affect only future turns, or whether the UI should show mixed-model history more explicitly.

### Tool ecosystem

- Requirement: The AI must have access to a comprehensive set of tools for web search, Obsidian vault operations, task management, calendar access, notifications, persistent memory, and extensible plugin-provided tools.
- Notes: The full tool set is assembled in `createAiTools()` and includes:
  - **Web tools**: `web_search`, `web_fetch` (Anthropic native or Exa depending on provider), `fetch_url_markdown`
  - **Obsidian tools**: `obsidian_folders`, `obsidian_list`, `obsidian_search`, `obsidian_read`, `obsidian_write`, `obsidian_edit`, `obsidian_ai_notes_list`
  - **Memory**: `ai_memory` (persistent recall from AI memory notes; instructed to run at conversation start)
  - **Board tools**: `board_list_columns`, `board_list_tasks`, `board_add_task`, `board_update_task` (kanban board in Obsidian)
  - **Notifications**: `send_notification` (with optional push to phone)
  - **Calendar**: `calendar_events` (query events by date range, timezone-aware)
  - **Skills**: `load_skill` (dynamically load specialized instructions from Obsidian config; only available when skills exist)
  - **Plugin tools**: Additional tools contributed by enabled plugins (e.g. email, API balances)
- Dependencies: `src/lib/ai-tools.ts`, `src/lib/tools/`, `src/lib/skills.ts`, `src/plugins/index.server.ts`.
- Follow-up: Consider documenting individual tool capabilities in detail and adding usage guidelines for each tool category.

### System prompt and skills

- Requirement: The system prompt must be loaded from the Obsidian AI config directory and augmented with available skills and plugin-provided prompt sections.
- Notes: The system prompt is read from `system-prompt.md` in the AI config directory and interpolated with the user's name, current date, and AI memory path. When skills are available (markdown files in the `skills/` subdirectory), a skills section is appended listing each skill's filename and description. Plugin system prompt sections are also appended. The title generation prompt is separately configurable via `readTitlePromptConfig()`.
- Dependencies: `src/lib/ai-config.ts`, `src/lib/skills.ts`, `src/routes/api/chat.ts`, `src/plugins/index.server.ts`.
- Follow-up: None identified.

### Tool-call visibility and inspection

- Requirement: When the assistant uses tools, the transcript must summarize tool activity inline and allow inspection of individual tool payloads and outputs.
- Notes: Consecutive tool calls are grouped into a collapsible activity block with animated running indicators and whimsical status messages; each tool row shows status and summary text; selecting a tool opens a right-side drawer with raw input, output or error text, and metadata such as call ID and payload size.
- Dependencies: `src/components/assistant-ui/thread.tsx`, `src/components/assistant-ui/tool-activity-summary.tsx`, `src/components/assistant-ui/tool-inspector.tsx`.
- Follow-up: Decide whether users also need a simpler non-technical tool summary separate from raw payload inspection.

### Rendering and message actions

- Requirement: Assistant responses must render rich markdown and expose common transcript actions.
- Notes: Markdown rendering supports GFM features such as tables and fenced code blocks; code blocks have copy buttons; assistant messages expose copy, refresh, and export-as-Markdown actions via an action bar with a "More" menu; API and generation errors render inline above or within the thread.
- Dependencies: `src/components/assistant-ui/thread.tsx`, `src/components/assistant-ui/markdown-text.tsx`, `src/components/chat/ChatWorkspace.tsx`.
- Follow-up: Decide whether exported Markdown should include tool-call details or remain assistant-text only.

### Usage and cost accounting

- Requirement: The system must track usage per assistant response and maintain cumulative thread totals for input tokens, output tokens, and estimated cost.
- Notes: `/api/chat` computes exchange usage from model usage metadata, estimates USD cost from configured per-model pricing, appends usage history to the thread, updates cumulative thread totals, and inserts a `chatUsageEvent`. Title generation usage is tracked separately with task type `"title"` and included in thread totals. The chat header shows the selected thread's total input tokens, output tokens, and cost.
- Dependencies: `src/routes/api/chat.ts`, `src/lib/chat.ts`, `src/lib/chat-usage.ts`, `src/routes/chat.tsx`.
- Follow-up: Decide whether users should be able to inspect per-message usage directly from the transcript instead of only seeing thread totals and external usage views.

### AI-generated titles

- Requirement: When the first user message is sent in a thread, the system must call Claude Haiku to generate a concise, descriptive title of no more than 10 words instead of truncating the raw user text.
- Notes: `generateChatTitle()` in `/api/chat` calls Haiku (or a model specified in the title prompt config) to produce a short summary title. Title generation only fires on the first message when the thread still has the default "New chat" title. If the call fails, the system falls back to truncating the user message at 72 characters. The title generation model and prompt are configurable via `readTitlePromptConfig()` from the AI config directory. Title generation usage is tracked as a separate usage event with task type `"title"`.
- Dependencies: `src/routes/api/chat.ts`, `src/lib/chat.ts`, `src/lib/ai-config.ts`.
- Follow-up: None identified.

### Editable titles

- Requirement: Users must be able to click the thread title in the chat header to edit it inline, persisting the change immediately.
- Notes: The title in `ChatHeader` is an inline-editable field that saves on blur or Enter and cancels on Escape. A pencil icon appears on hover to indicate editability. The `updateChatThreadTitle` server function persists the change. Once a user edits a title, subsequent messages do not overwrite it because the title no longer matches "New chat".
- Dependencies: `src/components/chat/ChatHeader.tsx`, `src/lib/chat.functions.ts`, `src/routes/chat.tsx`.
- Follow-up: None identified.

### Effort level

- Requirement: Users must be able to set an effort level (low, medium, high) per thread for models that support it.
- Notes: Effort levels are defined in `src/lib/chat-models.ts`. Sonnet 4.6 and Opus 4.6 support effort; Haiku 4.5 and OpenRouter models do not. The effort selector only appears in the header and empty state when the current model supports it. Effort is persisted on the `ChatThread` model (default `"low"`) and sent as an Anthropic provider option. The `updateChatThreadEffort` server function handles persistence.
- Dependencies: `src/lib/chat-models.ts`, `src/components/chat/ChatHeader.tsx`, `src/components/chat/ChatEmptyState.tsx`, `src/lib/chat.functions.ts`, `src/routes/api/chat.ts`.
- Follow-up: None identified.

### @-mention autocomplete

- Requirement: Users must be able to type `@` in the chat composer to search their Obsidian vault and insert file references into messages.
- Notes: The `useMentionAutocomplete` hook detects `@` typed at start or after whitespace, queries the Obsidian vault via `searchObsidianMentions`, and provides keyboard navigation (arrow keys, Enter/Tab to select, Escape to dismiss). A `MentionPopover` component renders the results. This is available in both the empty-state composer and the active-thread composer.
- Dependencies: `src/hooks/useMentionAutocomplete.ts`, `src/components/mentions/MentionPopover.tsx`, `src/lib/obsidian.functions.ts`.
- Follow-up: None identified.

### Attachments

- Requirement: The active-thread composer must allow users to add, preview, and remove attachments before send, and sent user messages must show those attachments in the transcript.
- Notes: The current UI supports image and file tiles, image preview dialogs, and attachment removal before sending; attachment rendering is present in user messages via drag-and-drop and an add-attachment button; but this document does not yet define long-term persistence or model-level guarantees for every attachment type.
- Dependencies: `src/components/assistant-ui/attachment.tsx`, `src/components/assistant-ui/thread.tsx`.
- Follow-up: Define explicit product requirements for allowed file types, size limits, persistence lifecycle, and assistant behavior when attachments are included.

### Export to Obsidian

- Requirement: Users must be able to export any chat thread as a Markdown file into their Obsidian vault, with conversation metadata as YAML frontmatter.
- Export destination: The target folder is set in user preferences (`obsidianChatExportFolder`). The folder path supports placeholders for date-based organization: `{YYYY}` (4-digit year), `{MM}` (2-digit month), `{DD}` (2-digit day). Default: `Aether/Chats/{YYYY}/{MM}`.
- File naming: The filename is the thread ID with a `.md` extension (e.g. `thread_abc123.md`), ensuring uniqueness and avoiding filesystem-unsafe characters.
- Frontmatter metadata: The exported file includes YAML frontmatter with: thread title, aliases (e.g. `Chat: <title>`), model label, effort level, created date, updated date, message count, input/output tokens, estimated cost, and source (`Aether Chat`).
- Export format: Messages are rendered as Markdown with role headers (`## User`, `## Assistant`) separated by horizontal rules. Tool calls are omitted; only user and assistant text content is included.
- Overwrite behavior: If a file with the same name already exists at the target path, it is overwritten without prompting.
- UI: An export button (download icon) is available in the chat header for any active thread. Success/failure is reported via toast notifications.
- Activity logging: Each export is logged as a file change activity event.
- Dependencies: `src/lib/preferences.ts`, `src/lib/chat.functions.ts`, `src/components/chat/ChatHeader.tsx`, `src/routes/chat.tsx`, Obsidian vault access (`OBSIDIAN_DIR`).
- Follow-up: Decide whether tool-call content should be included in exports. Consider whether to add a "last exported" indicator on threads.

### Context compaction

- Requirement: When a conversation's input tokens exceed 50,000, the system must automatically compact older messages to reduce token usage and stay within context limits, while preserving the full conversation in the UI.
- Notes: Anthropic provides server-side compaction via `contextManagement` with `compact_20260112` edit type in `providerOptions`. The compaction block appears as content in the assistant response. The API automatically ignores messages before a compaction block on subsequent requests.
- Implementation approach: Store both full messages (`messagesJson`, for UI display) and compacted messages (`compactedMessagesJson`, for API calls) on `ChatThread`. On each request, the server uses compacted messages + new messages instead of the full frontend history. After each response, extract the compacted message state from the API response and persist it. This requires a new nullable `compactedMessagesJson` column on `ChatThread`.
- Key configuration: `providerOptions.anthropic.contextManagement.edits: [{ type: "compact_20260112", trigger: { type: "input_tokens", value: 50_000 } }]`
- Risks: The AI SDK (`@ai-sdk/anthropic` v3.x, `ai` v6.x) does not automatically persist compaction blocks across HTTP requests. There are no well-documented real-world examples of this pattern yet. The exact structure of compaction blocks in `streamText` responses (via `result.response` or `providerMetadata`) needs to be verified through testing.
- Dependencies: `src/routes/api/chat.ts`, `prisma/schema.prisma`, `src/lib/chat.ts`.
- Follow-up: Test with a low threshold first to verify the compaction flow end-to-end before using 50k in production. Monitor AI SDK and Anthropic docs for improved compaction persistence patterns.

## Open Questions

- Should attachment support be formally limited to certain file types and sizes, and should those limits be enforced in both UI and backend?
- Do you want thread deletion to remain permanent-only, or should chat eventually support archive and recovery?
- Should the chat UI expose per-message model and usage metadata, especially when a thread changes models over time?
- Should the current tool-inspection drawer be considered an end-user feature, or is it a developer/power-user affordance that needs a simpler mode later?
- How should the compacted message state be extracted from the AI SDK's `streamText` response — via `result.response.messages`, `providerMetadata`, or stream part inspection?

## Change Log

- 2026-03-14: Created the initial chat requirements doc from the current implementation and added it to the requirements index.
- 2026-03-14: Added AI-generated titles and editable titles sub-features.
- 2026-03-15: Added context compaction sub-feature (planned) with implementation notes.
- 2026-03-22: Added Export to Obsidian sub-feature (planned) — export chat threads as Markdown with frontmatter to a configurable vault folder.
- 2026-03-22: Comprehensive audit of implemented features. Updated AI-generated titles, editable titles, and Export to Obsidian from planned/in-progress to done. Added new sub-features: effort level, @-mention autocomplete, thread search, mobile thread drawer, skills system, plugin tools, tool ecosystem, system prompt and skills. Updated model list to include OpenRouter models (MiniMax M2.7, GLM-5). Corrected export file naming (uses thread ID, not title). Added tool-inspector.tsx to dependencies. Reordered changelog chronologically.
