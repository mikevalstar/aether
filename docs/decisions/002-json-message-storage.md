---
title: "ADR-002: JSON Message Storage in ChatThread"
status: accepted
date: 2026-03-15
---

# ADR-002: JSON Message Storage in ChatThread

## Context

Chat messages and usage history are stored as JSON blobs (`messagesJson`, `usageHistoryJson`) in the `ChatThread` table rather than as normalized rows in a separate `ChatMessage` table.

## Decision

We will keep the JSON blob storage approach.

## Rationale

1. **Single user** — There is no concurrent access or multi-user query pattern that would benefit from normalized message rows. The performance ceiling of JSON serialization is unlikely to be hit by one person.

2. **Simplicity** — The current approach keeps the data model flat. Messages are always loaded and saved as a unit with their thread, matching the UI's access pattern exactly.

3. **AI SDK compatibility** — The Vercel AI SDK works with message arrays natively. Storing them as-is avoids mapping overhead between a relational schema and the SDK's expected format.

4. **Adequate performance** — Even with 100+ messages per thread, the JSON blob stays well under 1MB. SQLite handles this without issue for a single-user workload.

## Consequences

- Cannot query individual messages via SQL (e.g., "find all messages mentioning X")
- Large conversations (500+ messages) may eventually need truncation or archival
- If the project ever scales to multiple users, this decision should be revisited
