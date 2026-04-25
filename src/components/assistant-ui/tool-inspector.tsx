import {
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartProps,
  type ToolCallMessagePartStatus,
  useAuiState,
} from "@assistant-ui/react";
import {
  AlertCircleIcon,
  CheckIcon,
  FileTextIcon,
  InfoIcon,
  LoaderIcon,
  PencilLineIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { createContext, type FC, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SubAgentBlock } from "#/components/assistant-ui/sub-agent-block";
import { ToolActivitySummary } from "#/components/assistant-ui/tool-activity-summary";
import { CodeBlockPre, createMarkdownComponents } from "#/components/markdown/markdown-components";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "#/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "#/components/ui/drawer";
import { getObsidianViewerData } from "#/lib/obsidian/obsidian.functions";
import { cn } from "#/lib/utils";

// ── Constants & Types ────────────────────────────────────────────────

const TOOL_ACTIVITY_PREFIX = "tool-activity:";
const SUB_AGENTS_PREFIX = "sub-agents:";
const SUB_AGENTS_TOOL_NAME = "spawn_sub_agents";
const MARKDOWN_DOCUMENT_TOOL_NAMES = new Set(["obsidian_read", "obsidian_write", "obsidian_edit"]);
const MARKDOWN_DOCUMENT_PREFIX = "markdown-documents:";

export type ToolInspection = {
  argsText: string;
  result: unknown;
  status: ToolCallMessagePartStatus | undefined;
  toolCallId: string;
  toolName: string;
};

type ToolInspectorContextValue = {
  selectedTool: ToolInspection | null;
  setSelectedTool: (tool: ToolInspection | null) => void;
};

const ToolInspectorContext = createContext<ToolInspectorContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────

export function ToolInspectorProvider({ children }: { children: ReactNode }) {
  const [selectedTool, setSelectedTool] = useState<ToolInspection | null>(null);

  return <ToolInspectorContext.Provider value={{ selectedTool, setSelectedTool }}>{children}</ToolInspectorContext.Provider>;
}

export function useToolInspector() {
  const context = useContext(ToolInspectorContext);
  if (!context) {
    throw new Error("ToolInspectorContext is not available");
  }
  return context;
}

// ── Tool Status Helpers ──────────────────────────────────────────────

export type ToolStatusType = "complete" | "incomplete" | "requires-action" | "running";

export function getToolStatusMeta(status?: ToolCallMessagePartStatus) {
  if (!status || status.type === "complete") {
    return { label: "Done", type: "complete" as ToolStatusType };
  }

  if (status.type === "running") {
    return { label: "Running", type: "running" as ToolStatusType };
  }

  if (status.type === "requires-action") {
    return { label: "Needs input", type: "requires-action" as ToolStatusType };
  }

  if (status.reason === "cancelled") {
    return { label: "Cancelled", type: "incomplete" as ToolStatusType };
  }

  return { label: "Error", type: "incomplete" as ToolStatusType };
}

// ── Part Grouping ────────────────────────────────────────────────────

export function groupConsecutiveToolParts(parts: readonly { type: string; toolName?: string }[]) {
  const groups: Array<{ groupKey: string | undefined; indices: number[] }> = [];
  let toolGroupIndex = 0;
  let subAgentsGroupIndex = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part?.type !== "tool-call") {
      groups.push({ groupKey: undefined, indices: [index] });
      continue;
    }

    // Markdown document reads/writes/edits are user-facing document events, so
    // they render as compact tiles instead of being tucked into activity.
    if (part.toolName && MARKDOWN_DOCUMENT_TOOL_NAMES.has(part.toolName)) {
      const currentGroup = groups.at(-1);
      if (currentGroup?.groupKey?.startsWith(MARKDOWN_DOCUMENT_PREFIX)) {
        currentGroup.indices.push(index);
      } else {
        groups.push({ groupKey: `${MARKDOWN_DOCUMENT_PREFIX}${index}`, indices: [index] });
      }
      continue;
    }

    // `spawn_sub_agents` gets its own dedicated group so the custom transcript
    // block renders outside the generic tool-activity accordion.
    if (part.toolName === SUB_AGENTS_TOOL_NAME) {
      groups.push({
        groupKey: `${SUB_AGENTS_PREFIX}${subAgentsGroupIndex}`,
        indices: [index],
      });
      subAgentsGroupIndex += 1;
      continue;
    }

    const currentGroup = groups.at(-1);
    if (currentGroup?.groupKey?.startsWith(TOOL_ACTIVITY_PREFIX)) {
      currentGroup.indices.push(index);
      continue;
    }

    groups.push({
      groupKey: `${TOOL_ACTIVITY_PREFIX}${toolGroupIndex}`,
      indices: [index],
    });
    toolGroupIndex += 1;
  }

  return groups;
}

