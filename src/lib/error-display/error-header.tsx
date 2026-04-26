import { AlertCircle, Copy, RotateCcw, X } from "lucide-react";
import { IDESelector } from "./ide-selector";
import type { ErrorHeaderProps } from "./types";

export function ErrorHeader({ type, message, url, onCopy, onRetry, onDismiss, copied }: ErrorHeaderProps) {
  return (
    <div style={headerStyles.container}>
      <div style={headerStyles.topRow}>
        <div style={headerStyles.iconWrapper}>
          <AlertCircle size={18} style={{ color: "var(--destructive-foreground)" }} />
        </div>
        <div style={headerStyles.content}>
          <span style={headerStyles.type}>{type}</span>
          <span style={headerStyles.message}>{message}</span>
        </div>
        <div style={headerStyles.actions}>
          <IDESelector />
          <button
            type="button"
            onClick={onCopy}
            style={{
              ...headerStyles.button,
              color: copied ? "var(--accent)" : "var(--ink-soft)",
            }}
            title="Copy error to clipboard"
          >
            <Copy size={13} />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          {onRetry && (
            <button type="button" onClick={onRetry} style={headerStyles.button} title="Try again">
              <RotateCcw size={13} />
              <span>Retry</span>
            </button>
          )}
          {onDismiss && (
            <button type="button" onClick={onDismiss} style={{ ...headerStyles.button, padding: "4px 6px" }} title="Dismiss">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      {url && (
        <div style={headerStyles.urlRow}>
          <span style={headerStyles.urlLabel}>URL:</span>
          <code style={headerStyles.url}>{url}</code>
        </div>
      )}
    </div>
  );
}

const headerStyles = {
  container: {
    padding: "14px 16px",
    borderBottom: "1px solid var(--line)",
  },
  topRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrapper: {
    flexShrink: 0,
    marginTop: 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  type: {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--destructive-foreground)",
    marginBottom: 4,
  },
  message: {
    display: "block",
    color: "var(--ink)",
    fontSize: 13,
    lineHeight: 1.5,
    wordBreak: "break-word" as const,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "var(--muted)",
    border: "1px solid var(--line)",
    borderRadius: 5,
    padding: "4px 10px",
    fontSize: 11,
    fontFamily: "var(--font-sans)",
    color: "var(--ink-soft)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  urlRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    padding: "8px 10px",
    background: "var(--surface)",
    borderRadius: 4,
  },
  urlLabel: {
    fontSize: 10,
    color: "var(--ink-dim)",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  url: {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "var(--ink-soft)",
    wordBreak: "break-all" as const,
  },
};
