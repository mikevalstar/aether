---
title: Plugin — Email (IMAP)
status: done
owner: Mike
last_updated: 2026-03-28
canonical_file: docs/requirements/plugin-imap.md
---

# Plugin — Email (IMAP)

## Purpose

- Problem: No way to check, read, or manage email without leaving the dashboard and opening a separate mail client.
- Outcome: An IMAP-based plugin that gives the AI chat full read/search/organize access to email, plus a dashboard widget showing inbox status at a glance.
- Notes: First plugin built on the plugin system. Designed primarily for Proton Mail Bridge (local IMAP) but works with any standard IMAP server.

## Current Reality

- Current behavior: Fully implemented. AI can list, read, search, move, and archive emails. Dashboard widget shows unread count and recent messages.
- Constraints: IMAP only (no SMTP/sending). Proton Mail Bridge uses self-signed certs and non-standard UID ordering, both handled. Connection is per-request (no persistent connection pool).
- Non-goals: Email sending/composing (planned separately — see Ideas in index.md). Email notifications/push. Full-text indexing. Attachment downloading or rendering.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Plugin skeleton | done | `src/plugins/imap_email/` following the plugin system's dual-export pattern |
| IMAP client library | done | Core `imapflow`-based client with connection management and MIME parsing |
| AI tools | done | Six tools for inbox listing, reading, searching, folder listing, moving, and archiving |
| Dashboard widget | done | Quarter-width inbox widget showing unread count and recent emails |
| Configuration | done | IMAP host/port/username/password/TLS settings via plugin options |
| Health check | done | Connection test returning inbox status and unread count |
| Activity logging | done | All email operations logged as `plugin:imap_email:email_check` |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Plugin meta & options | done | Plugin ID, config fields for IMAP connection | Inline |
| IMAP client | done | `imapflow` + `mailparser` client with connection helpers | Inline |
| List inbox tool | done | `imap_email_list_inbox` — fetch recent emails with envelope data | Inline |
| Read email tool | done | `imap_email_read_email` — full email content by UID | Inline |
| Search emails tool | done | `imap_email_search_emails` — search by subject, sender, or body | Inline |
| List folders tool | done | `imap_email_list_folders` — all mailbox folders with counts | Inline |
| Move email tool | done | `imap_email_move_email` — move email between folders | Inline |
| Archive email tool | done | `imap_email_archive_email` — archive with auto-detected folder | Inline |
| Dashboard widget | done | Inbox widget with unread badge, recent emails, read/unread icons | Inline |
| Health check | done | IMAP connection test with unread count reporting | Inline |
| System prompt | done | AI instruction snippet for email tool usage | Inline |
| Command palette entry | done | "Email Settings" command linking to plugin settings page | Inline |

## Detail

### Plugin Meta & Options

- Plugin ID: `imap_email`
- Name: "Email (IMAP)"
- Icon: `Mail` (lucide-react)
- Version: `0.1.0`
- Activity types: `email_check` — logged for list, search, move, and archive operations

Configuration fields (auto-rendered on `/settings/plugins/imap_email`):

| Field | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| IMAP Host | text | `127.0.0.1` | no | IMAP server hostname |
| IMAP Port | number | `1143` | no | IMAP server port |
| Username | text | — | yes | IMAP login username (email address) |
| Password | password | — | yes | IMAP password or app-specific password |
| Use TLS | boolean | `false` | no | Enable TLS (disable for local Proton Mail Bridge) |

### IMAP Client

Core library at `src/plugins/imap_email/lib/imap-client.ts`.

**Dependencies:**
- `imapflow` (^1.2.18) — IMAP protocol client
- `mailparser` (^3.9.6) — MIME email parsing

**Key types:**

| Type | Fields |
| --- | --- |
| `ImapOptions` | `host`, `port`, `username`, `password`, `tls` |
| `EmailEnvelope` | `uid`, `subject`, `from`, `date`, `unread`, `messageId` |
| `EmailMessage` | `uid`, `subject`, `from`, `to`, `date`, `textBody`, `htmlBody?` |
| `MailboxInfo` | `name`, `path`, `totalMessages`, `unreadMessages`, `specialUse?` |

**Implementation notes:**
- Self-signed certificate support (`rejectUnauthorized: false`) for Proton Mail Bridge
- Client-side date sorting — Proton Mail Bridge UIDs are not date-ordered, so all envelopes are fetched and sorted newest-first in memory
- Mailbox locks for atomic operations
- Proper resource cleanup (logout) in `finally` blocks

**Core functions:**

| Function | Description |
| --- | --- |
| `createClient(options)` | Creates IMAP connection with TLS/cert handling |
| `listInbox(options, limit?)` | Recent emails sorted by date (default 20) |
| `readEmail(options, uid)` | Full email content via `mailparser` |
| `searchEmails(options, query, limit?)` | Search subject, from, and body |
| `getUnreadCount(options)` | Unread email count |
| `listFolders(options)` | All folders with message counts |
| `moveEmail(options, uid, dest, source?)` | Move email between folders |
| `archiveEmail(options, uid, source?)` | Archive with auto-detection |
| `testConnection(options)` | Test connection, return inbox status |

