# Plugin Authoring Guide

How to build a plugin for Aether.

## Overview

A plugin is a set of TypeScript files in `src/plugins/<plugin_id>/` that declares metadata, configuration, server-side capabilities (AI tools, health checks, widget data), and client-side UI (dashboard widgets, settings components, command palette entries).

Plugins are **built-in modules** — they live in the repo and are registered in the plugin registry at `src/plugins/index.ts`.

## File Structure

Every plugin follows this structure:

```
src/plugins/my_plugin/
  meta.ts            # Metadata, option fields, activity types
  index.ts           # Client-safe export (no server code)
  index.server.ts    # Full export including server code
  server.ts          # Server-side: AI tools, health checks, widget data loaders
  client.tsx         # Client-side: widgets, commands, settings component
  lib/               # (optional) Helper modules, API clients, etc.
```

The **dual export pattern** (`index.ts` vs `index.server.ts`) keeps server-only code out of the browser bundle.

## Step 1: Define Metadata (`meta.ts`)

Every plugin starts with metadata, option fields, and activity types.

```typescript
import { Sparkles } from "lucide-react";
import type {
  PluginActivityType,
  PluginMeta,
  PluginOptionField,
} from "../types";

export const myPluginMeta: PluginMeta = {
  id: "my_plugin",           // underscore_case, used as tool prefix
  name: "My Plugin",         // display name in settings
  description: "Does something useful",
  icon: Sparkles,            // any Lucide icon
  version: "0.1.0",
  hasHealthCheck: true,      // set true if you implement checkHealth()
};

// Configuration fields — auto-rendered as a form on the plugin settings page
export const myPluginOptionFields: PluginOptionField[] = [
  {
    key: "apiKey",
    label: "API Key",
    type: "password",
    required: true,
    description: "Your API key for the service",
  },
  {
    key: "enabled",
    label: "Enable",
    type: "boolean",
    default: true,
  },
  {
    key: "mode",
    label: "Mode",
    type: "select",
    options: [
      { label: "Fast", value: "fast" },
      { label: "Thorough", value: "thorough" },
    ],
    default: "fast",
  },
];

// Activity types this plugin produces — used for filter chips on the activity page
export const myPluginActivityTypes: PluginActivityType[] = [
  { type: "sync", label: "Sync", icon: Sparkles },
];
```

**Option field types:** `text`, `password`, `number`, `boolean`, `select`

**Plugin ID rules:**
- Must be `underscore_case` (e.g., `api_balances`, `imap_email`)
- Used as the AI tool prefix — tools become `my_plugin_do_thing`
- Used as the options storage key in user preferences

## Step 2: Server-Side Implementation (`server.ts`)

The server definition provides AI tools, system prompts, widget data loading, and health checks.

```typescript
import { tool } from "ai";
import { z } from "zod";
import type { AetherPluginServer } from "../types";

export const myPluginServer: AetherPluginServer = {
  // Instructions for the AI model about your tools
  systemPrompt: `You have access to My Plugin tools.
Use my_plugin_do_thing when the user asks about...`,

  // AI tools — each key becomes {pluginId}_{key} in the chat
  createTools(ctx) {
    return {
      do_thing: tool({
        description: "Does something useful",
        parameters: z.object({
          query: z.string().describe("What to look up"),
        }),
        execute: async ({ query }) => {
          const options = await ctx.getOptions<{ apiKey: string }>();
          // ... call your API, do work ...

          // Log activity
          await ctx.logActivity({
            type: "sync",
            summary: `Looked up: ${query}`,
            metadata: { query },
          });

          return { result: "some data" };
        },
      }),
    };
  },

  // Data for dashboard widgets — loaded server-side to avoid client fetch waterfalls
  async loadWidgetData(ctx) {
    const options = await ctx.getOptions<{ apiKey: string }>();
    if (!options.apiKey) {
      return { configured: false };
    }
    // ... fetch data ...
    return { configured: true, count: 42 };
  },

  // Health check — shown on the plugin settings page
  async checkHealth(ctx) {
    const options = await ctx.getOptions<{ apiKey: string }>();
    if (!options.apiKey) {
      return { status: "warning", message: "No API key configured" };
    }
    try {
      // ... test connection ...
      return { status: "ok", message: "Connected" };
    } catch {
      return { status: "error", message: "Connection failed" };
    }
  },

  // Optional lifecycle hooks
  // async onEnable(ctx) { /* setup */ },
  // async onDisable(ctx) { /* cleanup */ },
};
```

### PluginContext

Your server functions receive a `PluginContext` with:

