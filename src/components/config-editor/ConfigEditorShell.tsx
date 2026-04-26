import { useRouter } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileText, Loader2, Pencil, Save, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockPre, createMarkdownComponents } from "#/components/markdown/markdown-components";
import { PageHeader } from "#/components/PageHeader";
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
const modKey = isMac ? "⌘" : "Ctrl+";

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

  const singular = navLabel.toLowerCase().replace(/s$/, "");

  if (!data.configured) {
    return (
      <PageHeader
        icon={navIcon as import("lucide-react").LucideIcon}
        label={navLabel}
        title="Editor"
        description={`Edit and configure your ${singular} markdown files.`}
      >
        <div className="surface-card mx-auto max-w-lg px-8 py-12 text-center">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Not configured</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Set the <code className="text-[12px]">OBSIDIAN_DIR</code> and{" "}
            <code className="text-[12px]">OBSIDIAN_AI_CONFIG</code> environment variables to enable the editor.
          </p>
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      icon={navIcon as import("lucide-react").LucideIcon}
      label={navLabel}
      title="Editor"
      description={`Edit and configure your ${singular} markdown files.`}
      actions={headerAction}
    >
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <ScopedTreeNav
            nodes={data.tree}
            currentPath={data.document?.relativePath ?? ""}
            label={navLabel}
            icon={navIcon}
            basePath={basePath}
            getHref={getHref}
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
    </PageHeader>
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
      <div className="relative border-b border-border-strong">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="relative flex min-w-0 items-center gap-3 pl-3">
            <span aria-hidden className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-(--accent)" />
            <FileText className="size-4 shrink-0 text-[var(--accent)]" />
            <h2 className="display-title min-w-0 truncate text-base font-semibold text-[var(--ink)]">{document.title}</h2>
            {editing && (
              <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                {hasChanges ? "Unsaved" : "Editing"}
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
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <MarkdownEditor value={content} onChange={setContent} className="min-h-0 flex-1" />
          </Suspense>
          <div className="border-t border-[var(--line)] bg-[var(--surface)] px-5 py-1.5">
            <span className="font-mono text-[11px] text-muted-foreground/70">{document.relativePath}</span>
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
        <p className="mt-2 text-sm text-muted-foreground">
          {hasFiles
            ? `Choose a ${label.toLowerCase().replace(/s$/, "")} from the sidebar to start editing.`
            : `Create a new ${label.toLowerCase().replace(/s$/, "")} file to get started.`}
        </p>
      </div>
    </div>
  );
}
