import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { AlertCircleIcon, CheckIcon, ExternalLinkIcon, LoaderIcon, UsersIcon } from "lucide-react";
import type { FC } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createMarkdownComponents } from "#/components/markdown/markdown-components";
import { Badge } from "#/components/ui/badge";
import { threadIdToSlug } from "#/lib/chat/chat";
import { formatUsageCurrency, getChatModelLabel } from "#/lib/chat/chat-usage";
import { cn } from "#/lib/utils";

const markdownComponents = createMarkdownComponents("compact");

/** Matches the spawnStateSchema output from the spawn_sub_agents tool. */
type SpawnState = {
  agent: string;
  name: string;
  model: string;
  threadId?: string;
  status: "pending" | "running" | "done" | "error";
  text: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  error?: string;
};

type SpawnOutput = {
  spawns: SpawnState[];
};

/**
 * Read `result` from the tool part — while streaming, AI SDK replaces this on
 * each yield; when complete the final snapshot is set.
 */
function readSpawns(part: ToolCallMessagePartProps): SpawnState[] {
  const result = part.result as SpawnOutput | undefined;
  if (result && Array.isArray(result.spawns)) return result.spawns;

  // Before the first preliminary yield arrives, try to derive placeholder
  // rows from the tool args so users see the list of intended spawns.
  const args = part.args as { spawns?: Array<{ agent?: string; prompt?: string }> } | undefined;
  if (args?.spawns?.length) {
    return args.spawns.map((s) => ({
      agent: s.agent ?? "?",
      name: s.agent ?? "?",
      model: "",
      status: "pending" as const,
      text: "",
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    }));
  }

  return [];
}

const STATUS_LABEL: Record<SpawnState["status"], string> = {
  pending: "Queued",
  running: "Running",
  done: "Done",
  error: "Error",
};

function StatusGlyph({ status }: { status: SpawnState["status"] }) {
  if (status === "running") {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <LoaderIcon className="size-3 animate-spin" />
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--teal)]/15 text-[var(--teal)]">
        <CheckIcon className="size-3" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertCircleIcon className="size-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
    </span>
  );
}

function formatTokens(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

function SpawnCard({ spawn }: { spawn: SpawnState }) {
  const href = spawn.threadId ? `/chat/${threadIdToSlug(spawn.threadId)}` : undefined;
  const hasFooter = spawn.status === "done" || spawn.status === "error";
  const modelLabel = spawn.model ? getChatModelLabel(spawn.model) : undefined;
  const linkActive = (spawn.status === "done" || spawn.status === "error") && href;

  return (
    <article
      className={cn(
        "rounded-lg border bg-background/60 text-sm transition-colors",
        spawn.status === "error" ? "border-destructive/40" : "border-border/70",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <StatusGlyph status={spawn.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">{spawn.name}</span>
            <code className="truncate text-[11px] text-muted-foreground/80">{spawn.agent}</code>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="h-4 border-border/50 bg-transparent px-1.5 text-[10px] font-medium">
              {STATUS_LABEL[spawn.status]}
            </Badge>
            {modelLabel && <span className="truncate">{modelLabel}</span>}
          </div>
        </div>
        {linkActive && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-[var(--teal)]/40 hover:text-[var(--teal)]"
            title="Open sub-agent thread in new tab"
          >
            <ExternalLinkIcon className="size-3" />
            Open
          </a>
        )}
      </header>

      {spawn.error && (
        <div role="alert" className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            <div className="break-words">{spawn.error}</div>
          </div>
        </div>
      )}

      {spawn.text ? (
        <div className="px-3 py-2 text-sm leading-relaxed">
          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {spawn.text}
          </Markdown>
        </div>
      ) : (
        !spawn.error && (
          <div className="px-3 py-3 text-xs italic text-muted-foreground/70">
            {spawn.status === "running" ? "Streaming…" : spawn.status === "pending" ? "Queued…" : "No output"}
          </div>
        )
      )}

      {hasFooter && (
        <footer className="flex items-center gap-3 border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{formatTokens(spawn.inputTokens)}</span> in
          </span>
          <span>
            <span className="font-medium text-foreground">{formatTokens(spawn.outputTokens)}</span> out
          </span>
          <span className="ml-auto font-medium text-foreground">{formatUsageCurrency(spawn.estimatedCostUsd)}</span>
        </footer>
      )}
    </article>
  );
}

export const SubAgentBlock: FC<{ part: ToolCallMessagePartProps }> = ({ part }) => {
  const spawns = readSpawns(part);
  const runningCount = spawns.filter((s) => s.status === "running" || s.status === "pending").length;
  const errorCount = spawns.filter((s) => s.status === "error").length;
  const doneCount = spawns.filter((s) => s.status === "done").length;

  const headerLabel =
    runningCount > 0
      ? `${runningCount} running · ${doneCount} done${errorCount ? ` · ${errorCount} error` : ""}`
      : errorCount > 0
        ? `${doneCount} done · ${errorCount} error`
        : `${spawns.length} sub-agent${spawns.length === 1 ? "" : "s"} complete`;

  return (
    <section className="my-2 rounded-xl border border-border/60 bg-muted/10 p-2">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
        <UsersIcon className="size-3.5 text-[var(--teal)]" />
        <span className="font-medium uppercase tracking-[0.12em]">Sub-agents</span>
        <span aria-hidden>·</span>
        <span>{headerLabel}</span>
      </div>
      <div className="flex flex-col gap-2">
        {spawns.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-3 text-xs italic text-muted-foreground">
            Preparing sub-agents…
          </div>
        ) : (
          spawns.map((spawn) => <SpawnCard key={spawn.threadId ?? `${spawn.agent}:${spawn.name}`} spawn={spawn} />)
        )}
      </div>
    </section>
  );
};
