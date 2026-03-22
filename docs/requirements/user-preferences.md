---
title: User Preferences
status: done
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/user-preferences.md
---

# User Preferences

## Purpose

- Problem: Users have no way to update their profile, configure application-level settings, or manage integrations like Obsidian, calendar feeds, and push notifications.
- Outcome: A centralized settings area with a sidebar-navigated multi-page layout where users can manage their profile, chat defaults, notifications, calendar feeds, Obsidian integration, board configuration, and plugins.
- Notes: Preferences are stored as a JSON column on the User model for flexibility.

## Current Reality

- Current behavior: A `/settings/` area with sidebar navigation provides separate pages for Profile, Chat, Notifications, Calendar, Password, Obsidian, Board, and Plugins. The index route redirects to `/settings/profile`.
- Constraints: Email is display-only (not editable). Obsidian and Board sections only appear when the vault is configured (`OBSIDIAN_DIR`).
- Non-goals: Image/avatar upload, email change, theme preferences (handled separately via localStorage).

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Settings layout | done | Multi-page settings area with sidebar navigation (desktop) and horizontal scrollable strip (mobile). |
| Profile editing | done | Users can update their display name and timezone. |
| Chat settings | done | Users can select a default chat model for new threads. |
| Notifications settings | done | Users can configure a Pushover user key for push notifications, with a test send button. |
| Calendar feeds | done | Users can add, edit, and remove iCal feed URLs for calendar sync, with a manual sync button. |
| Obsidian templates folder | done | Users can select a vault folder as the template source for new file creation. |
| Obsidian chat export folder | done | Users can configure a folder path (with date placeholders) where chat exports are saved. |
| Board settings | done | Users can select an Obsidian Kanban plugin file to power the Board page, and choose a column to display on the dashboard. |
| Plugins management | done | Users can enable/disable plugins, access per-plugin settings, and run health checks. |
| Password change | done | Users can change their password from the settings area. |
| Preferences storage | done | User preferences stored as JSON in the `preferences` column on the User model. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Settings layout | done | Sidebar nav on desktop, horizontal scrollable strip on mobile. Index redirects to `/settings/profile`. | Inline |
| Profile section | done | Name field (editable), email (display-only), and timezone selector in a card form. | Inline |
| Chat settings section | done | Default model selector populated from `CHAT_MODELS`. | Inline |
| Notifications section | done | Pushover user key input with save and test send buttons. | Inline |
| Calendar feeds section | done | `CalendarFeedManager` component for adding/editing/removing iCal feeds, with manual sync and sync results display. | Inline |
| Obsidian templates folder picker | done | Select dropdown of vault folders, with "Bundled templates (default)" option. | Inline |
| Obsidian chat export folder | done | Text input for chat export folder path with date placeholders (`{YYYY}`, `{MM}`, `{DD}`). Default: `Aether/Chats/{YYYY}/{MM}`. | Inline |
| Board file picker | done | Searchable vault file picker (using `searchVaultFiles`) for selecting a Kanban file, plus a column selector for dashboard display. | Inline |
| Plugins page | done | List of registered plugins with enable/disable toggles, per-plugin settings links, and health check buttons. | Inline |
| Template resolution | done | `listObsidianTemplates` and `createObsidianFile` check user preference before falling back to bundled templates. | Inline |
| Header navigation update | done | Settings link in user dropdown points to `/settings/profile`. | Inline |

## Detail

### Settings layout

- The `/settings/` route uses a layout component (`SettingsLayout`) with an `<Outlet />` for child routes.
- Desktop: a 48-width sidebar with icon + label nav items, grouped by section (general, Obsidian, plugins) with dividers.
- Mobile: a horizontal scrollable strip of pill-style nav links.
- The layout loader calls `getPreferencesPageData()` which fetches user data, preferences, and Obsidian folders. Child routes access this via `getRouteApi("/settings").useLoaderData()`.
- Nav items: Profile, Chat, Notifications, Calendar, Password (always visible); Obsidian, Board (visible when vault is configured); Plugins (always visible).

### Profile editing

- Name is updated via `auth.api.updateUser()` to keep session state consistent.
- Email is shown as a disabled input with a note that it cannot be changed.
- Timezone is selected from `Intl.supportedValuesOf("timeZone")` via a `Select` dropdown. Defaults to the browser's timezone. Stored as `timezone` in preferences.
- Success feedback via toast notification.

### Chat settings

