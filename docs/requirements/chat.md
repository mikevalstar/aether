---
title: Chat
status: in-progress
owner: self
last_updated: 2026-03-14
canonical_file: docs/requirements/chat.md
---

# Chat

## Purpose

- Problem: Give authenticated users a persistent AI chat workspace inside Aether for day-to-day questions, drafting, and web-assisted research.
- Outcome: Users can create and manage chat threads, talk to Claude models in multiple turns, inspect tool use, and see token and cost totals per thread.
- Notes: This document reflects the current implementation in `/chat` and `/api/chat`, including UI behavior already wired through Assistant UI and Vercel AI SDK.

## Current Reality

- Current behavior: Chat is an authenticated thread-based interface with persistent history, model selection, streaming responses, message editing, regeneration, branch navigation, tool inspection, markdown rendering, and per-thread usage tracking.
- Constraints: Threads are scoped to the signed-in user in Prisma; messages and usage history are stored as JSON on `ChatThread`; model support is limited to the configured Claude models and tool access varies by model.
- Non-goals: Shared threads, multi-user collaboration, thread archive/restore, message search, custom system prompts, and guaranteed attachment processing rules are not implemented.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Access control | done | Only authenticated users can load the chat page, fetch thread data, or send chat requests. |
| Thread management | done | Users can create, select, and permanently delete their own chat threads. |
| Conversation experience | done | Users can hold multi-turn conversations with streaming responses, editing, reload, and branch navigation. |
| Model and tool support | done | Each thread uses a selected Claude model, and Sonnet/Opus expose broader web tools than Haiku. |
| Usage tracking | done | The system records per-response token and cost data and shows cumulative totals for the selected thread. |
| Attachments | in-progress | The composer and transcript support attachments in the UI, but product rules for storage and model handling are not yet explicitly defined. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Chat route gating | done | `/chat` redirects anonymous users to `/login` before loading thread data. | Inline |
| Thread sidebar | done | Users can switch threads, create a new one, resize the sidebar, and delete with confirmation. | Inline |
| Empty-state start | done | Users can begin a new thread from the empty state with a drafted first message and chosen model. | Inline |
| Streaming workspace | done | Existing threads load into Assistant UI with streaming responses from `/api/chat`. | Inline |
| Message controls | done | Assistant messages support copy, export, reload, and edited-branch navigation; user messages support editing. | Inline |
| Tool inspection | done | Tool calls are grouped in the transcript and can be inspected in a detail drawer. | Inline |
| Usage accounting | done | Thread totals and usage events are updated after each completed assistant response. | Inline |
| AI-generated titles | in-progress | On first message, the system calls Haiku to generate a short title (max 10 words) instead of truncating the user's text. | Inline |
| Editable titles | in-progress | Users can click the thread title in the header to edit it inline. | Inline |
| Attachment UI | in-progress | Users can add, preview, and remove attachments in the composer and view them on sent user messages. | Inline |

## Detail

### Access control and thread scoping

- Requirement: The system must gate chat UI and API access to authenticated users and must only expose threads owned by the active user.
- Notes: `/chat` uses `getSession()` in `beforeLoad` to redirect to `/login`; server functions use `ensureSession()`; `/api/chat` returns `401` without a session and looks up the thread by both `id` and `session.user.id`.
- Dependencies: `src/routes/chat.tsx`, `src/lib/chat.functions.ts`, `src/routes/api/chat.ts`, `src/lib/auth.functions.ts`.
- Follow-up: Align error UX for server-function failures so thread authorization errors are surfaced more deliberately in the UI.

### Thread lifecycle and persistence

- Requirement: Users must be able to create, select, persist, and delete chat threads, with each thread restoring its saved messages and model.
- Notes: `getChatPageData()` loads all user threads ordered by `updatedAt desc`; `createChatThread()` creates a new `ChatThread` with a generated ID and default or selected model; deleting a thread permanently removes it; titles and previews are derived from message content.
- Dependencies: `src/routes/chat.tsx`, `src/lib/chat.functions.ts`, `src/lib/chat.ts`.
- Follow-up: Decide whether to add soft delete or archive behavior before thread volume grows.

### Starting and continuing conversations

- Requirement: Users must be able to start a conversation from an empty state or continue an existing thread with streamed assistant responses.
- Notes: The empty state accepts a draft message, sends on `Enter`, and stores the first message in `sessionStorage` until the new thread loads; `ChatWorkspace` bootstraps that first message only when the thread is still empty.
- Dependencies: `src/routes/chat.tsx`, `src/components/chat/ChatWorkspace.tsx`.
- Follow-up: Decide whether the empty-state composer should match the richer attachment-enabled composer used inside an active thread.

### Conversation controls and branching

- Requirement: The transcript must support editing prior user messages, reloading assistant turns, and navigating between resulting branches.
- Notes: Assistant UI primitives provide edit composers, reload actions, and branch pickers for both assistant and user messages; the current UI exposes these controls directly in the message chrome.
- Dependencies: `src/components/assistant-ui/thread.tsx`.
- Follow-up: Confirm whether branch terminology needs explicit product copy so users understand edited/regenerated paths.

