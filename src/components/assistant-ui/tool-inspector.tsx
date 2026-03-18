import {
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartProps,
  type ToolCallMessagePartStatus,
  useAuiState,
} from "@assistant-ui/react";
import { AlertCircleIcon, CheckIcon, LoaderIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import { createContext, type FC, type ReactNode, useContext, useMemo, useState } from "react";
import { ToolActivitySummary } from "#/components/assistant-ui/tool-activity-summary";
import { Badge } from "#/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "#/components/ui/drawer";
import { cn } from "#/lib/utils";

// ── Constants & Types ────────────────────────────────────────────────

const TOOL_ACTIVITY_PREFIX = "tool-activity:";

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

export function groupConsecutiveToolParts(parts: readonly { type: string }[]) {
  const groups: Array<{ groupKey: string | undefined; indices: number[] }> = [];
  let toolGroupIndex = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part?.type !== "tool-call") {
      groups.push({ groupKey: undefined, indices: [index] });
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

// ── Components ───────────────────────────────────────────────────────

export const InspectorToolActivity: FC<{
  groupKey: string | undefined;
  indices: number[];
  children?: ReactNode;
}> = ({ groupKey, indices, children }) => {
  const parts = useToolParts(indices);
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