| Property | Description |
|----------|-------------|
| `userId` | Current user's ID |
| `threadId` | Current chat thread ID (if in chat context) |
| `timezone` | User's timezone |
| `getOptions<T>()` | Read this plugin's stored options |
| `obsidian.read(path)` | Read a file from the Obsidian vault |
| `obsidian.write(path, content)` | Write a file to the vault |
| `obsidian.edit(path, old, new)` | Find-and-replace in a vault file |
| `obsidian.list(folder)` | List files in a vault folder |
| `obsidian.search(query)` | Search the vault |
| `logActivity(params)` | Log an activity event (auto-prefixed with `plugin:{id}:`) |

## Step 3: Client-Side Implementation (`client.tsx`)

The client definition provides dashboard widgets, command palette entries, and an optional custom settings component.

```typescript
import { Sparkles } from "lucide-react";
import type {
  AetherPluginClient,
  PluginClientContext,
  PluginWidget,
} from "../types";

// Dashboard widget component
function MyWidget({
  ctx,
  data,
}: { ctx: PluginClientContext; data: Record<string, unknown> }) {
  if (!data.configured) {
    return <p className="text-muted-foreground text-sm">Not configured</p>;
  }
  return (
    <div>
      <p className="text-2xl font-bold">{data.count as number}</p>
    </div>
  );
}

const myWidget: PluginWidget = {
  id: "summary",
  label: "My Plugin",
  size: "half", // "quarter" | "half" | "three-quarter" | "full"
  component: MyWidget,
};

export const myPluginClient: AetherPluginClient = {
  // Dashboard widgets
  widgets: [myWidget],

  // Command palette entries
  commands: [
    {
      label: "My Plugin Settings",
      icon: Sparkles,
      route: "/settings/plugins/my_plugin",
    },
  ],

  // Optional: custom settings UI rendered below the auto-generated form
  // SettingsComponent: MyCustomSettings,
};
```

### Widget Sizes

| Size | Description |
|------|-------------|
| `quarter` | Quarter width |
| `half` | Half width (one column) |
| `three-quarter` | Three-quarter width |
| `full` | Full width (spans both columns) |

## Step 4: Wire Up Exports

### Client-safe export (`index.ts`)

```typescript
import type { AetherPlugin } from "../types";
import { myPluginClient } from "./client";
import {
  myPluginActivityTypes,
  myPluginMeta,
  myPluginOptionFields,
} from "./meta";

export const myPlugin: AetherPlugin = {
  meta: myPluginMeta,
  optionFields: myPluginOptionFields,
  activityTypes: myPluginActivityTypes,
  client: myPluginClient,
};
```

### Full export (`index.server.ts`)

```typescript
import type { AetherPlugin } from "../types";
import { myPluginClient } from "./client";
import {
  myPluginActivityTypes,
  myPluginMeta,
  myPluginOptionFields,
} from "./meta";
import { myPluginServer } from "./server";

export const myPluginFull: AetherPlugin = {
  meta: myPluginMeta,
  optionFields: myPluginOptionFields,
  activityTypes: myPluginActivityTypes,
  server: myPluginServer,
  client: myPluginClient,
};
```

## Step 5: Register the Plugin

Add your plugin to both registries.

### `src/plugins/index.ts` (client registry)

```typescript
import { myPlugin } from "./my_plugin";

export const plugins: AetherPlugin[] = [
  imapPlugin,
  apiBalancesPlugin,
  myPlugin,           // add here
];
```

### `src/plugins/index.server.ts` (server registry)

```typescript
import { myPluginFull } from "./my_plugin/index.server";

const serverPlugins: AetherPlugin[] = [
  imapPluginFull,
  apiBalancesPluginFull,
  myPluginFull,       // add here
];
```

That's it — the plugin system handles the rest:
- Options form auto-rendered at `/settings/plugins/my_plugin`
- AI tools merged into chat with `my_plugin_` prefix
- System prompt injected into chat context
- Widgets appear on the dashboard
- Commands appear in the command palette
- Activity events show up with filter chips on the activity page
- Health check badge shown on the plugins settings page

## Tips

- **Graceful errors**: Tools should return error objects rather than throwing. Widget `loadWidgetData` should catch errors and return `{ error: true, message: "..." }`.
- **Caching**: For expensive API calls, use an in-memory cache with TTL (see `api_balances/lib/balance-cache.ts` for a pattern).
- **Testing connections**: If your plugin connects to external services, add a test handler in `plugins.functions.ts` under `testPluginConnection()`.
- **Secrets**: Plugin options (including API keys) are stored as plaintext JSON in SQLite. This is fine for a single-user dashboard but not suitable for multi-user.

## Reference Plugins

Look at these existing plugins for real-world examples:

- **`api_balances/`** — Simple plugin: fetches API balances, caches results, renders a widget. Good starting point.
- **`imap_email/`** — Full-featured plugin: multiple AI tools, health checks, widget with data loading, activity logging.
