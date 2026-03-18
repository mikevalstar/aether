import { useEffect, useState } from "react";
import type { CodeFrameProps } from "./types";

export function CodeFrame({ filePath, line, column = 1, sourceCode, contextLines = 3 }: CodeFrameProps) {
  const [code, setCode] = useState<string | null>(sourceCode || null);
  const [loading, setLoading] = useState(!sourceCode);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sourceCode) return;

    const fetchSource = async () => {
      try {
        const url = filePath.startsWith("src/") ? `/${filePath}` : filePath;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Not found");
        const text = await response.text();
        setCode(text);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSource();
  }, [filePath, sourceCode]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <span>Loading source...</span>
      </div>
    );
  }

  if (error || !code) {
    return (
      <div style={styles.error}>
        <span>Unable to load source file</span>
      </div>
    );
  }

  const lines = code.split("\n");
  const startLine = Math.max(1, line - contextLines);
  const endLine = Math.min(lines.length, line + contextLines);
  const displayLines = lines.slice(startLine - 1, endLine);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.filePath}>{filePath}</span>
        <span style={styles.location}>
          line {line}, col {column}
        </span>
      </div>
      <div style={styles.codeWrapper}>
        {displayLines.map((codeLine, idx) => {
          const lineNum = startLine + idx;
          const isErrorLine = lineNum === line;
          return (
            <div
              key={lineNum}
              style={{
                ...styles.line,
                ...(isErrorLine ? styles.errorLine : {}),
              }}
            >
              <span style={styles.lineNum}>{lineNum}</span>
              <span style={styles.lineContent}>{codeLine || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "var(--surface)",
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid var(--line)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    background: "var(--muted)",
    borderBottom: "1px solid var(--line)",
  },
  filePath: {
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    color: "var(--ink-soft)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  location: {
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    color: "var(--ink-dim)",
    flexShrink: 0,
    marginLeft: 12,
  },
  codeWrapper: {
    padding: "8px 0",
    overflow: "auto",
    maxHeight: 180,
  },
  line: {
    display: "flex",
    padding: "0 12px",
    lineHeight: 1.5,
  },
  errorLine: {
    background: "color-mix(in srgb, var(--destructive-foreground) 15%, transparent)",
  },
  lineNum: {
    display: "block",
    width: 32,
    minWidth: 32,
    textAlign: "right" as const,
    paddingRight: 12,
    marginRight: 8,
    color: "var(--ink-dim)",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    userSelect: "none" as const,
    flexShrink: 0,
    borderRight: "1px solid var(--line)",
  },
  lineContent: {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "var(--ink)",
    whiteSpace: "pre" as const,
    minWidth: 0,
  },
  loading: {
    padding: "16px",
    fontSize: 12,
    color: "var(--ink-dim)",
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    background: "var(--surface)",
    borderRadius: 6,
    border: "1px solid var(--line)",
  },
  error: {
    padding: "16px",
    fontSize: 12,
    color: "var(--ink-soft)",
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    background: "var(--surface)",
    borderRadius: 6,
    border: "1px solid var(--line)",
  },
};