function isToolActivityGroup(groupKey: string | undefined) {
  return groupKey?.startsWith(TOOL_ACTIVITY_PREFIX) ?? false;
}

function isMarkdownDocumentGroup(groupKey: string | undefined) {
  return groupKey?.startsWith(MARKDOWN_DOCUMENT_PREFIX) ?? false;
}

export function isSubAgentsGroup(groupKey: string | undefined) {
  return groupKey?.startsWith(SUB_AGENTS_PREFIX) ?? false;
}

function useToolParts(indices: number[]) {
  const parts = useAuiState((s) => s.message.parts);

  return useMemo(
    () =>
      indices.map((index) => parts[index]).filter((part): part is ToolCallMessagePartProps => part?.type === "tool-call"),
    [indices, parts],
  );
}

// ── Tool Summary Helpers ─────────────────────────────────────────────

function summarizeToolGroup(parts: ToolCallMessagePartProps[]) {
  const runningCount = parts.filter((part) => part.status?.type === "running").length;
  const actionCount = parts.filter((part) => part.status?.type === "requires-action").length;
  const errorCount = parts.filter((part) => part.status?.type === "incomplete" && part.status.reason !== "cancelled").length;

  const statusType: ToolStatusType =
    runningCount > 0 ? "running" : errorCount > 0 ? "incomplete" : actionCount > 0 ? "requires-action" : "complete";

  return {
    total: parts.length,
    runningCount,
    actionCount,
    errorCount,
    statusType,
  };
}

function oneLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function summarizeArgs(argsText: string) {
  try {
    const parsed = JSON.parse(argsText) as unknown;
    if (Array.isArray(parsed)) {
      return `${parsed.length} arg items`;
    }
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed as Record<string, unknown>);
      if (keys.length === 0) return "No args";
      return keys.length <= 3 ? keys.join(", ") : `${keys.slice(0, 3).join(", ")} +${keys.length - 3}`;
    }
  } catch {
    // Fall through to plain-text summary.
  }

  return truncate(oneLine(argsText), 48) || "No args";
}

function summarizeOutput(result: unknown, status?: ToolCallMessagePartStatus) {
  if (status?.type === "running") {
    return "Waiting for result";
  }

  if (status?.type === "requires-action") {
    return "Awaiting user action";
  }

  if (status?.type === "incomplete") {
    return status.reason === "cancelled" ? "Call cancelled" : "Error returned";
  }

  if (result === undefined) {
    return "No result";
  }

  if (Array.isArray(result)) {
    return `${result.length} rows`;
  }

  if (typeof result === "string") {
    return truncate(oneLine(result), 48);
  }

  if (result && typeof result === "object") {
    return `${Object.keys(result as Record<string, unknown>).length} fields`;
  }

  return String(result);
}

function summarizeTool(tool: Pick<ToolCallMessagePartProps, "argsText" | "result" | "status">) {
  const argsSummary = summarizeArgs(tool.argsText);
  const outputSummary = summarizeOutput(tool.result, tool.status);
  return `${argsSummary} • ${outputSummary}`;
}

function summarizeInspection(tool: ToolInspection) {
  return `${summarizeArgs(tool.argsText)} • ${summarizeOutput(tool.result, tool.status)}`;
}

function getOutputText(tool: Pick<ToolInspection, "result" | "status">) {
  if (tool.status?.type === "incomplete") {
    const error = tool.status.error;
    if (typeof error === "string") return error;
    if (error !== undefined) return JSON.stringify(error, null, 2);
    return tool.status.reason === "cancelled" ? "Tool call was cancelled." : "Tool call failed without an error payload.";
  }

  if (tool.status?.type === "requires-action") {
    return "Tool call requires additional user action.";
  }

  if (tool.status?.type === "running") {
    return "Tool call is still running.";
  }

  if (tool.result === undefined) {
    return "No result payload.";
  }

  if (typeof tool.result === "string") {
    return tool.result;
  }

  return JSON.stringify(tool.result, null, 2);
}

