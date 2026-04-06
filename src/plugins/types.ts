import type { ToolSet } from "ai";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

// ─── Shared types (imported by both server and client) ───

export type PluginHealthStatus = {
  status: "ok" | "error" | "warning";
  message?: string;
};

export type PluginMeta = {
  /** Unique identifier, underscore_case (e.g., "imap_email") */
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  version: string;
  /** Whether this plugin has a server-side health check */
  hasHealthCheck?: boolean;
};

export type PluginActivityParams = {
  type: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export type PluginActivityType = {
  type: string;
  label: string;
  icon?: LucideIcon;
};

export type PluginOptionField = {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "boolean" | "select";
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
};

// ─── Trigger types ───

export type PluginTriggerType = {
  /** Trigger type key — will be namespaced as {pluginId}:{type} */
  type: string;
  /** Display label, e.g., "New Email Received" */
  label: string;
  /** Description of what this trigger fires on — shown in unconfigured triggers UI */
  description: string;
  /** Markdown instructions: what {{details}} looks like, tips for writing prompts */
  instructions?: string;
};

// ─── Scheduled task types ───

export type PluginScheduledTask = {
  /** Unique name for the task (will be prefixed as plugin:{pluginId}:{name}) */
  name: string;
  /** Cron expression (5-field) */
  cron: string;
  /** Handler called on each tick — receives plugin context */
  handler: (ctx: PluginContext) => Promise<void>;
};

// ─── Server-side types ───

export type ObsidianPluginContext = {
  read: (path: string) => Promise<string | null>;
  write: (path: string, content: string) => Promise<void>;
  edit: (path: string, oldText: string, newText: string) => Promise<void>;
  list: (folder: string) => Promise<string[]>;
  search: (query: string) => Promise<string[]>;
};

export type PluginContext = {
  userId: string;
  threadId?: string;
  timezone?: string;
  /** Relative path to the AI config folder within the Obsidian vault */
  aiConfigFolder: string;
  /** Relative path to the AI memory folder within the Obsidian vault */
  aiMemoryFolder: string;
  getOptions: <T = Record<string, unknown>>() => Promise<T>;
  obsidian: ObsidianPluginContext;
  logActivity: (params: PluginActivityParams) => Promise<void>;
  /** Fire a trigger event — dispatches to all matching trigger configs. Type is auto-prefixed with pluginId. */
  fireTrigger: (type: string, payload: Record<string, unknown>) => void;
};

export type AetherPluginServer = {
  createTools?: (ctx: PluginContext) => ToolSet;
  systemPrompt?: string;
  loadWidgetData?: (ctx: PluginContext) => Promise<Record<string, unknown>>;
  checkHealth?: (ctx: PluginContext) => Promise<PluginHealthStatus>;
  onEnable?: (ctx: PluginContext) => Promise<void>;
  onDisable?: (ctx: PluginContext) => Promise<void>;
  /** Recurring scheduled tasks this plugin needs (e.g., polling for new data) */
  scheduledTasks?: PluginScheduledTask[];
};

// ─── Client-side types ───

export type PluginClientContext = {
  pluginId: string;
  options: Record<string, unknown>;
  obsidian: {
    read: (path: string) => Promise<string | null>;
    write: (path: string, content: string) => Promise<void>;
    list: (folder: string) => Promise<string[]>;
    search: (query: string) => Promise<string[]>;
  };
  logActivity: (params: PluginActivityParams) => Promise<void>;
};

export type PluginCommand = {
  label: string;
  icon?: LucideIcon;
  route?: string;
  action?: (ctx: PluginClientContext) => void | Promise<void>;
};

export type PluginWidget = {
  id: string;
  label: string;
  size: "quarter" | "half" | "three-quarter" | "full";
  component: ComponentType<{
    ctx: PluginClientContext;
    data: Record<string, unknown>;
  }>;
};

export type PluginPage = {
  /** Human-readable id used in the URL: /p/{pluginId}/{pageId} */
  id: string;
  label: string;
  icon?: LucideIcon;
  /** The React component rendered for this page */
  component: ComponentType;
};

export type AetherPluginClient = {
  SettingsComponent?: ComponentType<{
    ctx: PluginClientContext;
    onSave: (options: Record<string, unknown>) => Promise<void>;
  }>;
  widgets?: PluginWidget[];
  commands?: PluginCommand[];
  pages?: PluginPage[];
};

// ─── Combined plugin definition ───

export type AetherPlugin = {
  meta: PluginMeta;
  optionFields?: PluginOptionField[];
  activityTypes?: PluginActivityType[];
  /** Trigger event types this plugin can fire */
  triggerTypes?: PluginTriggerType[];
  server?: AetherPluginServer;
  client?: AetherPluginClient;
};