### AI Tools

Six tools registered via `createTools()` in `server.ts`, all prefixed with `imap_email_`:

#### `imap_email_list_inbox`

- Description: List recent emails from the user's inbox
- Parameters: `limit` (optional, 1–50, default 20)
- Returns: Array of emails with subject, sender, date, unread status, UID
- Logs activity: yes (email count and unread count)

#### `imap_email_read_email`

- Description: Read the full content of a specific email by UID
- Parameters: `uid` (required)
- Returns: Full email — subject, from, to, date, textBody, htmlBody (optional)
- Note: Must use `list_inbox` or `search_emails` first to obtain UIDs

#### `imap_email_search_emails`

- Description: Search emails by subject, sender, or body content
- Parameters: `query` (required), `limit` (optional, 1–50, default 20)
- Returns: Array of matching emails with envelope info
- Logs activity: yes (query and match count)

#### `imap_email_list_folders`

- Description: List all mailbox folders with message counts
- Parameters: none
- Returns: Array of folders — name, path, totalMessages, unreadMessages, specialUse

#### `imap_email_move_email`

- Description: Move an email to a different folder
- Parameters: `uid` (required), `destinationFolder` (required, e.g. `'Trash'`, `'Spam'`, `'Folders/Work'`), `sourceFolder` (optional, default `"INBOX"`)
- Returns: Success confirmation with UID and destination
- Logs activity: yes (UID, destination, source)

#### `imap_email_archive_email`

- Description: Archive an email (auto-detects the Archive folder)
- Parameters: `uid` (required), `sourceFolder` (optional, default `"INBOX"`)
- Returns: Success confirmation with UID and archive folder path
- Auto-detection logic: checks for `\Archive` special use flag, then common names ("Archive", "All Mail")
- Logs activity: yes (UID, archive folder, source)

### System Prompt

Injected when the plugin is enabled so the AI knows about the tools:

> You have access to email tools via IMAP. Use these tools when the user asks about their email:
> - `imap_email_list_inbox`: List recent emails from the inbox
> - `imap_email_read_email`: Read the full content of a specific email by UID
> - `imap_email_search_emails`: Search emails by subject, sender, or body content
> - `imap_email_list_folders`: List all mailbox folders with message counts
> - `imap_email_move_email`: Move an email to a different folder by UID
> - `imap_email_archive_email`: Archive an email (auto-detects the Archive folder)
>
> Always use `list_inbox` or `search_emails` first to get UIDs before reading, moving, or archiving.

### Dashboard Widget

- Widget ID: `inbox`
- Label: "Inbox"
- Size: `"quarter"` (one grid column)
- Data loaded server-side via `loadWidgetData()` — returns unread count and recent emails (5 max)

**Display:**
- Unread count badge (coral color)
- List of recent emails showing:
  - Subject (bold if unread, muted if read)
  - Sender name
  - Relative time (via `date-fns` `formatDistanceToNow`)
  - `Mail` icon (unread) / `MailOpen` icon (read)

**States:**
- Not configured: shows setup instructions
- Connection error: displays error message
- Loaded: shows unread count and recent emails

### Health Check

- Validates IMAP connection is working
- Returns status: `"ok"`, `"error"`, or `"warning"` with message
- States:
  - Not configured (missing credentials): warning with "Not configured" message
  - Connected: `"ok"` with `"Connected — X unread"`
  - Connection failed: `"error"` with error message

### Command Palette

- Registers "Email Settings" command linking to `/settings/plugins/imap_email`
- Uses `Mail` icon from lucide-react

## File Structure

```
src/plugins/imap_email/
  index.ts            # Client-safe AetherPlugin export (no server imports)
  index.server.ts     # Full AetherPlugin export (includes server definition)
  meta.ts             # PluginMeta, optionFields, activityTypes
  server.ts           # AetherPluginServer (tools, systemPrompt, loader, health)
  client.tsx          # AetherPluginClient (InboxWidget, commands)
  lib/
    imap-client.ts    # Core IMAP client (imapflow + mailparser)
```

## Open Questions

None currently.

## Resolved Questions

- ~~Should we maintain a persistent IMAP connection?~~ No — per-request connections are simpler and sufficient for the usage pattern. Proton Mail Bridge runs locally so latency is negligible.
- ~~How to handle Proton Mail Bridge's self-signed certs?~~ Set `rejectUnauthorized: false` in TLS options.
- ~~How to handle non-date-ordered UIDs?~~ Fetch all envelopes and sort client-side by date (newest first).

## Change Log

- 2026-03-28: Requirements reverse-engineered from implementation and documented.