function formatIfJson(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return text;
    }
  }
  return text;
}

function toInspection(tool: ToolCallMessagePartProps): ToolInspection {
  return {
    argsText: tool.argsText,
    result: tool.result,
    status: tool.status,
    toolCallId: tool.toolCallId,
    toolName: tool.toolName,
  };
}

type MarkdownToolKind = "edit" | "read" | "write";

type MarkdownDocumentAction = {
  content?: string;
  kind: MarkdownToolKind;
  relativePath: string;
};

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getStringField(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function isMarkdownPath(value: string | undefined) {
  return Boolean(value?.toLowerCase().endsWith(".md"));
}

function normalizeMarkdownPath(value: string | undefined) {
  const normalized = value?.replace(/\\/g, "/").trim();
  if (!normalized) return undefined;
  return normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
}

function getMarkdownDocumentAction(tool: ToolCallMessagePartProps): MarkdownDocumentAction | null {
  if (!MARKDOWN_DOCUMENT_TOOL_NAMES.has(tool.toolName)) return null;

  const args = parseJsonObject(tool.argsText);
  const result = getRecord(tool.result);
  const relativePath = normalizeMarkdownPath(getStringField(result, "relativePath") ?? getStringField(args, "relativePath"));

  if (!relativePath || !isMarkdownPath(relativePath)) return null;

  if (tool.toolName === "obsidian_read") {
    return {
      kind: "read",
      relativePath,
      content: getStringField(result, "content"),
    };
  }

  if (tool.toolName === "obsidian_write") {
    return {
      kind: "write",
      relativePath,
      content: getStringField(args, "content"),
    };
  }

  return {
    kind: "edit",
    relativePath,
  };
}

function getMarkdownBody(content: string) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

function getDocumentTitle(relativePath: string, content?: string) {
  const titleMatch = content?.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleMatch?.[1]) return titleMatch[1];

  const headingMatch = getMarkdownBody(content ?? "").match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) return headingMatch[1];

  return relativePath
    .split("/")
    .at(-1)
    ?.replace(/\.md$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActionCopy(kind: MarkdownToolKind) {
  if (kind === "read") {
    return {
      title: "Read markdown note",
      action: "View note",
      description: "Opened from the tool result",
      tone: "border-[var(--teal)]/25 bg-[var(--teal-subtle)]/45 text-[var(--teal)]",
      Icon: FileTextIcon,
    };
  }

  if (kind === "write") {
    return {
      title: "Wrote markdown note",
      action: "View written note",
      description: "Previewing the written content",
      tone: "border-[var(--coral)]/25 bg-[var(--coral)]/10 text-[var(--coral)]",
      Icon: PencilLineIcon,
    };
  }

  return {
    title: "Edited markdown note",
    action: "View updated note",
    description: "Loads the current saved document",
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Icon: PencilLineIcon,
  };
}

// ── Components ───────────────────────────────────────────────────────

export const InspectorToolActivity: FC<{
  groupKey: string | undefined;
  indices: number[];
  children?: ReactNode;
}> = ({ groupKey, indices, children }) => {
  const parts = useToolParts(indices);

  // Sub-agent groups render a custom block rather than the generic accordion.
  if (isSubAgentsGroup(groupKey) && parts.length > 0) {
    const part = parts[0];
    if (!part) return <>{children}</>;
    return <SubAgentBlock part={part} />;
  }

  if (isMarkdownDocumentGroup(groupKey) && parts.length > 0) {
    return <div className="my-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
  }

  const isToolGroup = isToolActivityGroup(groupKey) && parts.length > 0;
  if (!isToolGroup) return <>{children}</>;

  const summary = summarizeToolGroup(parts);

  return (
    <Collapsible className="my-2">
      <CollapsibleTrigger className="group/tool-activity-trigger w-full rounded-xl border border-border/60 bg-muted/20 px-3 data-[state=open]:bg-muted/35">
        <ToolActivitySummary
          total={summary.total}
          runningCount={summary.runningCount}
          errorCount={summary.errorCount}
          status={summary.statusType}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-3 pb-2">
        <div className="mt-1 flex flex-col gap-1.5 border-l border-border/60 pl-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const InspectorToolRow: ToolCallMessagePartComponent = (tool) => {
  const inspector = useToolInspector();
  const statusMeta = getToolStatusMeta(tool.status);
  const isSelected = inspector.selectedTool?.toolCallId === tool.toolCallId;
  const markdownDocumentAction = getMarkdownDocumentAction(tool);

  // Sub-agent calls are rendered by SubAgentBlock via the group dispatcher, not
  // as a generic inspectable row.
  if (tool.toolName === SUB_AGENTS_TOOL_NAME) return null;

  if (markdownDocumentAction) {
    return (
      <MarkdownDocumentToolRow
        action={markdownDocumentAction}
        isSelected={isSelected}
        onInspect={() => inspector.setSelectedTool(isSelected ? null : toInspection(tool))}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => inspector.setSelectedTool(isSelected ? null : toInspection(tool))}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
        isSelected ? "border-foreground/25 bg-accent/60" : "border-border/60 bg-background hover:bg-muted/40",
      )}
    >
      <ToolStatusGlyph status={statusMeta.type} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm text-foreground">{tool.toolName}</div>
        <div className="truncate text-xs text-muted-foreground">{summarizeTool(tool)}</div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge statusType={statusMeta.type} />
        <span className="hidden text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:inline">
          {isSelected ? "Close" : "Inspect"}
        </span>
      </div>
    </button>
  );
};

