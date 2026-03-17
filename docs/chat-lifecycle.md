# Chat Lifecycle

How a user chat session works end-to-end — from visiting `/chat` to streaming a response, persisting messages, tracking usage, and logging activity.

## Overview

The chat feature is an AI conversation interface powered by Claude (via Vercel AI SDK) with an Assistant UI frontend. Users create **threads**, send messages that stream through a server-side API endpoint, and get back tool-augmented responses. Every exchange is persisted to SQLite (via Prisma), with token usage tracked per-exchange and aggregated for analytics. When the AI uses file-writing tools during a conversation, those changes are logged as **activity** entries that can be viewed and reverted.

## Key Files

| Area | File | Purpose |
|------|------|---------|
| **Schema** | `prisma/schema.prisma` (`ChatThread`) | Thread storage — messages, usage totals, model, effort |
| **Schema** | `prisma/schema.prisma` (`ChatUsageEvent`) | Per-exchange usage records for analytics |
| **Schema** | `prisma/schema.prisma` (`ActivityLog` + `FileChangeDetail`) | File change tracking from AI tool use |
| **Types** | `src/lib/chat.ts` | `AppChatMessage`, `ChatUsageEntry`, `ChatUsageTotals`, serialization helpers, cost estimation |
| **Models config** | `src/lib/chat-models.ts` | Model definitions (Haiku/Sonnet/Opus), pricing, effort/tool support flags |
| **Server functions** | `src/lib/chat.functions.ts` | Thread CRUD: create, update title/model/effort, delete, page data loader |
| **API endpoint** | `src/routes/api/chat.ts` | POST handler — title generation, system prompt, streaming, persistence |
| **AI tools** | `src/lib/ai-tools.ts` | Tool set factory: web tools, Obsidian tools, notifications |
| **AI config** | `src/lib/ai-config.ts` | Reads system prompt and title prompt from Obsidian vault |
| **Activity logging** | `src/lib/activity.ts` | `logFileChange()` — creates `ActivityLog` + `FileChangeDetail` |
| **Activity server fns** | `src/lib/activity.functions.ts` | Activity list, detail, and file revert server functions |
| **Usage analytics** | `src/lib/chat-usage.functions.ts` | `getChatUsageStats()` — aggregates usage events for the `/usage` dashboard |
| **Route** | `src/routes/chat.tsx` | Page route — auth guard, data loading, layout, thread sidebar |
| **UI — workspace** | `src/components/chat/ChatWorkspace.tsx` | `useChat` hook, transport config, Assistant UI runtime |
| **UI — header** | `src/components/chat/ChatHeader.tsx` | Title editing, model/effort selectors, usage stats display |
| **UI — empty state** | `src/components/chat/ChatEmptyState.tsx` | Model picker + message input for new conversations |
| **UI — thread list** | `src/components/chat/ChatThreadItem.tsx` | Thread preview card with title, preview text, timestamp |
| **UI — thread renderer** | `src/components/assistant-ui/thread.tsx` | Assistant UI primitives for message rendering, tool inspector, actions |
| **Obsidian write tool** | `src/lib/tools/obsidian-write.ts` | File write tool — triggers activity logging |
| **Obsidian edit tool** | `src/lib/tools/obsidian-edit.ts` | File edit tool — triggers activity logging |
| **Auth** | `src/lib/auth.functions.ts` | `getSession()`, `ensureSession()` — session verification |

## 1. Route Entry & Authentication

When a user navigates to `/chat`, TanStack Router loads the route defined in `src/routes/chat.tsx`.

1. **`beforeLoad`** calls `getSession()` from `src/lib/auth.functions.ts`
2. If no session exists, the user is redirected to `/login`
3. **`loaderDeps`** extracts the `threadId` search parameter (validated by `chatSearchSchema`, a Zod schema accepting an optional `threadId` string)
4. **`loader`** calls `getChatPageData()` server function with the optional `threadId`

`getChatPageData()` in `src/lib/chat.functions.ts` returns:
- **`threads`** — all `ChatThread` records for the user (type `"chat"`, ordered by `updatedAt` desc), each mapped to a `ChatThreadSummary` with a preview extracted from the last message
- **`selectedThread`** — full summary for the requested thread (if `threadId` was provided and matches)
- **`messagesJson`** — raw JSON string of stored messages for the selected thread
- **`usageHistoryJson`** — raw JSON string of cumulative usage entries

## 2. Page Layout & Thread Selection

`ChatPage` in `src/routes/chat.tsx` renders a two-panel layout:

- **Main area** (left on desktop) — either `ChatEmptyState` or `ChatWorkspace` depending on whether a thread is selected
- **Thread sidebar** (right on desktop, drawer on mobile) — list of `ChatThreadItem` components

