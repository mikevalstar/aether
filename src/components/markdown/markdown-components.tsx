"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Children, type ComponentPropsWithoutRef, isValidElement, useCallback, useRef, useState } from "react";
import type { Components } from "react-markdown";
import { cn } from "#/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────

export type MarkdownVariant = "compact" | "prose";

type StrictMarkdownComponents = {
  [Key in keyof React.JSX.IntrinsicElements]?: Exclude<Components[Key], keyof React.JSX.IntrinsicElements>;
};

// ─── Copy to clipboard ───────────────────────────────────────────────

export function useCopyToClipboard(duration = 3000) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      if (!text || isCopied) return;
      navigator.clipboard.writeText(text).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), duration);
      });
    },
    [isCopied, duration],
  );

  return { isCopied, copy };
}

// ─── Variant-specific class maps ──────────────────────────────────────

const variantStyles = {
  compact: {
    h1: "mb-2 mt-3 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
    h2: "mt-3 mb-1.5 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
    h3: "mt-2.5 mb-1 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
    h4: "mt-2 mb-1 scroll-m-20 text-sm font-medium first:mt-0 last:mb-0",
    h5: "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
    h6: "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
    p: "my-2.5 leading-normal first:mt-0 last:mb-0",
    a: "text-primary underline underline-offset-2 hover:text-primary/80",
    ul: "my-2 ml-4 list-disc marker:text-muted-foreground [&>li]:mt-1",
    ol: "my-2 ml-4 list-decimal marker:text-muted-foreground [&>li]:mt-1",
    li: "leading-normal",
    blockquote: "my-2.5 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
    hr: "my-2 border-muted-foreground/20",
    tableWrap: "my-2",
    table: "w-full border-separate border-spacing-0 overflow-y-auto",
    thead: "bg-muted",
    th: "bg-muted px-2 py-1 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg",
    td: "border-muted-foreground/20 border-b border-l px-2 py-1 text-left last:border-r [[align=center]]:text-center [[align=right]]:text-right",
    tr: "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
    preWrap: "mt-2.5",
    pre: "p-3 text-xs leading-relaxed",
    codeInline: "rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
  },
  prose: {
    h1: "display-title mt-10 mb-4 text-3xl font-bold tracking-tight first:mt-0 sm:text-[2rem]",
    h2: "mt-10 mb-3 border-b border-[var(--line)] pb-2 text-[1.45rem] font-semibold tracking-tight first:mt-0",
    h3: "mt-8 mb-2 text-[1.15rem] font-semibold",
    h4: "mt-6 mb-2 text-base font-semibold",
    h5: "mt-5 mb-2 text-sm font-semibold",
    h6: "mt-5 mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]",
    p: "my-4 text-[0.97rem] leading-7",
    a: "font-medium text-[var(--teal)] underline decoration-[color:var(--line)] underline-offset-3 hover:text-[var(--ink)]",
    ul: "my-4 ml-5 list-disc space-y-2 marker:text-[var(--ink-soft)]",
    ol: "my-4 ml-5 list-decimal space-y-2 marker:text-[var(--ink-soft)]",
    li: "pl-1 leading-7 text-[0.97rem]",
    blockquote:
      "my-6 rounded-r-lg border-l-3 border-[var(--teal)] bg-[var(--bg)] px-4 py-3 text-[0.97rem] leading-7 text-[var(--ink-soft)] italic",
    hr: "my-8 border-0 border-t border-[var(--line)]",
    tableWrap: "my-6",
    table: "w-full min-w-[36rem] border-collapse",
    thead: "bg-[var(--bg)]",
    th: "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]",
    td: "px-4 py-3 text-[0.92rem] leading-6 text-[var(--ink)] align-top",
    tr: "border-t border-[var(--line)]",
    preWrap: "my-6",
    pre: "p-4 text-[13px] leading-6",
    codeInline:
      "rounded-md border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.84em] text-[var(--ink)]",
  },
} as const;

// ─── Code block with copy button ──────────────────────────────────────

function extractLanguage(children: React.ReactNode): string {
  let language = "";
  Children.forEach(children, (child) => {
    if (isValidElement<{ className?: string }>(child) && typeof child.props.className === "string") {
      const match = child.props.className.match(/language-(\w+)/);
      if (match) language = match[1];
    }
  });
  return language;
}

