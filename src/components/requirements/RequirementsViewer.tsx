import type { ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlockPre, createMarkdownComponents } from "#/components/markdown/markdown-components";
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
    <main className="mx-auto flex w-[min(1560px,calc(100%-2rem))] px-4 pb-12 pt-8 text-[14px]">
      <div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside>
          <TreeNav nodes={data.tree} currentRoutePath={document?.routePath ?? data.requestedPath} />
        </aside>

        <section className="surface-card min-w-0 overflow-hidden">
          {document ? <DocumentContent document={document} /> : <MissingDocument requestedPath={data.requestedPath} />}
        </section>
      </div>
    </main>
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
          "font-medium text-[var(--teal)] underline decoration-[color:var(--line)] underline-offset-3 hover:text-[var(--ink)]",
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

      <div className="px-6 py-6 sm:px-8 sm:py-8">
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
