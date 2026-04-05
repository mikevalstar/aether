import { useRouter } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Save, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockPre, createMarkdownComponents } from "#/components/markdown/markdown-components";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { saveObsidianDocument } from "#/lib/obsidian/obsidian.functions";
import { ScopedTreeNav } from "./ScopedTreeNav";
import type { ConfigEditorShellProps, ScopedTreeNode } from "./types";

const MarkdownEditor = lazy(() =>
  import("#/components/ui/markdown-editor").then((m) => ({
    default: m.MarkdownEditor,
  })),
);

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "\u2318" : "Ctrl+";

type SaveState = "idle" | "saving" | "saved";

export function ConfigEditorShell({
  data,
  navLabel,
  navIcon,
  basePath,
  renderFrontmatter,
  onSaved,
  headerAction,
}: ConfigEditorShellProps) {
  const router = useRouter();

  const getHref = useCallback(
    (node: ScopedTreeNode & { type: "file" }) => {
      return `${basePath}/${node.name}`;
    },
    [basePath],
  );

  if (!data.configured) {
    return (
      <main className="mx-auto flex w-[min(1560px,calc(100%-2rem))] px-4 pb-12 pt-8 text-[14px]">
        <div className="surface-card mx-auto max-w-lg px-8 py-12 text-center">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Not configured</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Set the <code className="text-[12px]">OBSIDIAN_DIR</code> and{" "}
            <code className="text-[12px]">OBSIDIAN_AI_CONFIG</code> environment variables to enable the editor.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-[min(1560px,calc(100%-2rem))] px-4 pb-12 pt-8 text-[14px]">
      <div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside>
          <ScopedTreeNav
            nodes={data.tree}
            currentPath={data.document?.relativePath ?? ""}
            label={navLabel}
            icon={navIcon}
            basePath={basePath}
            getHref={getHref}
            headerAction={headerAction}
          />
        </aside>

        <section className="surface-card min-w-0 overflow-hidden">
          {data.document ? (
            <EditorPane
              key={data.document.relativePath}
              data={data}
              document={data.document}
              renderFrontmatter={renderFrontmatter}
              onSaved={() => {
                router.invalidate();
                onSaved?.();
              }}
            />
          ) : (
            <EmptyState label={navLabel} hasFiles={data.tree.length > 0} />
          )}
        </section>
      </div>
    </main>
  );
}

// ─── Editor Pane ────────────────────────────────────────────────────────

function EditorPane(props: {
  data: import("./types").ConfigEditorData;
  document: ObsidianDocument;
  renderFrontmatter?: (
    document: ObsidianDocument,
    onRefresh: () => void,
    data: import("./types").ConfigEditorData,
  ) => React.ReactNode;
  onSaved: () => void;
}) {
  const { data, document, renderFrontmatter, onSaved } = props;
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(document.rawContent);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Reset on external content change (e.g. after toggle save + invalidate)
  useEffect(() => {
    setContent(document.rawContent);
    setSaveState("idle");
    setError(null);
  }, [document.rawContent]);

  const hasChanges = content !== document.rawContent;

  async function handleSave() {
    setSaveState("saving");
    setError(null);
    try {
      await saveObsidianDocument({
        data: { relativePath: document.relativePath, content },
      });
      setSaveState("saved");
      toast.success("File saved");
      setTimeout(() => {
        onSaved();
      }, 600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
      toast.error("Save failed", { description: message });
      setSaveState("idle");
    }
  }

  // Cmd+S / Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (editing && hasChanges && saveState === "idle") handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleRefresh = useCallback(() => {
    router.invalidate();
  }, [router]);

  const markdownComponents = createMarkdownComponents("prose", {
    pre: (preProps) => <CodeBlockPre variant="prose" {...preProps} />,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="relative border-b border-[var(--line)]">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, var(--teal), var(--coral))" }}
        />
        <div className="flex items-center justify-between px-6 py-3 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
              {editing ? "Editing" : "Viewing"}
            </p>
            <h2 className="display-title min-w-0 truncate text-lg font-bold tracking-tight text-[var(--ink)]">
              {document.title}
            </h2>
            {editing && hasChanges && (
              <span className="shrink-0 rounded-full bg-[var(--coral)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--coral)]">
                Unsaved
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setContent(document.rawContent);
                  }}
                >
                  <X className="mr-1.5 size-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveState !== "idle" || !hasChanges}
                  className={saveState === "saved" ? "bg-emerald-600 text-white hover:bg-emerald-600" : undefined}
                >
                  {saveState === "saving" ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : saveState === "saved" ? (
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                  ) : (
                    <Save className="mr-1.5 size-3.5" />
                  )}
                  {saveState === "saved" ? "Saved" : "Save"}
                  {saveState === "idle" && (
                    <kbd className="ml-2 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] leading-none">
                      {modKey}S
                    </kbd>
                  )}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 size-3.5" />
                Edit Prompt
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-6 py-2 text-sm text-destructive-foreground">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Frontmatter display */}
      {renderFrontmatter?.(document, handleRefresh, data)}

      {/* Markdown body — view or edit */}
      {editing ? (
        <>
          <Suspense
            fallback={
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-[var(--ink-soft)]" />
              </div>
            }
          >
            <MarkdownEditor value={content} onChange={setContent} className="min-h-0 flex-1" />
          </Suspense>
          <div className="border-t border-[var(--line)] bg-[var(--surface)] px-6 py-1.5">
            <span className="font-mono text-[11px] text-[var(--ink-soft)]/60">{document.relativePath}</span>
          </div>
        </>
      ) : (
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="max-w-none text-[var(--ink)]">
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {document.body}
            </Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────

function EmptyState({ label, hasFiles }: { label: string; hasFiles: boolean }) {
  return (
    <div className="flex items-center justify-center px-8 py-16">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--ink)]">
          {hasFiles ? "Select a file" : `No ${label.toLowerCase()} found`}
        </h3>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          {hasFiles
            ? `Choose a ${label.toLowerCase().replace(/s$/, "")} from the sidebar to start editing.`
            : `Create a new ${label.toLowerCase().replace(/s$/, "")} file to get started.`}
        </p>
      </div>
    </div>
  );
}