**State management:**
- `sidebarWidth` persisted to `localStorage` key `aether:chat-sidebar-width` (default 320px, min 280, max 460)
- Sidebar is resizable via a drag handle between the panels
- Mobile uses a `Drawer` component (right-slide) toggled from the header

Selecting a thread navigates to `/chat?threadId=<id>`, which triggers the loader to re-fetch data.

## 3. Creating a New Thread

Threads are created in two contexts:

### From the empty state
When no thread is selected, `ChatEmptyState` renders a model picker and message input. On send:

1. `handleCreateThread(model, firstMessage)` is called
2. `createChatThread()` server function creates a `ChatThread` record with:
   - `id`: `thread_${crypto.randomUUID()}`
   - `title`: `"New chat"` (default)
   - `model`: selected model or `claude-haiku-4-5`
   - `effort`: `"low"` (default)
3. The first message is stored in `sessionStorage` at key `aether:pending-chat-message:{threadId}`
4. Navigation to `/chat?threadId={id}` triggers the loader

### From the sidebar "New" button
Creates a thread with default model and no pending message. The user then types in the `ChatWorkspace` composer.

## 4. Chat Workspace Initialization

When a thread is selected, `ChatWorkspace` in `src/components/chat/ChatWorkspace.tsx` mounts with a **key** of `{threadId}:{model}:{effort}` (forcing a full remount on any change).

1. **`useChat`** hook from `@ai-sdk/react` initializes with:
   - `id`: the thread ID
   - `messages`: parsed from `messagesJson` via `parseStoredMessages()`
   - `transport`: a `DefaultChatTransport` pointing to `/api/chat`
2. **`prepareSendMessagesRequest`** injects `threadId`, `model`, and `effort` into every request body
3. **`onFinish`** callback calls `refreshPage()` to reload thread data (updated usage totals, title)

### Pending message bootstrap
On first render, if `initialMessage` was passed (consumed from `sessionStorage`):
1. A ref (`hasBootstrappedMessage`) ensures this runs only once
2. `chat.sendMessage({ text: initialMessage })` fires automatically
3. The `sessionStorage` key is cleared in the parent component

### Assistant UI integration
The `useChat` return value is wrapped with `useAISDKRuntime()` and provided via `AssistantRuntimeProvider`. This powers the `Thread` component from `src/components/assistant-ui/thread.tsx`, which renders messages with:
- Markdown rendering (GFM)
- Tool call visualization with status indicators
- Message actions: copy, refresh, export as markdown
- User message editing
- Composer with Shift+Enter for newlines

## 5. Sending a Message — API Endpoint

When the user sends a message, `useChat` POSTs to `/api/chat` (defined in `src/routes/api/chat.ts`).

### Request validation
1. Authenticate via `auth.api.getSession({ headers })`  — 401 if no session
2. Parse body: `{ id: threadId, messages: UIMessage[], model?, effort? }`
3. Reject if `threadId` is missing or `messages` is empty — 400
4. Look up `ChatThread` by ID + userId — 404 if not found
5. Validate `model` against `isChatModel()`, defaulting to `claude-haiku-4-5`
6. Validate `effort` against `isChatEffort()`, defaulting to `"low"`

### Title generation (first message only)
If the thread title is still `"New chat"` and no messages are stored yet:

1. Extract the first user message text
2. Call `generateChatTitle()` — uses `generateText()` with the title system prompt (from `src/lib/ai-config.ts`, file `title-prompt.md` in the Obsidian AI config directory)
3. Title model defaults to `claude-haiku-4-5` (configurable in the title prompt config)
4. On failure, falls back to truncating the first message to 72 characters
5. Title generation usage is tracked separately with `taskType: "title"` and accumulated into `currentTotals` so the main chat usage stacks on top

### System prompt & tools
1. `readSystemPrompt(userName)` from `src/lib/ai-config.ts` reads `system-prompt.md` from the Obsidian AI config directory
   - Interpolates `{{date}}`, `{{userName}}`, `{{aiMemoryPath}}`
   - Returns 500 if not configured
2. `createAiTools(model, userId, threadId)` from `src/lib/ai-tools.ts` builds the tool set:

| Tool | Source | Description |
|------|--------|-------------|
| `web_fetch` | Anthropic provider | Fetch URLs (version depends on model) |
| `web_search` | Anthropic provider | Web search (version depends on model) |
| `fetch_url_markdown` | Custom | Fetch URL and convert to markdown |
| `obsidian_folders` | Custom | List vault folders |
| `obsidian_list` | Custom | List files in a folder |
| `obsidian_search` | Custom | Search vault contents |
| `obsidian_read` | Custom | Read a vault file |
| `obsidian_write` | Custom | Write/create a vault file (logs activity) |
| `obsidian_edit` | Custom | Edit a vault file (logs activity) |
| `obsidian_ai_notes_list` | Custom | List AI memory notes |
| `send_notification` | Custom | Send a push notification |

