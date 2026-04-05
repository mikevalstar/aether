import type { ObsidianDocument, ObsidianTreeNode } from "#/lib/obsidian/obsidian";

/** Simplified tree node for scoped navigations (no AI config/memory flags). */
export type ScopedTreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: ScopedTreeNode[];
    }
  | {
      type: "file";
      name: string;
      title: string;
      /** Route path relative to the editor base (e.g. "daily-summary") */
      routePath: string;
      /** Relative path within the obsidian vault */
      relativePath: string;
    };

/** Data returned by the scoped editor loader. */
export type ConfigEditorData = {
  tree: ScopedTreeNode[];
  document: ObsidianDocument | null;
  requestedFilename: string;
  configured: boolean;
  /** User's preferred timezone from settings, if set */
  userTimezone?: string;
};

/** Props for the reusable editor shell. */
export type ConfigEditorShellProps = {
  data: ConfigEditorData;
  /** Label shown in the nav header (e.g. "Tasks", "Workflows") */
  navLabel: string;
  /** Icon component for the nav header */
  navIcon: React.ComponentType<{ className?: string }>;
  /** Base route for building links (e.g. "/tasks/editor") */
  basePath: string;
  /** Render the frontmatter display area above the markdown editor */
  renderFrontmatter?: (document: ObsidianDocument, onRefresh: () => void, data: ConfigEditorData) => React.ReactNode;
  /** Called after a successful save */
  onSaved?: () => void;
};

/** Convert full ObsidianTreeNode[] to simplified ScopedTreeNode[] */
export function toScopedTree(nodes: ObsidianTreeNode[]): ScopedTreeNode[] {
  return nodes.map((node) => {
    if (node.type === "folder") {
      return {
        type: "folder" as const,
        name: node.name,
        path: node.path,
        children: toScopedTree(node.children),
      };
    }
    return {
      type: "file" as const,
      name: node.name,
      title: node.title,
      routePath: node.routePath,
      relativePath: node.relativePath,
    };
  });
}
