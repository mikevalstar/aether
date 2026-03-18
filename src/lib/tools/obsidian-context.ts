/**
 * Shared per-request context for obsidian tools.
 * Tracks which files have been read and their modification times,
 * so obsidian_write can verify reads happened before writes.
 */
export type ObsidianToolContext = {
  /** Map of normalized relative path → modifiedAt ISO string from the last read */
  readFiles: Map<string, string>;
  /** User ID for activity logging */
  userId: string;
  /** Chat thread ID for cross-referencing activity with chat */
  chatThreadId?: string;
};

export function createObsidianToolContext(userId: string, chatThreadId?: string): ObsidianToolContext {
  return { readFiles: new Map(), userId, chatThreadId };
}
