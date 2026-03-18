import { BookOpenIcon, FileTextIcon, FolderIcon } from "lucide-react";
import type { ObsidianTreeNode } from "#/lib/obsidian";

type ObsidianWelcomeProps = {
  tree: ObsidianTreeNode[];
};

function countNodes(nodes: ObsidianTreeNode[]): {
  files: number;
  folders: number;
} {
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
    <div className="flex min-h-[480px] items-center justify-center px-6 py-10 text-center">
      <div className="max-w-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--teal)]/10 text-[var(--teal)]">
          <BookOpenIcon className="size-6" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-[var(--ink)]">Obsidian Vault</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--ink-soft)]">
          Select a file from the tree to start reading, or use the search to find a specific page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[var(--ink-soft)]">
          <span className="flex items-center gap-1.5">
            <FileTextIcon className="size-4" />
            {counts.files} {counts.files === 1 ? "file" : "files"}
          </span>
          <span className="flex items-center gap-1.5">
            <FolderIcon className="size-4" />
            {counts.folders} {counts.folders === 1 ? "folder" : "folders"}
          </span>
        </div>
      </div>
    </div>
  );
}
