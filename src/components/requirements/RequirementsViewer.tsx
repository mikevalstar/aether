import { BookOpen } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockPre, createMarkdownComponents } from "#/components/markdown/markdown-components";
import { PageHeader } from "#/components/PageHeader";
import type { RequirementDocument, RequirementsViewerData } from "#/lib/requirements";
import { resolveRequirementLinkTarget } from "#/lib/requirements";
import { cn } from "#/lib/utils";
import { DocumentHeader } from "./DocumentHeader";
import { MissingDocument } from "./MissingDocument";
import { RequirementNavLink, TreeNav } from "./TreeNav";

type RequirementsViewerProps = {
  data: RequirementsViewerData;
};

export function RequirementsViewer({ data }: RequirementsViewerProps) {
  const document = data.document;

  return (
    <PageHeader
      icon={BookOpen}
      label="Requirements"
      title="Requirements"
      highlight="Docs"
      description="Read product requirements stored in docs/requirements/ without leaving Aether."
    >
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <TreeNav nodes={data.tree} currentRoutePath={document?.routePath ?? data.requestedPath} />
        </aside>

        <section className="surface-card min-w-0 overflow-hidden">
          {document ? <DocumentContent document={document} /> : <MissingDocument requestedPath={data.requestedPath} />}
        </section>
      </div>
    </PageHeader>
  );
}

function DocumentContent(props: { document: RequirementDocument }) {
  const { document } = props;
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
      <DocumentHeader document={document} />

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

function MarkdownAnchor({
  href,
  currentRelativePath,
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"a"> & {
  currentRelativePath: string;
}) {
  const target = resolveRequirementLinkTarget(currentRelativePath, href);

  if (target) {
    return (
      <RequirementNavLink routePath={target.routePath} hash={target.hash} className={className} {...rest}>
        {children}
      </RequirementNavLink>
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
