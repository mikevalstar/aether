/**
 * Shared per-request context for obsidian tools.
 * Tracks which files have been read and their modification times,
 * so obsidian_write can verify reads happened before writes.
 */
export type ObsidianToolContext = {
	/** Map of normalized relative path → modifiedAt ISO string from the last read */
	readFiles: Map<string, string>;
};

export function createObsidianToolContext(): ObsidianToolContext {
	return { readFiles: new Map() };
}
