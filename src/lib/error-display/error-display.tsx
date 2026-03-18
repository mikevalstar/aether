import { useState } from "react";
import { toast } from "#/components/ui/sonner";
import { ErrorHeader } from "./error-header";
import { formatErrorForCopy, parseError } from "./parser";
import { StackTrace } from "./stack-trace";
import type { ErrorDisplayProps, ParsedError } from "./types";

export function ErrorDisplay({
  error,
  defaultExpanded = true,
  onRetry,
  onDismiss,
  showURL = true,
  projectRoot,
}: ErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  const parsed: ParsedError = parseError(
    error,
    showURL ? (typeof window !== "undefined" ? window.location.href : undefined) : undefined,
  );

  const handleCopy = async () => {
    const text = formatErrorForCopy(parsed);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Error copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div style={displayStyles.container}>
      <ErrorHeader
        type={parsed.type}
        message={parsed.message}
        url={parsed.url}
        onCopy={handleCopy}
        onRetry={onRetry}
        onDismiss={onDismiss}
        copied={copied}
      />
      {parsed.frames.length > 0 ? (
        <StackTrace frames={parsed.frames} projectRoot={projectRoot} defaultExpanded={defaultExpanded} />
      ) : parsed.stack ? (
        <RawStackTrace stack={parsed.stack} />
      ) : null}
    </div>
  );
}

function RawStackTrace({ stack }: { stack: string }) {
  return (
    <div style={rawStyles.container}>
      <div style={rawStyles.header}>Stack Trace</div>
      <pre style={rawStyles.code}>{stack}</pre>
    </div>
  );
}

const displayStyles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    background: "var(--bg)",
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
    overflow: "auto",
  },
};

const rawStyles = {
  container: {
    flex: 1,
    overflow: "auto",
    background: "var(--surface)",
  },
  header: {
    padding: "10px 14px",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-soft)",
    borderBottom: "1px solid var(--line)",
    background: "var(--muted)",
  },
  code: {
    margin: 0,
    padding: "12px 14px",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "var(--ink-soft)",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    lineHeight: 1.6,
  },
};
