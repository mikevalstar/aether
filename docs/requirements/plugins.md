---
title: Plugin System
status: done
owner: Mike
last_updated: 2026-03-22
canonical_file: docs/requirements/plugins.md
---

# Plugin System

## Purpose

- Problem: Features like IMAP, calendar, board, etc. each need AI tools, settings, activity logging, dashboard widgets, and command palette entries. Currently these are wired in ad-hoc across many files.
- Outcome: A standardized plugin interface that lets each feature declare its capabilities in one place, with a global settings page to enable/disable plugins and access their settings.
- Notes: Built-in plugins only for now (code modules in `src/plugins/`). Interface should be designed so external plugins (npm packages) are feasible later without breaking changes.

## Current Reality

- Current behavior: Features are hard-wired — tools in `ai-tools.ts`, settings nav in `settings/route.tsx`, activity types as raw strings, dashboard widgets inline in `dashboard.tsx`, command palette pages in `CommandPalette.tsx`.
- Constraints: Storage is Obsidian-first — plugins store data as Obsidian docs, not in DB tables. Plugin options (config/credentials) are stored in user preferences.
- Non-goals: External plugin loading, plugin marketplace, per-plugin DB migrations, plugin sandboxing.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Plugin interface | done | TypeScript interface that plugins implement to declare capabilities |
| Plugin registry | done | Central registry that discovers and manages all plugins |
| Plugin settings page | done | Global `/settings/plugins` page listing all plugins with enable/disable toggles |
| Per-plugin settings | done | Each plugin can declare a settings component, rendered at `/settings/plugins/[id]` |
| AI tools integration | done | Plugins can supply tools that are merged into `createAiTools()` |
| Activity items | done | Plugins can log typed activity items via a provided context |
| Dashboard widgets | done | Plugins can supply dashboard widget components |
| Command palette | done | Plugins can register pages/actions in the command palette |
| Plugin options storage | done | Plugin-specific options stored in user preferences JSON |
| Test connection | done | Per-plugin settings page offers a "Test Connection" button for plugins with health checks |

## Plugin Interface

### Core Types

The plugin interface is split into two parts to respect the server/client boundary. A plugin exports a **server definition** (tools, health checks, lifecycle, widget loaders) and a **client definition** (React components, commands). This prevents server code from leaking into the client bundle.