- Default model is selected from `CHAT_MODELS` via a `Select` dropdown.
- Stored as `defaultChatModel` in preferences.
- Used when starting a new chat thread.

### Notifications settings

- Pushover user key is entered as a text input.
- A "Test send" button calls `testPushoverNotification` server function to verify the key works.
- Stored as `pushoverUserKey` in preferences.
- Leave blank to disable push notifications.

### Calendar feeds

- Uses the `CalendarFeedManager` component for managing a list of iCal feed entries (name + URL).
- A "Sync now" button calls `syncCalendarFeedsNow` and displays per-feed sync results (success/error, event count).
- Stored as `calendarFeeds` array in preferences.
- Events are available on the dashboard and to the AI.

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

### Board settings

- A searchable file picker (Combobox using `Command` component) allows selecting a Kanban plugin file from the vault via `searchVaultFiles` server function with debounced search.
- Once a Kanban file is selected, a column selector appears (populated by `getBoardData()`) to choose which column to show on the dashboard.
- Stored as `kanbanFile` and `dashboardBoardColumn` in preferences.
- A `getDashboardBoardColumn` server function is available for the dashboard to read the selected column.
- Only shown when the Obsidian vault is configured.

### Plugins management

- Located at `/settings/plugins` with a sub-route `/settings/plugins/$pluginId` for per-plugin settings.
- Lists all registered plugins with icon, name, version, and description.
- Each plugin has an enable/disable toggle via `togglePlugin` server function.
- Enabled plugins show a "Settings" link and optional "Check Health" button.
- Health check results display as colored badges (ok/warning/error).
- Plugin state stored as `enabledPlugins` and `pluginOptions` in preferences.

### Preferences storage

- Added `preferences String @default("{}")` column to the User model.
- `UserPreferences` type in `src/lib/preferences.ts` defines the shape, including: `obsidianTemplatesFolder`, `obsidianChatExportFolder`, `pushoverUserKey`, `calendarFeeds`, `kanbanFile`, `dashboardBoardColumn`, `timezone`, `defaultChatModel`, `enabledPlugins`, `pluginOptions`, `dashboardLayouts`.
- `parsePreferences()` and `serializePreferences()` handle JSON parsing/serialization.
- `updateUserPreferences` server function merges partial updates to avoid clobbering.

## Implementation

| Step | Status | Plan |
| --- | --- | --- |
| 1. Schema | done | Added `preferences` JSON column to User model in `prisma/schema.prisma`. |
| 2. Types | done | Created `src/lib/preferences.ts` with `UserPreferences` type and helpers. |
| 3. Server functions | done | Created `src/lib/preferences.functions.ts` with get/update/search functions. |
| 4. Settings layout | done | Created `src/routes/settings/route.tsx` with sidebar nav layout and `src/routes/settings/index.tsx` redirecting to profile. |
| 5. Profile page | done | Created `src/routes/settings/profile.tsx` with name, email, and timezone fields. |
| 6. Chat page | done | Created `src/routes/settings/chat.tsx` with default model selection. |
| 7. Notifications page | done | Created `src/routes/settings/notifications.tsx` with Pushover user key and test send. |
| 8. Calendar page | done | Created `src/routes/settings/calendar.tsx` with feed management and manual sync. |
| 9. Obsidian page | done | Created `src/routes/settings/obsidian.tsx` with templates folder and chat export folder. |
| 10. Board page | done | Created `src/routes/settings/board.tsx` with Kanban file picker and dashboard column selector. |
| 11. Plugins page | done | Created `src/routes/settings/plugins/index.tsx` and `src/routes/settings/plugins/$pluginId.tsx`. |
| 12. Password page | done | Existing `src/routes/settings/password.tsx` integrated into new layout. |
| 13. Header nav | done | Updated `src/components/Header.tsx` to link to `/settings/profile`. |
| 14. Template integration | done | Updated `listObsidianTemplates` and `createObsidianFile` in `src/lib/obsidian.functions.ts`. |

## Open Questions

- Should the password settings page be accessible from the preferences page as a link?

## Change Log

- 2026-03-22: Major rewrite — settings area restructured from single preferences page to multi-page layout with sidebar navigation. Added chat settings (default model), notifications (Pushover), calendar feeds, board/Kanban file picker, plugins management, and timezone selector on profile. Obsidian chat export folder now implemented. Updated all implementation steps and sub-features to reflect current state.
- 2026-03-15: Created user preferences feature with profile editing and Obsidian templates folder selection.
