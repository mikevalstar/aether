---
title: Plugin System
status: todo
owner: Mike
last_updated: 2026-03-21
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
| Plugin interface | todo | TypeScript interface that plugins implement to declare capabilities |
| Plugin registry | todo | Central registry that discovers and manages all plugins |
| Plugin settings page | todo | Global `/settings/plugins` page listing all plugins with enable/disable toggles |
| Per-plugin settings | todo | Each plugin can declare a settings component, rendered at `/settings/plugins/[id]` |
| AI tools integration | todo | Plugins can supply tools that are merged into `createAiTools()` |
| Activity items | todo | Plugins can log typed activity items via a provided context |
| Dashboard widgets | todo | Plugins can supply dashboard widget components |
| Command palette | todo | Plugins can register pages/actions in the command palette |
| Plugin options storage | todo | Plugin-specific options stored in user preferences JSON |

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
  default?: unknown;
  options?: { label: string; value: string }[]; // for select type
};

// ─── Server-side types ───

/** Context passed to server-side plugin functions */
type PluginContext = {
  userId: string;
  threadId?: string;
  timezone?: string;
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
  /** "half" = one column, "full" = spans both columns */
  size: "half" | "full";
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

Each plugin exports its parts from separate files to maintain the server/client boundary:

```typescript
// src/plugins/imap_email/index.ts — re-exports the combined plugin
import type { AetherPlugin } from "../types";
import { imapClient } from "./client";
import { imapMeta, imapOptionFields, imapActivityTypes } from "./meta";
import { imapServer } from "./server";

export const imapPlugin: AetherPlugin = {
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
  SettingsComponent: ImapSettings,
  widgets: [{ id: "inbox", label: "Inbox", size: "half", component: InboxWidget }],
  commands: [{ label: "Check Email", icon: Mail, route: "/email" }],
};
```

```typescript
// src/plugins/index.ts — plugin registry
import { imapPlugin } from "./imap_email";

/** All available plugins. Add new plugins here. */
export const plugins: AetherPlugin[] = [
  imapPlugin,
];

// Lookup helpers
export function getPlugin(id: string): AetherPlugin | undefined;
export function getEnabledPlugins(userPrefs: UserPreferences): AetherPlugin[];
export function getPluginTools(ctx: PluginContext, userPrefs: UserPreferences): ToolSet;
export function getPluginSystemPrompts(userPrefs: UserPreferences): string[];
export function getPluginActivityTypes(userPrefs: UserPreferences): PluginActivityType[];
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
| Plugin interface types | todo | Shared, server, and client types in `src/plugins/types.ts` | Inline |
| Plugin registry | todo | Central `src/plugins/index.ts` with discovery helpers | Inline |
| Server/client split | todo | Plugin definition split into server + client parts to respect bundle boundary | Inline |
| Global plugins settings page | todo | `/settings/plugins` — list all plugins, toggle enable/disable, health badges | Inline |
| Per-plugin settings page | todo | `/settings/plugins/$pluginId` — render option fields + custom component with full client context | Inline |
| AI tools integration | todo | `createAiTools()` calls registry to merge enabled plugin tools | Inline |
| System prompt integration | todo | Plugin system prompts injected into `/api/chat` so AI knows about plugin tools | Inline |
| Activity integration | todo | `logActivity` in PluginContext creates `ActivityLog` with plugin-prefixed type; declared activity types for filter chips | Inline |
| Dashboard integration | todo | Dashboard loader calls plugin `loadWidgetData()`, passes data + context to widget components | Inline |
| Command palette integration | todo | CommandPalette queries enabled plugins for commands | Inline |
| Settings nav update | todo | Add "Plugins" section to settings sidebar | Inline |
| Plugin health check | todo | Status indicator on plugins settings page for plugins with external connections | Inline |
| IMAP plugin (first plugin) | todo | Proton Mail IMAP integration as first plugin | `docs/requirements/plugin-imap.md` |
| API Balances plugin | todo | Balance/credit dashboard widget for OpenRouter, OpenAI, Kilo Code | `docs/requirements/plugin-api-balances.md` |

## Detail

### Global Plugins Settings Page

- Route: `/settings/plugins`
- Shows a card for each registered plugin with: icon, name, description, version, enable/disable toggle
- Enabled plugins show a "Settings" link to `/settings/plugins/$pluginId`
- Added to settings sidebar nav as a new section (below current items, with divider)

### Per-Plugin Settings Page

- Route: `/settings/plugins/$pluginId`
- Auto-generates form fields from `optionFields` schema (text inputs, toggles, selects, password fields)
- Renders plugin's `SettingsComponent` below the auto-form if provided
- Save button calls `updateUserPreferences` to persist under `pluginOptions[pluginId]`

### AI Tools Integration

- `createAiTools()` receives user preferences, calls `getPluginTools()` from registry
- Each plugin's tools are prefixed with plugin id: `{pluginId}_{toolName}` to avoid collisions (e.g., `imap_email_list_inbox`)
- Only enabled plugins contribute tools
- Plugin IDs must use underscore_case to keep tool names consistent (no mixed dashes/underscores)

### System Prompt Integration

- Each plugin can declare a `systemPrompt` string in its server definition
- `getPluginSystemPrompts()` collects prompts from all enabled plugins
- Prompts are appended to the system prompt in the `/api/chat` endpoint, after skills
- Example: `"You have access to email tools. Use imap_email_list_inbox to check the inbox, imap_email_read to read a specific message."`

### Activity Integration

- `PluginContext.logActivity()` creates an `ActivityLog` record
- Type is prefixed: `plugin:{pluginId}:{type}` (e.g., `plugin:imap_email:new_mail`)
- Plugins declare their activity types via `activityTypes` on the plugin definition
- Activity page reads declared types from enabled plugins to build dynamic filter chips (alongside hard-coded built-in types)

### Dashboard Widgets

- Dashboard route loader calls `server.loadWidgetData(ctx)` for each enabled plugin that declares widgets
- Widget data is passed alongside `PluginClientContext` to the widget component as `{ ctx, data }`
- This avoids client-side fetch waterfalls — widget data arrives with the page
- Widgets rendered in the existing two-column layout, after built-in widgets

### Command Palette Integration

- `CommandPalette` queries enabled plugins for commands
- Plugin commands appear in a "Plugins" group in the palette
- Commands can be routes (navigate) or actions (execute callback)

### Plugin Health Check

- Plugins that connect to external services can implement `checkHealth()`
- Called on-demand when the `/settings/plugins` page loads (not polled)
- Status shown as a badge on the plugin card: green dot (ok), yellow (warning), red (error) + optional message
- Example: IMAP plugin returns `{ status: "ok", message: "Connected — 3 unread" }` or `{ status: "error", message: "Auth failed" }`

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

This reuses existing obsidian tool internals but provides a clean API. Paths are relative to the Obsidian vault root.

## File Structure

```
src/plugins/
  types.ts              # Shared, server, client types (AetherPlugin, etc.)
  index.ts              # Registry + lookup helpers
  plugin-context.ts     # PluginContext + PluginClientContext factories
  imap_email/
    index.ts            # Combined AetherPlugin export (imports meta + server + client)
    meta.ts             # PluginMeta, optionFields, activityTypes (shared)
    server.ts           # AetherPluginServer (tools, systemPrompt, loader, health)
    client.tsx          # AetherPluginClient (widgets, commands, SettingsComponent)
    lib/                # IMAP client, parsing, etc.
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
