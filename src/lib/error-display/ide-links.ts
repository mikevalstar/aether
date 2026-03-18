import type { IDEResolver, IDEType } from "./types";

export const IDE_OPTIONS: IDEResolver[] = [
  { id: "vscode", label: "VS Code", deepLinkPrefix: "vscode://file" },
  { id: "cursor", label: "Cursor", deepLinkPrefix: "cursor://file" },
  { id: "zed", label: "Zed", deepLinkPrefix: "zed://file" },
  { id: "windsurf", label: "Windsurf", deepLinkPrefix: "windsurf://file" },
];

const STORAGE_KEY = "error-display-ide";

export function getStoredIDE(): IDEType {
  if (typeof window === "undefined") return "vscode";

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && IDE_OPTIONS.some((opt) => opt.id === stored)) {
      return stored as IDEType;
    }
  } catch {
    // localStorage unavailable
  }

  return "vscode";
}

export function setStoredIDE(ide: IDEType): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, ide);
  } catch {
    // localStorage unavailable
  }
}

export function getIDEResolver(ide: IDEType): IDEResolver {
  return IDE_OPTIONS.find((opt) => opt.id === ide) || IDE_OPTIONS[0];
}

export function generateIDELink(filePath: string, line: number, column: number, ide: IDEType = getStoredIDE()): string {
  const resolver = getIDEResolver(ide);
  // Ensure absolute path
  const absolutePath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${resolver.deepLinkPrefix}${absolutePath}:${line}:${column}`;
}

export function openInIDE(filePath: string, line: number, column: number = 1, ide?: IDEType): void {
  const resolvedIDE = ide || getStoredIDE();
  const link = generateIDELink(filePath, line, column, resolvedIDE);
  window.open(link, "_blank");
}
