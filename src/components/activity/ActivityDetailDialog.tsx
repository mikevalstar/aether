import {
  Bell,
  Bot,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  PenLine,
  RotateCcw,
  Smartphone,
  Trash2,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { RunMessages } from "#/components/shared/RunMessages";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import type { ActivityChatThread, ActivityDetail } from "#/lib/activity.functions";
import { formatDateTime } from "#/lib/date";
import { ContentView } from "./ContentView";
import { DiffView } from "./DiffView";
import { formatRelativeTime } from "./format-relative-time";

export function ActivityDetailDialog({
  detail,
  loading,
  reverting,
  onClose,
  onRevert,
}: {
  detail: ActivityDetail | null;
  loading: boolean;
  reverting: boolean;
  onClose: () => void;
  onRevert: (activityLogId: string) => void;
}) {
  return (
    <Dialog open={!!detail || loading} onOpenChange={onClose}>
      <DialogContent
        className="flex h-[80vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        aria-describedby={undefined}
      >
        {loading ? (
          <div className="p-6">
            <DetailSkeleton />
          </div>
        ) : detail ? (
          <>
            {/* Header block — tinted background, clear visual separation */}
            <DialogHeader className="shrink-0 border-b border-border bg-[var(--teal-subtle)]/40 px-6 pt-6 pb-4">
              {/* Row 1: Summary title + revert */}
              <div className="flex items-start justify-between gap-4 pr-4">
                <DialogTitle className="text-lg font-semibold leading-tight">{detail.summary}</DialogTitle>
                {detail.fileChangeDetail && <RevertButton reverting={reverting} onRevert={() => onRevert(detail.id)} />}
              </div>

              {detail.fileChangeDetail && (
                <>
                  {/* Row 2: File path — the hero info */}
                  <CopyablePath path={detail.fileChangeDetail.filePath} />

                  {/* Row 3: Metadata chips */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <SourceBadge source={detail.fileChangeDetail.changeSource} />
                    {detail.fileChangeDetail.toolName && (
                      <Badge variant="outline" className="gap-1 px-2 py-1 text-xs font-mono">
                        <Wrench className="size-3" />
                        {detail.fileChangeDetail.toolName}
                      </Badge>
                    )}
                    <FileStatus detail={detail} />

                    {/* Timestamp — right-aligned */}
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span title={formatDateTime(detail.createdAt)}>{formatRelativeTime(detail.createdAt)}</span>
                    </span>
                  </div>
                </>
              )}

              {!detail.fileChangeDetail && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {formatDateTime(detail.createdAt)}
                </span>
              )}
            </DialogHeader>

            {/* Content area */}
            {detail.fileChangeDetail && (
              <Tabs defaultValue="diff" className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-6">
                <div className="shrink-0">
                  {!detail.fileExists && (
                    <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                      <Trash2 className="size-3.5 shrink-0" />
                      File no longer exists on disk
                    </div>
                  )}
                  <TabsList>
                    <TabsTrigger value="diff">Diff</TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="new">New</TabsTrigger>
                    {detail.fileExists && <TabsTrigger value="current">Current</TabsTrigger>}
                  </TabsList>
                </div>

                <TabsContent value="diff" className="mt-3 min-h-0 flex-1 overflow-y-auto">
                  <DiffView
                    original={detail.fileChangeDetail.originalContent ?? ""}
                    modified={detail.fileChangeDetail.newContent}
                    filePath={detail.fileChangeDetail.filePath}
                  />
                </TabsContent>

                <TabsContent value="original" className="mt-3 min-h-0 flex-1 overflow-y-auto">
                  <ContentView content={detail.fileChangeDetail.originalContent ?? "(new file — no original content)"} />
                </TabsContent>

                <TabsContent value="new" className="mt-3 min-h-0 flex-1 overflow-y-auto">
                  <ContentView content={detail.fileChangeDetail.newContent} />
                </TabsContent>

                {detail.fileExists && (
                  <TabsContent value="current" className="mt-3 min-h-0 flex-1 overflow-y-auto">
                    <ContentView content={detail.currentFileContent ?? ""} />
                  </TabsContent>
                )}
              </Tabs>
            )}

            {/* Notification detail */}
            {detail.type === "ai_notification" && <NotificationDetail detail={detail} />}

            {/* Chat history for cron/workflow/system_task */}
            {detail.chatThread && (
              <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-6">
                <ChatThreadMeta thread={detail.chatThread} />
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/30 p-4">
                  <RunMessages
                    messagesJson={detail.chatThread.messagesJson}
                    systemPromptJson={detail.chatThread.systemPromptJson}
                    availableToolsJson={detail.chatThread.availableToolsJson}
                  />
                </div>
              </div>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RevertButton({ reverting, onRevert }: { reverting: boolean; onRevert: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={reverting}
      onClick={onRevert}
      className="shrink-0 border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
    >
      <RotateCcw className={`mr-1.5 size-3.5 ${reverting ? "animate-spin" : ""}`} />
      {reverting ? "Reverting..." : "Revert"}
    </Button>
  );
}

function CopyablePath({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group mt-2 flex w-fit items-center gap-1.5 rounded-md bg-muted/60 px-2.5 py-1 font-mono text-sm text-foreground transition-colors hover:bg-muted"
      title="Copy file path"
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{path}</span>
      {copied ? (
        <CheckCircle className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
      ) : (
        <Copy className="size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function SourceBadge({ source }: { source: string }) {
  if (source === "ai") {
    return (
      <Badge className="gap-1 border-[var(--teal)]/20 bg-[var(--teal)]/10 px-2 py-1 text-xs text-[var(--teal)] hover:bg-[var(--teal)]/15">
        <Bot className="size-3.5" />
        AI
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-[var(--coral)]/20 bg-[var(--coral)]/10 px-2 py-1 text-xs text-[var(--coral)] hover:bg-[var(--coral)]/15">
      <PenLine className="size-3.5" />
      Manual
    </Badge>
  );
}

function FileStatus({ detail }: { detail: ActivityDetail }) {
  if (!detail.fileExists) {
    return (
      <Badge variant="outline" className="gap-1 border-red-500/20 px-2 py-1 text-xs text-red-500">
        <Trash2 className="size-3" />
        Deleted
      </Badge>
    );
  }
  if (detail.currentFileContent === detail.fileChangeDetail?.newContent) {
    return (
      <Badge variant="outline" className="gap-1 border-green-500/20 px-2 py-1 text-xs text-green-600 dark:text-green-400">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500/40" />
          <span className="relative inline-flex size-2 rounded-full bg-green-500" />
        </span>
        Current
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-amber-500/20 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
      <PenLine className="size-3" />
      Modified since
    </Badge>
  );
}

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

function ChatThreadMeta({ thread }: { thread: ActivityChatThread }) {
  const totalTokens = thread.totalInputTokens + thread.totalOutputTokens;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline" className="text-xs">
        {thread.model}
      </Badge>
      {totalTokens > 0 && <span className="tabular-nums">{totalTokens.toLocaleString()} tokens</span>}
      {thread.totalEstimatedCostUsd > 0 && <span className="tabular-nums">{formatCost(thread.totalEstimatedCostUsd)}</span>}
    </div>
  );
}

function NotificationDetail({ detail }: { detail: ActivityDetail }) {
  let meta: { title?: string; body?: string; link?: string; pushToPhone?: boolean } = {};
  try {
    meta = detail.metadata ? JSON.parse(detail.metadata) : {};
  } catch {
    // ignore
  }

  return (
    <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-[var(--coral)]" />
        <span className="text-sm font-semibold">Notification sent by AI</span>
        {meta.pushToPhone && (
          <Badge className="gap-1 border-[var(--coral)]/20 bg-[var(--coral)]/10 px-2 py-1 text-xs text-[var(--coral)]">
            <Smartphone className="size-3" />
            Pushed to phone
          </Badge>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        {meta.title && <p className="text-sm font-semibold">{meta.title}</p>}
        {meta.body && <p className="mt-1 text-sm text-muted-foreground">{meta.body}</p>}
        {meta.link && (
          <p className="mt-2 flex items-center gap-1 text-xs text-[var(--teal)]">
            <ExternalLink className="size-3" />
            {meta.link}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-64 rounded bg-muted" />
      <div className="h-8 w-56 rounded-md bg-muted" />
      <div className="flex gap-2">
        <div className="h-6 w-14 rounded-full bg-muted" />
        <div className="h-6 w-20 rounded-full bg-muted" />
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
      <div className="space-y-1 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-5 rounded bg-muted" style={{ width: `${60 + Math.random() * 35}%` }} />
        ))}
      </div>
    </div>
  );
}