export function CodeBlockPre({
  variant,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"pre"> & { variant: MarkdownVariant }) {
  const preRef = useRef<HTMLPreElement>(null);
  const { isCopied, copy } = useCopyToClipboard();
  const s = variantStyles[variant];
  const language = extractLanguage(children);

  return (
    <div className={cn("group relative", s.preWrap)}>
      {language ? (
        <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs">
          <span className="font-medium lowercase text-[var(--ink-soft)]">{language}</span>
          <button
            type="button"
            onClick={() => copy(preRef.current?.textContent ?? "")}
            className="flex items-center gap-1 text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
            aria-label="Copy code"
          >
            {isCopied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            <span className="ml-0.5">{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => copy(preRef.current?.textContent ?? "")}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink-soft)] opacity-0 transition-opacity hover:text-[var(--ink)] group-hover:opacity-100"
          aria-label="Copy code"
        >
          {isCopied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
        </button>
      )}
      <pre
        ref={preRef}
        className={cn(
          "overflow-x-auto rounded-lg border border-[var(--line)] bg-[oklch(0.16_0.003_80)] text-[oklch(0.94_0.003_80)]",
          language && "rounded-t-none border-t-0",
          s.pre,
          className,
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  );
}

// ─── Component factory ────────────────────────────────────────────────

export function createMarkdownComponents(
  variant: MarkdownVariant = "prose",
  overrides?: Partial<StrictMarkdownComponents>,
): StrictMarkdownComponents {
  const s = variantStyles[variant];

  const components: StrictMarkdownComponents = {
    h1: ({ className, ...props }) => <h1 className={cn(s.h1, "text-[var(--ink)]", className)} {...props} />,
    h2: ({ className, ...props }) => <h2 className={cn(s.h2, "text-[var(--ink)]", className)} {...props} />,
    h3: ({ className, ...props }) => <h3 className={cn(s.h3, "text-[var(--ink)]", className)} {...props} />,
    h4: ({ className, ...props }) => <h4 className={cn(s.h4, "text-[var(--ink)]", className)} {...props} />,
    h5: ({ className, ...props }) => <h5 className={cn(s.h5, "text-[var(--ink)]", className)} {...props} />,
    h6: ({ className, ...props }) => <h6 className={cn(s.h6, className)} {...props} />,
    p: ({ className, ...props }) => <p className={cn(s.p, "text-[var(--ink)]", className)} {...props} />,
    a: ({ className, ...props }) => <a className={cn(s.a, className)} {...props} />,
    strong: ({ className, ...props }) => <strong className={cn("font-semibold text-[var(--ink)]", className)} {...props} />,
    em: ({ className, ...props }) => <em className={cn("italic", className)} {...props} />,
    ul: ({ className, ...props }) => <ul className={cn(s.ul, className)} {...props} />,
    ol: ({ className, ...props }) => <ol className={cn(s.ol, className)} {...props} />,
    li: ({ className, ...props }) => <li className={cn(s.li, "text-[var(--ink)]", className)} {...props} />,
    blockquote: ({ className, ...props }) => <blockquote className={cn(s.blockquote, className)} {...props} />,
    hr: ({ className, ...props }) => <hr className={cn(s.hr, className)} {...props} />,
    table: ({ className, ...props }) => (
      <div className={cn(s.tableWrap, "overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]")}>
        <table className={cn(s.table, className)} {...props} />
      </div>
    ),
    thead: ({ className, ...props }) => <thead className={cn(s.thead, className)} {...props} />,
    tbody: ({ className, ...props }) => <tbody className={cn("align-top", className)} {...props} />,
    tr: ({ className, ...props }) => <tr className={cn(s.tr, className)} {...props} />,
    th: ({ className, ...props }) => <th className={cn(s.th, className)} {...props} />,
    td: ({ className, ...props }) => <td className={cn(s.td, className)} {...props} />,
    pre: (props) => <CodeBlockPre variant={variant} {...props} />,
    code: ({ className, ...props }) => {
      const isBlock = typeof className === "string" && /language-/.test(className);
      return <code className={cn(!isBlock && s.codeInline, className)} {...props} />;
    },
    sup: ({ className, ...props }) => <sup className={cn("[&>a]:text-xs [&>a]:no-underline", className)} {...props} />,
    input: ({ type, className, ...props }) => {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            className={cn(
              "mr-2 mt-0.5 size-4 shrink-0 rounded border-[var(--line)] accent-[var(--teal)] align-middle",
              className,
            )}
            {...props}
          />
        );
      }
      return <input type={type} className={className} {...props} />;
    },
  };

  return overrides ? { ...components, ...overrides } : components;
}