```typescript
import type { ToolSet } from "ai";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

// ─── Shared types (imported by both server and client) ───

type PluginHealthStatus = {
  status: "ok" | "error" | "warning";
  message?: string; // e.g., "Connected", "Auth failed", "3 unread"
};

/** Metadata — identifies the plugin in the UI and registry */
type PluginMeta = {
  /** Unique identifier, underscore_case (e.g., "imap_email") */
  id: string;
  /** Display name shown in settings */
  name: string;
  /** One-line description */
  description: string;
  /** Icon for nav/settings/palette */
  icon: LucideIcon;
  /** Semver version string */
  version: string;
  /** Whether this plugin has a server-side health check */
  hasHealthCheck?: boolean;
};

type PluginActivityParams = {
  type: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

/** Declared activity type — used to build filter chips in the activity page */
type PluginActivityType = {
  type: string;    // the raw type string (will be prefixed with plugin:{id}:)
  label: string;   // display label for filter chip
  icon?: LucideIcon;
};

/** Options schema — defines the settings form for this plugin */
type PluginOptionField = {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "boolean" | "select";
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  options?: { label: string; value: string }[]; // for select type
};

// ─── Server-side types ───

/** Context passed to server-side plugin functions */
type PluginContext = {
  userId: string;
  threadId?: string;
  timezone?: string;
  /** Relative path to the AI config folder within the Obsidian vault */
  aiConfigFolder: string;
  /** Relative path to the AI memory folder within the Obsidian vault */
  aiMemoryFolder: string;
  /** Read this plugin's stored options */
  getOptions: <T = Record<string, unknown>>() => Promise<T>;
  /** Obsidian helpers — read/write/edit/search docs */
  obsidian: ObsidianPluginContext;
  /** Log an activity item */
  logActivity: (params: PluginActivityParams) => Promise<void>;
};

/** Server-side plugin definition */
type AetherPluginServer = {
  /** Return AI tools for this plugin (optional) */
  createTools?: (ctx: PluginContext) => ToolSet;

  /** System prompt snippet — injected when this plugin is enabled so the AI knows about the tools */
  systemPrompt?: string;

  /** Server-side data loader for dashboard widgets (optional) */
  loadWidgetData?: (ctx: PluginContext) => Promise<Record<string, unknown>>;

  /** Health check — returns status for the plugins settings page (optional) */
  checkHealth?: (ctx: PluginContext) => Promise<PluginHealthStatus>;

  /** Called once when plugin is enabled — setup, validate config (optional) */
  onEnable?: (ctx: PluginContext) => Promise<void>;

  /** Called once when plugin is disabled — cleanup (optional) */
  onDisable?: (ctx: PluginContext) => Promise<void>;
};

// ─── Client-side types ───

/** Client-side plugin context — available to widgets, commands, and settings */
type PluginClientContext = {
  pluginId: string;
  options: Record<string, unknown>;
  /** Server functions for Obsidian access from client components */
  obsidian: {
    read: (path: string) => Promise<string | null>;
    write: (path: string, content: string) => Promise<void>;
    list: (folder: string) => Promise<string[]>;
    search: (query: string) => Promise<string[]>;
  };
  /** Log an activity item from the client side */
  logActivity: (params: PluginActivityParams) => Promise<void>;
};

/** Command palette entry */
type PluginCommand = {
  label: string;
  icon?: LucideIcon;
  /** Route to navigate to, or action callback (receives client context) */
  route?: string;
  action?: (ctx: PluginClientContext) => void | Promise<void>;
};

/** Dashboard widget declaration */
type PluginWidget = {
  id: string;
  label: string;
  /** "quarter" = one-quarter width, "half" = half, "three-quarter" = three-quarters, "full" = full width */
  size: "quarter" | "half" | "three-quarter" | "full";
  /** React component — receives client context + server-loaded data */
  component: ComponentType<{
    ctx: PluginClientContext;
    data: Record<string, unknown>;
  }>;
};

/** Client-side plugin definition */
type AetherPluginClient = {
  /** Custom settings component — rendered below the auto-generated options form (optional) */
  SettingsComponent?: ComponentType<{
    ctx: PluginClientContext;
    onSave: (options: Record<string, unknown>) => Promise<void>;
  }>;

  /** Dashboard widgets (optional) */
  widgets?: PluginWidget[];

  /** Command palette entries (optional) */
  commands?: PluginCommand[];
};

// ─── Combined plugin definition ───

/** The full plugin — assembled from meta + server + client parts */
type AetherPlugin = {
  meta: PluginMeta;

  /** Options schema for the auto-generated settings form (optional) */
  optionFields?: PluginOptionField[];

  /** Activity types this plugin can produce — used for filter chips in activity page */
  activityTypes?: PluginActivityType[];

  /** Server-side capabilities (tools, loaders, health, lifecycle) */
  server?: AetherPluginServer;

  /** Client-side capabilities (components, commands) */
  client?: AetherPluginClient;
};
```

### Registration Pattern

Each plugin has two entry points to maintain the server/client boundary: a client-safe `index.ts` (no server imports) and a full `index.server.ts` (includes server definition). The registry mirrors this split:

