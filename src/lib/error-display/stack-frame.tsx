import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { CodeFrame } from "./code-frame";
import { getStoredIDE, openInIDE } from "./ide-links";
import type { StackFrameRowProps } from "./types";

export function StackFrameRow({ frame, isUserCode, projectRoot, onToggle }: StackFrameRowProps) {
  const [showCode, setShowCode] = useState(false);

  const handleOpenInIDE = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (frame.file && frame.line) {
      openInIDE(frame.file, frame.line, frame.column);
    }
  };

  const handleToggleCode = () => {
    setShowCode(!showCode);
    onToggle();
  };

  const displayPath = projectRoot ? frame.file.replace(projectRoot, "").replace(/^\//, "") : frame.file;

  return (
    <div style={isUserCode ? frameRowStyles.userCodeContainer : frameRowStyles.internalContainer}>
      <div style={frameRowStyles.row}>
        <button
          type="button"
          style={frameRowStyles.header}
          onClick={handleToggleCode}
          onKeyDown={(e) => e.key === "Enter" && handleToggleCode()}
        >
          <span style={frameRowStyles.expandIcon}>{showCode ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          <span style={frameRowStyles.functionName}>{frame.functionName}</span>
        </button>
        {frame.file && (
          <span style={frameRowStyles.fileInfo}>
            <span style={frameRowStyles.filePath}>{displayPath || frame.file}</span>
            <span style={frameRowStyles.lineNumber}>:{frame.line}</span>
          </span>
        )}
        {frame.isNative && <span style={frameRowStyles.nativeLabel}>[native]</span>}
        {frame.file && frame.line > 0 && (
          <button
            type="button"
            style={frameRowStyles.ideButton}
            onClick={handleOpenInIDE}
            title={`Open in ${getStoredIDE()}`}
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>
      {showCode && frame.file && frame.line > 0 && (
        <div style={frameRowStyles.codeWrapper}>
          <CodeFrame filePath={frame.file} line={frame.line} column={frame.column} />
        </div>
      )}
    </div>
  );
}

const frameRowStyles = {
  userCodeContainer: {
    borderBottom: "1px solid var(--line)",
    background: "transparent",
  },
  internalContainer: {
    borderBottom: "1px solid var(--line)",
    background: "var(--surface)",
    opacity: 0.8,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    minWidth: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    background: "transparent",
    border: "none",
    padding: 0,
    fontFamily: "var(--font-sans)",
    fontSize: "inherit",
    color: "inherit",
    flexShrink: 0,
  },
  expandIcon: {
    color: "var(--ink-dim)",
    display: "flex",
    alignItems: "center",
  },
  functionName: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--ink)",
    maxWidth: 180,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    minWidth: 0,
    flex: 1,
  },
  filePath: {
    color: "var(--ink-soft)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  lineNumber: {
    color: "var(--ink-dim)",
    flexShrink: 0,
  },
  ideButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 6px",
    background: "var(--muted)",
    border: "1px solid var(--line)",
    borderRadius: 4,
    cursor: "pointer",
    color: "var(--ink-soft)",
    flexShrink: 0,
    marginLeft: "auto",
  },
  nativeLabel: {
    fontSize: 10,
    fontFamily: "var(--font-mono)",
    color: "var(--ink-dim)",
    fontStyle: "italic" as const,
    flexShrink: 0,
  },
  codeWrapper: {
    padding: "0 12px 12px 12px",
  },
};