### Model selection and tool access

- Requirement: Each thread must use one supported Claude model, and tool availability must depend on that model.
- Notes: Supported models are Haiku 4.5, Sonnet 4.6, and Opus 4.6; Haiku gets `fetch_url_markdown`; Sonnet and Opus get `web_search`, `web_fetch`, and `fetch_url_markdown`; the selected model is persisted to the thread and sent with each request.
- Dependencies: `src/lib/chat.ts`, `src/routes/chat.tsx`, `src/routes/api/chat.ts`, `src/lib/tools/fetch-url-markdown`.
- Follow-up: Decide whether model changes should affect only future turns, or whether the UI should show mixed-model history more explicitly.

### Tool-call visibility and inspection

- Requirement: When the assistant uses tools, the transcript must summarize tool activity inline and allow inspection of individual tool payloads and outputs.
- Notes: Consecutive tool calls are grouped into a collapsible activity block; each tool row shows status and summary text; selecting a tool opens a right-side drawer with raw input, output or error text, and metadata such as call ID and payload size.
- Dependencies: `src/components/assistant-ui/thread.tsx`, `src/components/assistant-ui/tool-activity-summary.tsx`.
- Follow-up: Decide whether users also need a simpler non-technical tool summary separate from raw payload inspection.

### Rendering and message actions

- Requirement: Assistant responses must render rich markdown and expose common transcript actions.
- Notes: Markdown rendering supports GFM features such as tables and fenced code blocks; code blocks have copy buttons; assistant messages expose copy, refresh, and export-as-Markdown actions; API and generation errors render inline above or within the thread.
- Dependencies: `src/components/assistant-ui/thread.tsx`, `src/components/assistant-ui/markdown-text.tsx`, `src/components/chat/ChatWorkspace.tsx`.
- Follow-up: Decide whether exported Markdown should include tool-call details or remain assistant-text only.

### Usage and cost accounting

- Requirement: The system must track usage per assistant response and maintain cumulative thread totals for input tokens, output tokens, and estimated cost.
- Notes: `/api/chat` computes exchange usage from model usage metadata, estimates USD cost from configured pricing, appends usage history to the thread, updates cumulative thread totals, and inserts a `chatUsageEvent`; the chat header shows the selected thread totals.
- Dependencies: `src/routes/api/chat.ts`, `src/lib/chat.ts`, `src/routes/chat.tsx`.
- Follow-up: Decide whether users should be able to inspect per-message usage directly from the transcript instead of only seeing thread totals and external usage views.

### AI-generated titles

- Requirement: When the first user message is sent in a thread, the system must call Claude Haiku to generate a concise, descriptive title of no more than 10 words instead of truncating the raw user text.
- Notes: Currently `getChatTitleFromMessages()` truncates the first user message to 72 characters. The new behavior replaces this with an async Haiku call that produces a short summary title. Title generation should only fire on the first message; subsequent messages should not overwrite a generated or user-edited title. The title field already exists on the `ChatThread` model with a default of "New chat".
- Dependencies: `src/routes/api/chat.ts`, `src/lib/chat.ts`, `src/lib/chat.functions.ts`.
- Follow-up: Decide whether to show a loading indicator while the title generates, or rely on the sidebar refreshing after completion.

### Editable titles

- Requirement: Users must be able to click the thread title in the chat header to edit it inline, persisting the change immediately.
- Notes: The title in `ChatHeader` is currently a static `<h1>`. This should become an inline-editable field that saves on blur or Enter and cancels on Escape. A server function `updateChatThreadTitle` is needed to persist the change. Once a user edits a title, it should be treated as manually set and not overwritten by AI generation on future messages.
- Dependencies: `src/components/chat/ChatHeader.tsx`, `src/lib/chat.functions.ts`, `src/routes/chat.tsx`.
- Follow-up: None identified.

### Attachments

- Requirement: The active-thread composer must allow users to add, preview, and remove attachments before send, and sent user messages must show those attachments in the transcript.
- Notes: The current UI supports image and file tiles, image preview dialogs, and attachment removal before sending; attachment rendering is present in user messages, but this document does not yet define long-term persistence or model-level guarantees for every attachment type.
- Dependencies: `src/components/assistant-ui/attachment.tsx`, `src/components/assistant-ui/thread.tsx`.
- Follow-up: Define explicit product requirements for allowed file types, size limits, persistence lifecycle, and assistant behavior when attachments are included.

## Open Questions

- Should attachment support be formally limited to certain file types and sizes, and should those limits be enforced in both UI and backend?
- Do you want thread deletion to remain permanent-only, or should chat eventually support archive and recovery?
- Should the chat UI expose per-message model and usage metadata, especially when a thread changes models over time?
- Should the current tool-inspection drawer be considered an end-user feature, or is it a developer/power-user affordance that needs a simpler mode later?

## Change Log

- 2026-03-14: Added AI-generated titles and editable titles sub-features.
- 2026-03-14: Created the initial chat requirements doc from the current implementation and added it to the requirements index.