```typescript
// src/plugins/imap_email/index.ts — client-safe export (no server imports)
import type { AetherPlugin } from "../types";
import { imapClient } from "./client";
import { imapActivityTypes, imapMeta, imapOptionFields } from "./meta";

export const imapPlugin: AetherPlugin = {
  meta: imapMeta,
  optionFields: imapOptionFields,
  activityTypes: imapActivityTypes,
  client: imapClient,
};

// src/plugins/imap_email/index.server.ts — full plugin with server capabilities
import type { AetherPlugin } from "../types";
import { imapClient } from "./client";
import { imapActivityTypes, imapMeta, imapOptionFields } from "./meta";
import { imapServer } from "./server";

export const imapPluginFull: AetherPlugin = {
  meta: imapMeta,
  optionFields: imapOptionFields,
  activityTypes: imapActivityTypes,
  server: imapServer,
  client: imapClient,
};

// src/plugins/imap_email/server.ts — only server-side code
export const imapServer: AetherPluginServer = {
  createTools: (ctx) => ({ ... }),
  systemPrompt: "You have access to email tools. Use imap_email_* tools when ...",
  loadWidgetData: async (ctx) => ({ unreadCount: 3, ... }),
  checkHealth: async (ctx) => ({ status: "ok", message: "Connected" }),
};

// src/plugins/imap_email/client.tsx — only client components
export const imapClient: AetherPluginClient = {
  widgets: [{ id: "inbox", label: "Inbox", size: "quarter", component: InboxWidget }],
  commands: [{ label: "Email Settings", icon: Mail, route: "/settings/plugins/imap_email" }],
};
```

```typescript
// src/plugins/index.ts — client-safe registry (no server imports)
import { imapPlugin } from "./imap_email";
import { apiBalancesPlugin } from "./api_balances";

/** All available plugins. Add new plugins here. */
export const plugins: AetherPlugin[] = [
  imapPlugin,
  apiBalancesPlugin,
];

// Lookup helpers (client-safe)
export function getPlugin(id: string): AetherPlugin | undefined;
export function getEnabledPlugins(userPrefs: UserPreferences): AetherPlugin[];
export function getPluginActivityTypes(userPrefs: UserPreferences): PluginActivityType[];

// src/plugins/index.server.ts — server-side registry with full plugin capabilities
export function getPluginTools(userId: string, threadId: string, timezone: string | undefined, prefs: UserPreferences): ToolSet;
export function getPluginSystemPrompts(prefs: UserPreferences): string[];
export function getPluginWidgetData(userId: string, prefs: UserPreferences): Promise<Record<string, Record<string, unknown>>>;
export function checkPluginHealth(pluginId: string, userId: string): Promise<PluginHealthStatus>;
```

### Options Storage

Plugin options live in `UserPreferences` under a `pluginOptions` key:

```typescript
type UserPreferences = {
  // ... existing fields ...
  enabledPlugins?: string[];  // plugin IDs
  pluginOptions?: Record<string, Record<string, unknown>>;
  // e.g. { "imap_email": { host: "127.0.0.1", port: 1143, ... } }
};
```

### Known Limitations

- **Plaintext secrets**: Plugin options (including passwords, API keys) are stored as plaintext JSON in the SQLite `preferences` column. Acceptable for a personal single-user dashboard; not suitable for multi-user without encryption.

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Plugin interface types | done | Shared, server, and client types in `src/plugins/types.ts` | Inline |
| Plugin registry | done | Client-safe `src/plugins/index.ts` + server-side `src/plugins/index.server.ts` with discovery helpers | Inline |
| Server/client split | done | Plugin definition split into `index.ts` (client-safe) + `index.server.ts` (full) per plugin, mirrored in registry | Inline |
| Global plugins settings page | done | `/settings/plugins` — list all plugins, toggle enable/disable, health badges | Inline |
| Per-plugin settings page | done | `/settings/plugins/$pluginId` — render option fields + custom component with full client context | Inline |
| Test connection | done | Per-plugin settings page has a "Test Connection" button for plugins with `hasHealthCheck`; calls `testPluginConnection` server function | Inline |
| AI tools integration | done | `createAiTools()` calls server registry to merge enabled plugin tools | Inline |
| System prompt integration | done | Plugin system prompts injected into `/api/chat` so AI knows about plugin tools | Inline |
| Activity integration | done | `logActivity` in PluginContext creates `ActivityLog` with plugin-prefixed type; declared activity types for filter chips | Inline |
| Dashboard integration | done | Dashboard loader calls plugin `loadWidgetData()`, passes data + context to widget components | Inline |
| Command palette integration | done | CommandPalette queries all registered plugins for commands | Inline |
| Settings nav update | done | Add "Plugins" section to settings sidebar | Inline |
| Plugin health check | done | Status indicator on plugins settings page for plugins with external connections | Inline |
| Plugin client context factory | done | `plugin-client-context.ts` creates stub `PluginClientContext` for widget rendering | Inline |
| Dashboard plugin loader | done | `dashboard.functions.ts` server function loads widget data + metadata for dashboard route | Inline |
| IMAP plugin (first plugin) | done | Proton Mail IMAP integration as first plugin | `docs/requirements/plugin-imap.md` |
| API Balances plugin | done | Balance/credit dashboard widget for OpenRouter, OpenAI, Kilo Code | `docs/requirements/plugin-api-balances.md` |