Tool versions for `web_fetch` and `web_search` depend on the model — Sonnet/Opus use `_20260209` (latest), Haiku uses `_20250910`/`_20250305` (legacy).

### Pre-stream persistence
Before streaming begins, the thread is updated with the incoming messages and title:

```
prisma.chatThread.update({
  model, title,
  messagesJson: serializeMessages(incomingMessages)
})
```

This ensures the thread has the user's message even if streaming fails.

### Streaming response
`streamText()` from Vercel AI SDK is called with:
- **Model**: `anthropic(model)` — the selected Claude model
- **System prompt**: the configured prompt
- **Messages**: converted via `convertToModelMessages()`
- **Tools**: full tool set
- **`stopWhen: stepCountIs(10)`** — limits agentic tool-use loops to 10 steps
- **Provider options**: ephemeral cache control, effort level (if supported by model)

The response is converted to a UI message stream via `toUIMessageStreamResponse()` with:

**`messageMetadata` callback:**
- On `start`: sets `createdAt` timestamp and `model` on the assistant message metadata
- On `finish`: calculates per-exchange usage (`exchangeUsage`) and cumulative totals (`nextTotals`)

**`onFinish` callback** (runs after stream completes):

## 6. Post-Stream Persistence

The `onFinish` callback in the API endpoint persists everything in a single Prisma transaction:

1. **Title usage events** — if title was generated, create `ChatUsageEvent` records with `taskType: "title"`
2. **Thread update** — overwrites `ChatThread` with:
   - `messagesJson`: final messages including the assistant's response
   - `usageHistoryJson`: full usage history with the new entry appended
   - `totalInputTokens`, `totalOutputTokens`, `totalEstimatedCostUsd`: cumulative totals
   - `systemPromptJson`: snapshot of the system prompt used
   - `availableToolsJson`: snapshot of tool names available
3. **Chat usage event** — creates a `ChatUsageEvent` with `taskType: "chat"` for the main exchange

### Cost calculation
`estimateChatUsageCostUsd()` in `src/lib/chat.ts` uses per-model pricing from `CHAT_MODELS`:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Claude Haiku 4.5 | $1 | $5 |
| Claude Sonnet 4.6 | $3 | $15 |
| Claude Opus 4.6 | $5 | $25 |

Costs are rounded to 6 decimal places. The UI displays `"<$0.0001"` for very small amounts.

## 7. Activity Logging (File Changes)

Activity logging is **not** triggered by chat messages themselves. It is triggered when the AI uses **file-writing tools** during a conversation — specifically `obsidian_write` and `obsidian_edit`.

### How it works

When the AI calls `obsidian_write` (in `src/lib/tools/obsidian-write.ts`) or `obsidian_edit` (in `src/lib/tools/obsidian-edit.ts`):

1. The tool reads the file's current content (if it exists) as `originalContent`
2. Writes the new content to the Obsidian vault
3. Calls `logFileChange()` from `src/lib/activity.ts` with:
   - `userId`: from the tool context
   - `filePath`: relative path within the vault
   - `originalContent`: previous content (or `null` for new files)
   - `newContent`: what was written
   - `changeSource`: `"ai"`
   - `toolName`: `"obsidian_write"` or `"obsidian_edit"`
   - `summary`: e.g. `"AI wrote daily-note.md"`
   - `metadata`: `{ chatThreadId: "thread_..." }` — links the change back to the conversation

### Database records
`logFileChange()` creates two linked records in a single Prisma call:
- **`ActivityLog`** — type `"file_change"`, summary, metadata JSON, userId, timestamp
- **`FileChangeDetail`** — filePath, originalContent, newContent, changeSource, toolName

### Viewing activity
The `/activity` route displays activity via `getActivityList()` in `src/lib/activity.functions.ts`:
- Paginated list (50 per page) ordered by `createdAt` desc
- Filterable by type (e.g. `"file_change"`, `"cron_task"`, `"workflow"`)
- Each item shows the file path and change source

### Activity detail & revert
`getActivityDetail()` loads a single activity entry with:
- Full `FileChangeDetail` (original + new content)
- Current file content from disk (to show diffs)
- Associated `ChatThread` data (if metadata contains `chatThreadId`) — for cron_task/workflow/system_task types, this shows the AI conversation that triggered the change

`revertFileChange()` allows undoing a file change:
- If the file was **new** (no original content): deletes the file
- If the file was **modified**: restores the original content
- Creates a **new** activity log entry with `changeSource: "manual"` for the revert itself

## 8. Usage Analytics

Usage data flows to the `/usage` dashboard via `getChatUsageStats()` in `src/lib/chat-usage.functions.ts`.

