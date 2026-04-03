import { BookOpenIcon, FileTextIcon, FolderIcon } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";
import type { ObsidianTreeNode } from "#/lib/obsidian";

type ObsidianWelcomeProps = {
  tree: ObsidianTreeNode[];
};

function countNodes(nodes: ObsidianTreeNode[]): { files: number; folders: number } {
  let files = 0;
  let folders = 0;
  for (const node of nodes) {
    if (node.type === "file") {
      files++;
    } else {
      folders++;
      const sub = countNodes(node.children);
      files += sub.files;
      folders += sub.folders;
    }
  }
  return { files, folders };
}

export function ObsidianWelcome({ tree }: ObsidianWelcomeProps) {
  const counts = countNodes(tree);

  return (
    <EmptyState
      variant="centered"
      accentColor="var(--teal)"
      icon={BookOpenIcon}
      title="Obsidian Vault"
      description="Select a file from the tree to start reading, or use the search to find a specific page."
      footer={
        <>
          <span className="flex items-center gap-1.5">
            <FileTextIcon className="size-4" />
            {counts.files} {counts.files === 1 ? "file" : "files"}
          </span>
          <span className="flex items-center gap-1.5">
            <FolderIcon className="size-4" />
            {counts.folders} {counts.folders === 1 ? "folder" : "folders"}
          </span>
        </>
      }
    />
  );
}