## Detail

### Global Plugins Settings Page

- Route: `/settings/plugins`
- Shows a card for each registered plugin with: icon, name, description, version, enable/disable toggle
- Enabled plugins show a "Settings" link to `/settings/plugins/$pluginId`
- Enabled plugins with `hasHealthCheck` show a "Check Health" button that fetches status on-demand
- Added to settings sidebar nav as a new section (below current items, with divider)

### Per-Plugin Settings Page

- Route: `/settings/plugins/$pluginId`
- Auto-generates form fields from `optionFields` schema (text inputs, toggles, selects, password fields)
- Renders plugin's `SettingsComponent` below the auto-form if provided
- Save button calls `updateUserPreferences` to persist under `pluginOptions[pluginId]`
- Plugins with `hasHealthCheck` get a "Test Connection" button next to Save that calls `testPluginConnection` with the current (unsaved) form values and shows inline success/failure feedback

### AI Tools Integration

- `createAiTools()` receives user preferences, calls `getPluginTools()` from the server registry
- Each plugin's tools are prefixed with plugin id: `{pluginId}_{toolName}` to avoid collisions (e.g., `imap_email_list_inbox`)
- Only enabled plugins contribute tools
- Plugin IDs must use underscore_case to keep tool names consistent (no mixed dashes/underscores)

### System Prompt Integration

- Each plugin can declare a `systemPrompt` string in its server definition
- `getPluginSystemPrompts()` collects prompts from all enabled plugins
- Prompts are appended to the system prompt in the `/api/chat` endpoint under a `## Plugins` section, after skills
- Example: `"You have access to email tools. Use imap_email_list_inbox to check the inbox, imap_email_read to read a specific message."`

### Activity Integration

- `PluginContext.logActivity()` creates an `ActivityLog` record
- Type is prefixed: `plugin:{pluginId}:{type}` (e.g., `plugin:imap_email:email_check`)
- Plugins declare their activity types via `activityTypes` on the plugin definition
- Activity page reads declared types from all registered plugins to build dynamic filter chips (alongside hard-coded built-in types)

### Dashboard Widgets

- Dashboard route loader calls `loadDashboardPluginWidgets()` server function, which calls `server.loadWidgetData(ctx)` for each enabled plugin that declares widgets
- Widget data is passed alongside `PluginClientContext` to the widget component as `{ ctx, data }`
- `PluginClientContext` for widgets is created via `createPluginClientContextFromOptions()` with stub obsidian/activity methods — widgets should use server-loaded data instead
- This avoids client-side fetch waterfalls — widget data arrives with the page
- Widgets rendered via `DashboardGrid` in a responsive layout, after built-in widgets
- Widget sizes support four options: `"quarter"`, `"half"`, `"three-quarter"`, `"full"`

### Command Palette Integration

- `CommandPalette` iterates over all registered plugins for commands (not filtered by enabled state)
- Plugin commands appear in a "Plugins" group in the palette
- Commands can be routes (navigate) or actions (execute callback)

### Plugin Health Check

- Plugins that connect to external services can implement `checkHealth()` and set `meta.hasHealthCheck = true`
- Called on-demand when the user clicks "Check Health" on the `/settings/plugins` page (not automatic on page load)
- Status shown as a badge on the plugin card: green dot (ok), yellow (warning), red (error) + optional message
- Example: IMAP plugin returns `{ status: "ok", message: "Connected — 3 unread" }` or `{ status: "error", message: "Connection failed" }`

### Test Connection

