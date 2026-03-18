/**
 * Parser and serializer for Obsidian Kanban plugin Markdown format.
 *
 * File format:
 * - Frontmatter: `kanban-plugin: board`
 * - Columns: `## Heading`
 * - Tasks: `- [ ] text` or `- [x] text`
 * - Archive section (`## Archive`) is preserved but hidden from parsed output
 * - Footer: `%% kanban:settings` block preserved verbatim
 */

export interface KanbanTask {
  id: string;
  text: string;
  checked: boolean;
}

export interface KanbanColumn {
  name: string;
  tasks: KanbanTask[];
}

export interface KanbanBoard {
  columns: KanbanColumn[];
  /** Raw frontmatter block (including ---) to preserve on write */
  rawFrontmatter: string;
  /** Raw archive section to preserve on write */
  rawArchive: string;
  /** Raw kanban:settings footer to preserve on write */
  rawSettings: string;
}

let nextId = 0;
function generateId(): string {
  return `task-${Date.now()}-${nextId++}`;
}

export function parseKanbanFile(content: string): KanbanBoard {
  const lines = content.split("\n");

  let rawFrontmatter = "";
  let rawArchive = "";
  let rawSettings = "";

  // Extract frontmatter
  let bodyStart = 0;
  if (lines[0]?.trim() === "---") {
    const endIdx = lines.indexOf("---", 1);
    if (endIdx !== -1) {
      rawFrontmatter = lines.slice(0, endIdx + 1).join("\n");
      bodyStart = endIdx + 1;
    }
  }

  // Extract settings footer
  const settingsIdx = lines.findIndex((l) => l.trim().startsWith("%% kanban:settings"));
  if (settingsIdx !== -1) {
    rawSettings = lines.slice(settingsIdx).join("\n");
  }
  const bodyEnd = settingsIdx !== -1 ? settingsIdx : lines.length;

  // Find archive section
  let archiveStart = -1;
  for (let i = bodyStart; i < bodyEnd; i++) {
    if (/^##\s+Archive\s*$/i.test(lines[i])) {
      archiveStart = i;
      break;
    }
  }

  if (archiveStart !== -1) {
    rawArchive = lines.slice(archiveStart, bodyEnd).join("\n");
  }

  const contentEnd = archiveStart !== -1 ? archiveStart : bodyEnd;

  // Parse columns and tasks
  const columns: KanbanColumn[] = [];
  let currentColumn: KanbanColumn | null = null;

  for (let i = bodyStart; i < contentEnd; i++) {
    const line = lines[i];
    const columnMatch = line.match(/^##\s+(.+)$/);
    if (columnMatch) {
      currentColumn = { name: columnMatch[1].trim(), tasks: [] };
      columns.push(currentColumn);
      continue;
    }

    if (currentColumn) {
      const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        currentColumn.tasks.push({
          id: generateId(),
          text: taskMatch[2].trim(),
          checked: taskMatch[1].toLowerCase() === "x",
        });
      }
    }
  }

  return { columns, rawFrontmatter, rawArchive, rawSettings };
}

export function serializeKanbanBoard(board: KanbanBoard): string {
  const parts: string[] = [];

  if (board.rawFrontmatter) {
    parts.push(board.rawFrontmatter);
    parts.push("");
  }

  for (const column of board.columns) {
    parts.push(`## ${column.name}`);
    parts.push("");
    for (const task of column.tasks) {
      const check = task.checked ? "x" : " ";
      parts.push(`- [${check}] ${task.text}`);
    }
    parts.push("");
    parts.push("");
  }

  if (board.rawArchive) {
    parts.push("***");
    parts.push("");
    parts.push(board.rawArchive);
    parts.push("");
  }

  if (board.rawSettings) {
    parts.push(board.rawSettings);
  }

  return parts.join("\n");
}
