---
title: User Preferences
status: done
owner: self
last_updated: 2026-03-15
canonical_file: docs/requirements/user-preferences.md
---

# User Preferences

## Purpose

- Problem: Users have no way to update their profile (name) or configure application-level settings like the Obsidian templates folder.
- Outcome: A centralized preferences page where users can manage their profile and app settings, starting with Obsidian template folder selection.
- Notes: Preferences are stored as a JSON column on the User model for flexibility.

## Current Reality

- Current behavior: A `/settings/preferences` page allows updating the user's name and selecting an Obsidian vault folder to use as the templates source for new file creation.
- Constraints: Email is display-only (not editable). Obsidian section only appears when the vault is configured (`OBSIDIAN_DIR`).
- Non-goals: Image/avatar upload, email change, theme preferences (handled separately via localStorage).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Profile editing | done | Users can update their display name via Better Auth. |
| Obsidian templates folder | done | Users can select a vault folder as the template source for new file creation. |
| Obsidian chat export folder | planned | Users can configure a folder path (with date placeholders) where chat exports are saved. |
| Preferences storage | done | User preferences stored as JSON in the `preferences` column on the User model. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Profile section | done | Name field (editable) and email (display-only) in a card form. | Inline |
| Obsidian templates folder picker | done | Select dropdown of vault folders, with "Bundled templates (default)" option. | Inline |
| Obsidian chat export folder | planned | Text input for chat export folder path with date placeholders (`{YYYY}`, `{MM}`, `{DD}`). Default: `Aether/Chats/{YYYY}/{MM}`. | Inline |
| Template resolution | done | `listObsidianTemplates` and `createObsidianFile` check user preference before falling back to bundled templates. | Inline |
| Header navigation update | done | Settings link in user dropdown points to `/settings/preferences` instead of `/settings/password`. | Inline |

## Detail

### Profile editing

- Name is updated via `auth.api.updateUser()` to keep session state consistent.
- Email is shown as a disabled input with a note that it cannot be changed.
- Success feedback via toast notification.

### Obsidian templates folder

- The folder picker uses a `Select` dropdown populated by `listObsidianFolders()`.
- When a vault folder is selected, `listObsidianTemplates()` reads `.md` files from that folder instead of the bundled `src/lib/obsidian/templates/` directory.
- `createObsidianFile()` resolves template content from the selected vault folder with path traversal protection.
- Falls back to bundled templates if the vault folder is empty or unreadable.
- Setting "Bundled templates (default)" clears the preference.

### Obsidian chat export folder

- A text input where users configure the folder path within the Obsidian vault where chat exports are saved.
- Supports date placeholders: `{YYYY}` (4-digit year), `{MM}` (zero-padded month), `{DD}` (zero-padded day). These are resolved at export time based on the current date.
- Default value: `Aether/Chats/{YYYY}/{MM}` — organizes exports by year and month.
- The folder is created automatically if it doesn't exist at export time.
- Stored as `obsidianChatExportFolder` in the `UserPreferences` type.
- Only shown when the Obsidian vault is configured (`OBSIDIAN_DIR`).

### Preferences storage

- Added `preferences String @default("{}")` column to the User model.
- `UserPreferences` type in `src/lib/preferences.ts` defines the shape.
- `parsePreferences()` and `serializePreferences()` handle JSON parsing/serialization.
- `updateUserPreferences` server function merges partial updates to avoid clobbering.

## Implementation

| Step | Status | Plan |
| --- | --- | --- |
| 1. Schema | done | Added `preferences` JSON column to User model in `prisma/schema.prisma`. |
| 2. Types | done | Created `src/lib/preferences.ts` with `UserPreferences` type and helpers. |
| 3. Server functions | done | Created `src/lib/preferences.functions.ts` with get/update functions. |
| 4. Preferences page | done | Created `src/routes/settings/preferences.tsx` with profile and obsidian sections. |
| 5. Header nav | done | Updated `src/components/Header.tsx` to link to `/settings/preferences`. |
| 6. Template integration | done | Updated `listObsidianTemplates` and `createObsidianFile` in `src/lib/obsidian.functions.ts`. |

## Open Questions

- Should more preferences be added (e.g., default chat model, default effort level)?
- Should the password settings page be accessible from the preferences page as a link?

## Change Log

- 2026-03-22: Added Obsidian chat export folder preference (planned) — configurable path with date placeholders for chat-to-Obsidian exports.
- 2026-03-15: Created user preferences feature with profile editing and Obsidian templates folder selection.