### Data source
Every chat exchange and title generation creates a `ChatUsageEvent` record with:
- `model`, `taskType` (`"chat"`, `"title"`, `"task"`, `"workflow"`)
- `inputTokens`, `outputTokens`, `totalTokens`
- `estimatedCostUsd`
- `threadId` (optional — links back to the conversation)

### Aggregation
The server function queries `ChatUsageEvent` with filters (model, taskType, date range) and returns:
- **Totals**: sum of tokens, cost, event count, averages, active days
- **Daily usage**: cost and tokens per day (for charts)
- **Model breakdown**: per-model totals with share-of-cost percentages
- **Recent events**: last 10 events with thread titles resolved from `ChatThread`
- **Date bounds**: earliest and latest event timestamps

### In-thread usage display
Each thread also tracks usage inline:
- `ChatHeader` shows input/output tokens and estimated cost for the current thread
- `usageHistoryJson` on the `ChatThread` record stores per-exchange entries with cumulative totals
- Each assistant message carries `ChatMessageMetadata` with `usage` (per-exchange) and `totals` (cumulative)

## 9. Thread Management

### Updating metadata
Three server functions handle thread settings, all in `src/lib/chat.functions.ts`:
- **`updateChatThreadTitle()`** — inline title editing in the header; trims input, falls back to `"New chat"` if empty
- **`updateChatThreadModel()`** — model selector dropdown; validates against `isChatModel()`
- **`updateChatThreadEffort()`** — effort selector; validates against `isChatEffort()`

All three verify ownership (`userId` match), update the record, and the UI calls `router.invalidate()` to refresh.

### Deleting a thread
1. User clicks delete → confirmation dialog appears
2. `deleteChatThread()` deletes the `ChatThread` record (cascades to delete `ChatUsageEvent` records via Prisma)
3. If the deleted thread was selected, navigation clears the `threadId` param
4. Toast notification confirms deletion

## 10. Data Model

### ChatThread
```
id                    String    — "thread_{uuid}"
title                 String    — default "New chat", AI-generated on first message
type                  String    — "chat" (also "task", "workflow" for other features)
model                 String    — "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-6"
effort                String    — "low" | "medium" | "high"
messagesJson          String    — JSON array of AppChatMessage
usageHistoryJson      String    — JSON array of ChatUsageEntry
totalInputTokens      Int       — cumulative input tokens
totalOutputTokens     Int       — cumulative output tokens
totalEstimatedCostUsd Float     — cumulative estimated cost
systemPromptJson      String?   — snapshot of last system prompt used
availableToolsJson    String?   — snapshot of last tool names available
userId                String    — owner (cascade delete)
createdAt / updatedAt DateTime
```
Indexes: `[userId, updatedAt]`, `[userId, type, updatedAt]`

### ChatUsageEvent
```
id               String    — "usage_event_{uuid}"
model            String    — which model was used
taskType         String    — "chat", "title", "task", "workflow"
inputTokens      Int
outputTokens     Int
totalTokens      Int
estimatedCostUsd Float
threadId         String?   — links to ChatThread (optional)
userId           String    — owner (cascade delete)
createdAt        DateTime
```
Indexes: `[userId, createdAt]`, `[userId, model, createdAt]`

### ActivityLog + FileChangeDetail
```
ActivityLog:
  id        String    — cuid
  type      String    — "file_change", "cron_task", "workflow", "system_task"
  summary   String    — human-readable description
  metadata  String?   — JSON with chatThreadId, etc.
  userId    String    — owner (cascade delete)
  createdAt DateTime

FileChangeDetail:
  id              String   — cuid
  activityLogId   String   — unique link to ActivityLog
  filePath        String   — relative path in Obsidian vault
  originalContent String?  — null if file was newly created
  newContent      String   — what was written
  changeSource    String   — "ai" or "manual"
  toolName        String?  — "obsidian_write" or "obsidian_edit"
```

## 11. Error Handling

| Scenario | Response | Behavior |
|----------|----------|----------|
| No session | 401 Unauthorized | Route redirects to `/login`; API returns 401 |
| Missing threadId or empty messages | 400 Invalid request | — |
| Thread not found / wrong user | 404 Not found | — |
| System prompt not configured | 500 | Requires `OBSIDIAN_DIR` + `OBSIDIAN_AI_CONFIG` env vars |
| Title generation fails | Fallback | Truncates first message to 72 chars |
| Stream error | Error banner | `ChatWorkspace` renders `chat.error.message` in a red banner |
| Activity log fails | Non-blocking | `logFileChange` errors are caught and logged, don't block the tool response |

## 12. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Authenticates with the Anthropic API |
| `OBSIDIAN_DIR` | Yes | Root path of the Obsidian vault |
| `OBSIDIAN_AI_CONFIG` | No | Subdirectory for AI config files (default: `"ai-config"`) |
| `OBSIDIAN_AI_MEMORY` | No | Path to AI memory folder (default: `"ai-memory"`) |
