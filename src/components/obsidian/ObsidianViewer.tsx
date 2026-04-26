import { useRouter } from "@tanstack/react-router";
import { AlertCircle, BookOpen, Pencil } from "lucide-react";
import { type ComponentPropsWithoutRef, useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockPre, createMarkdownComponents } from "#/components/markdown/markdown-components";
import { PageHeader } from "#/components/PageHeader";
import { Button } from "#/components/ui/button";
import { getAiConfigValidatorInfo } from "#/lib/ai-config/ai-config.functions";
import {
  getAiConfigFilename,
  type ObsidianDocument,
  type ObsidianViewerData,
  resolveObsidianLinkTarget,
} from "#/lib/obsidian/obsidian";
import { cn } from "#/lib/utils";
import { ObsidianEditor } from "./ObsidianEditor";
import { ObsidianMissingDocument } from "./ObsidianMissingDocument";
import { ObsidianNavLink, ObsidianTreeNav } from "./ObsidianTreeNav";
import { ObsidianWelcome } from "./ObsidianWelcome";

type ObsidianViewerProps = {
  data: ObsidianViewerData;
  initialEdit?: boolean;
};

export function ObsidianViewer({ data, initialEdit }: ObsidianViewerProps) {
  const [editing, setEditing] = useState(initialEdit === true);
  const router = useRouter();

  if (!data.configured) {
    return (
      <PageHeader
        icon={BookOpen}
        label="Obsidian"
        title="Vault"
        highlight="Browser"
        description="Browse, search, and edit your Obsidian vault from inside Aether."
      >
        <div className="surface-card mx-auto max-w-lg px-8 py-12 text-center">
          <h2 className="display-title text-xl font-semibold text-[var(--ink)]">Obsidian not configured</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Set the <code className="font-mono text-[12px]">OBSIDIAN_DIR</code> environment variable to your vault path to
            enable the Obsidian browser.
          </p>
        </div>
      </PageHeader>
    );
  }

  const document = data.document;
  const isIndex = data.requestedPath === "";

  return (
    <PageHeader
      icon={BookOpen}
      label="Obsidian"
      title="Vault"
      highlight="Browser"
      description="Browse, search, and edit your Obsidian vault from inside Aether."
    >
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <ObsidianTreeNav
            nodes={data.tree}
            aiConfigPath={data.aiConfigPath}
            aiMemoryPath={data.aiMemoryPath}
            currentRoutePath={document?.routePath ?? data.requestedPath}
          />
        </aside>

        <section className="surface-card min-w-0 overflow-hidden">
          {document ? (
            editing ? (
              <ObsidianEditor
                document={document}
                aiConfigPath={data.aiConfigPath}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  router.invalidate();
                }}
              />
            ) : (
              <DocumentContent document={document} aiConfigPath={data.aiConfigPath} onEdit={() => setEditing(true)} />
            )
          ) : isIndex ? (
            <ObsidianWelcome tree={data.tree} />
          ) : (
            <ObsidianMissingDocument requestedPath={data.requestedPath} />
          )}
        </section>
      </div>
    </PageHeader>
  );
}

function DocumentContent(props: { document: ObsidianDocument; aiConfigPath: string | null; onEdit: () => void }) {
  const { document, aiConfigPath, onEdit } = props;

  const aiConfigFilename = getAiConfigFilename(document.relativePath, aiConfigPath);

  const [isUnrecognizedConfig, setIsUnrecognizedConfig] = useState(false);

  useEffect(() => {
    if (!aiConfigFilename) return;

    getAiConfigValidatorInfo({ data: { filename: aiConfigFilename } }).then((info) => {
      if (!info) setIsUnrecognizedConfig(true);
    });
  }, [aiConfigFilename]);

  const markdownComponents = createMarkdownComponents("prose", {
    a: ({ href, children, className, ...rest }) => (
      <MarkdownAnchor
        href={href}
        currentRelativePath={document.relativePath}
        className={cn(
          "font-medium text-[var(--accent)] underline decoration-[color:var(--line)] underline-offset-3 hover:text-[var(--ink)]",
          className,
        )}
        {...rest}
      >
        {children}
      </MarkdownAnchor>
    ),
    pre: (preProps) => <CodeBlockPre variant="prose" {...preProps} />,
  });

  return (
    <div>
      <DocumentHeader document={document} onEdit={onEdit} />

      {isUnrecognizedConfig && aiConfigFilename && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            <strong>{aiConfigFilename}</strong> is not a recognized config file and will not be used by Aether.
          </span>
        </div>
      )}

      <FrontmatterDisplay frontmatter={document.frontmatter} />

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="max-w-none text-[var(--ink)]">
          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {document.body}
          </Markdown>
        </div>
      </div>
    </div>
  );
}

function DocumentHeader(props: { document: ObsidianDocument; onEdit: () => void }) {
  const { document, onEdit } = props;

  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="px-5 pb-4 pt-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="relative min-w-0 flex-1 pl-3">
            <span aria-hidden className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-(--accent)" />
            <h2 className="display-title text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">
              {document.title}
            </h2>
            <p className="mt-1.5 font-mono text-[12px] text-[var(--ink-dim)]">{document.relativePath}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatFrontmatterValue(value: string | number | boolean | string[] | null): string {
  if (value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function FrontmatterDisplay({ frontmatter }: { frontmatter: Record<string, string | number | boolean | string[] | null> }) {
  const entries = Object.entries(frontmatter).filter(([key]) => key !== "title");
  if (entries.length === 0) return null;

  return (
    <div className="border-b border-[var(--line)] bg-[var(--bg)] px-5 py-2.5 sm:px-7">
      <dl className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px]">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-1.5">
            <dt className="font-semibold uppercase tracking-[0.12em] text-[var(--ink-faint)]">{key}</dt>
            <dd className="text-[var(--ink-soft)]">{formatFrontmatterValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MarkdownAnchor({
  href,
  currentRelativePath,
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"a"> & {
  currentRelativePath: string;
}) {
  const target = resolveObsidianLinkTarget(currentRelativePath, href);

  if (target) {
    return (
      <ObsidianNavLink routePath={target.routePath} hash={target.hash} className={className} {...rest}>
        {children}
      </ObsidianNavLink>
    );
  }

  const isExternal = href ? /^(https?:|mailto:|tel:)/.test(href) : false;

  return (
    <a
      href={href}
      className={className}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}