function MarkdownDocumentToolRow({
  action,
  isSelected,
  onInspect,
}: {
  action: MarkdownDocumentAction;
  isSelected: boolean;
  onInspect: () => void;
}) {
  const copy = getActionCopy(action.kind);
  const title = getDocumentTitle(action.relativePath, action.content);
  const Icon = copy.Icon;

  return (
    <div
      className={cn(
        "relative min-w-0 rounded-lg border transition-colors",
        isSelected ? "border-foreground/25 bg-accent/60" : "border-border/60 bg-background hover:bg-muted/30",
      )}
    >
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group/minidoc flex min-w-0 w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 pr-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
          >
            <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-md border", copy.tone)}>
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[13px] leading-5 text-foreground">{title}</span>
              <span className="mt-0.5 block truncate font-mono text-[11px] leading-4 text-muted-foreground">
                {action.relativePath}
              </span>
            </span>
          </button>
        </DialogTrigger>
        <MarkdownDocumentDialog action={action} description={copy.description} title={title ?? action.relativePath} />
      </Dialog>

      <div className="absolute right-1.5 bottom-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onInspect}
          className={cn("size-6 text-muted-foreground hover:text-foreground", isSelected && "bg-accent text-foreground")}
          aria-label={isSelected ? "Close tool inspection" : "Inspect tool payload"}
          title={isSelected ? "Close inspection" : "Inspect payload"}
        >
          <InfoIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MarkdownDocumentDialog({
  action,
  description,
  title,
}: {
  action: MarkdownDocumentAction;
  description: string;
  title: string;
}) {
  const [content, setContent] = useState(action.content);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (action.content || action.kind !== "edit") {
      setContent(action.content);
      setLoadState("idle");
      return;
    }

    let cancelled = false;
    setLoadState("loading");

    getObsidianViewerData({ data: { path: action.relativePath } })
      .then((data) => {
        if (cancelled) return;
        setContent(data.document?.rawContent);
        setLoadState(data.document?.rawContent ? "idle" : "error");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [action.content, action.kind, action.relativePath]);

  const markdownComponents = createMarkdownComponents("prose", {
    pre: (preProps) => <CodeBlockPre variant="prose" {...preProps} />,
  });

  return (
    <DialogContent className="grid h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-none xl:h-[min(94vh,1080px)] xl:w-[min(98vw,1680px)]">
      <DialogHeader className="border-b border-border/70 px-5 py-4 pr-12">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--teal)]/25 bg-[var(--teal-subtle)] text-[var(--teal)]">
            <FileTextIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="truncate text-base">{title}</DialogTitle>
            <DialogDescription className="mt-1 truncate font-mono text-xs">
              {description} • {action.relativePath}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="min-h-0 overflow-y-auto bg-background px-5 py-5">
        {loadState === "loading" ? (
          <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted-foreground">
            <LoaderIcon className="mr-2 size-4 animate-spin" />
            Loading document...
          </div>
        ) : content ? (
          <div className="max-w-none text-[var(--ink)]">
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {getMarkdownBody(content)}
            </Markdown>
          </div>
        ) : (
          <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            {loadState === "error"
              ? "Could not load this markdown document."
              : "No markdown content was returned for this tool call."}
          </div>
        )}
      </div>
    </DialogContent>
  );
}

export const ToolInspectorDrawer: FC = () => {
  const { selectedTool, setSelectedTool } = useToolInspector();
  const statusMeta = getToolStatusMeta(selectedTool?.status);
  const output = selectedTool ? getOutputText(selectedTool) : "";

  return (
    <Drawer
      open={selectedTool !== null}
      direction="right"
      onOpenChange={(open) => {
        if (!open) setSelectedTool(null);
      }}
    >
      <DrawerContent className="w-full max-w-none data-[vaul-drawer-direction=right]:w-screen sm:data-[vaul-drawer-direction=right]:w-[min(94vw,40rem)] lg:data-[vaul-drawer-direction=right]:w-[min(80vw,48rem)]">
        <DrawerHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-5">
          <DrawerTitle className="flex items-center gap-3 text-lg tracking-tight">
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
              <WrenchIcon className="size-4" />
            </span>
            Tool inspection
          </DrawerTitle>
          <DrawerDescription>
            {selectedTool
              ? "Raw tool payloads, status metadata, and the final output."
              : "Select a tool call in the transcript to inspect its args and result."}
          </DrawerDescription>
        </DrawerHeader>

        {!selectedTool ? (
          <div className="flex flex-1 items-center justify-center px-5 py-10 text-center sm:px-6">
            <div className="max-w-xs">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <WrenchIcon className="size-5" />
              </div>
              <h3 className="mt-4 font-medium text-foreground">No tool selected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a tool call from the conversation to inspect the raw payload.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border/70 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <ToolStatusGlyph status={statusMeta.type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-sm text-foreground">{selectedTool.toolName}</div>
                  <div className="truncate text-xs text-muted-foreground">{summarizeInspection(selectedTool)}</div>
                </div>
                <StatusBadge statusType={statusMeta.type} />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <ToolPayloadCard title="Input" value={selectedTool.argsText} />
                  <ToolPayloadCard title={selectedTool.status?.type === "incomplete" ? "Error" : "Output"} value={output} />
                </div>
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-medium text-sm text-foreground">Meta</h3>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-foreground">Tool call ID</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">{selectedTool.toolCallId}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Status</dt>
                      <dd className="mt-1 text-muted-foreground">{statusMeta.label}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Args size</dt>
                      <dd className="mt-1 text-muted-foreground">{selectedTool.argsText.length} chars</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Output size</dt>
                      <dd className="mt-1 text-muted-foreground">{output.length} chars</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

function ToolPayloadCard({ title, value }: { title: string; value: string }) {
  const formatted = formatIfJson(value);

  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-medium text-sm text-foreground">{title}</h3>
        <Badge variant="outline" className="text-[11px] text-muted-foreground">
          {value.length} chars
        </Badge>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground">
        {formatted || "No payload."}
      </pre>
    </div>
  );
}

function ToolStatusGlyph({ status }: { status: ToolStatusType }) {
  const Icon =
    status === "running"
      ? LoaderIcon
      : status === "complete"
        ? CheckIcon
        : status === "requires-action"
          ? AlertCircleIcon
          : XCircleIcon;

  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full border",
        status === "complete" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "running" && "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "requires-action" && "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "incomplete" && "border-destructive/20 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className={cn("size-3.5", status === "running" && "animate-spin")} />
    </span>
  );
}

function StatusBadge({ statusType }: { statusType: ToolStatusType }) {
  const meta = getToolStatusMeta({
    type: statusType,
  } as ToolCallMessagePartStatus);

  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 text-[11px] font-medium",
        statusType === "complete" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        (statusType === "running" || statusType === "requires-action") &&
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        statusType === "incomplete" && "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      {meta.label}
    </Badge>
  );
}