- The per-plugin settings page shows a "Test Connection" button alongside the save button for plugins with `hasHealthCheck`
- Tests use the current form values (not yet saved), so users can verify credentials before persisting
- `testPluginConnection` server function dispatches to plugin-specific test implementations (hardcoded switch on plugin ID)
- Results shown inline with success/failure icon and message

### ObsidianPluginContext

Plugins get a scoped Obsidian helper rather than raw filesystem access:

```typescript
type ObsidianPluginContext = {
  read: (path: string) => Promise<string | null>;
  write: (path: string, content: string) => Promise<void>;
  edit: (path: string, oldText: string, newText: string) => Promise<void>;
  list: (folder: string) => Promise<string[]>;
  search: (query: string) => Promise<string[]>;
};
```

This reuses existing obsidian tool internals but provides a clean API. Paths are relative to the Obsidian vault root. Path traversal is guarded — paths that resolve outside the vault root are rejected.

## File Structure

```
src/plugins/
  types.ts                # Shared, server, client types (AetherPlugin, etc.)
  index.ts                # Client-safe registry + lookup helpers
  index.server.ts         # Server-side registry (tools, prompts, widget data, health)
  plugin-context.ts       # PluginContext factory (server-side, with Obsidian + activity)
  plugin-client-context.ts # PluginClientContext factory (stub for widget rendering)
  plugins.functions.ts    # TanStack server functions for settings pages (CRUD, health, test)
  dashboard.functions.ts  # TanStack server function for loading plugin widget data
  imap_email/
    index.ts              # Client-safe AetherPlugin export (no server imports)
    index.server.ts       # Full AetherPlugin export (includes server definition)
    meta.ts               # PluginMeta, optionFields, activityTypes (shared)
    server.ts             # AetherPluginServer (tools, systemPrompt, loader, health)
    client.tsx            # AetherPluginClient (widgets, commands)
    lib/                  # IMAP client, parsing, etc.
  api_balances/
    index.ts              # Client-safe AetherPlugin export
    index.server.ts       # Full AetherPlugin export (includes server definition)
    meta.ts               # PluginMeta, optionFields, activityTypes
    server.ts             # AetherPluginServer (tools, systemPrompt, loader, health)
    client.tsx            # AetherPluginClient (widgets, commands)
    lib/                  # Balance fetchers, cache, types, test connection
```

## Open Questions

None currently — all resolved.

## Resolved Questions

- ~~Should plugin widgets have a user-configurable order/visibility on the dashboard?~~ No — just append after built-in widgets for now.
- ~~External plugin loading mechanism?~~ Dynamic `import()` — plugin authors export a default `AetherPlugin` from an npm package.
- ~~Server/client boundary?~~ Split plugin definition into `AetherPluginServer` + `AetherPluginClient`, assembled in a combined `AetherPlugin`.
- ~~Plugin ID format?~~ underscore_case to keep AI tool names consistent (`{pluginId}_{toolName}`).
- ~~Secret storage?~~ Plaintext in preferences JSON — acceptable for single-user, documented as known limitation.

## Change Log

- 2026-03-21: Initial requirements drafted
- 2026-03-21: Added server/client split, system prompt integration, widget data loaders, declared activity types, underscore IDs, full client context for settings, health check, plaintext secrets caveat
- 2026-03-21: Marked all requirements and sub-features as done. Full plugin system implemented with registry, settings pages, AI tool integration, system prompt injection, activity logging, dashboard widgets, command palette, health checks. Two plugins shipped: IMAP Email and API Balances.
- 2026-03-22: Added `aiConfigFolder` and `aiMemoryFolder` strings to PluginContext so plugins know which Obsidian folders to use for AI config and memory.
- 2026-03-22: Updated docs to match actual implementation: added `hasHealthCheck` to PluginMeta, expanded widget sizes to quarter/half/three-quarter/full, fixed PluginOptionField.default type, documented dual index.ts/index.server.ts pattern per plugin and registry, added test connection feature, documented plugin-client-context.ts and dashboard.functions.ts, corrected command palette and activity filter behavior (all plugins, not just enabled), added api_balances file structure.
