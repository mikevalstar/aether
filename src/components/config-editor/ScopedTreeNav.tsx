import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, FileTextIcon, FolderTreeIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "#/components/ui/input";
import { cn } from "#/lib/utils";
import type { ScopedTreeNode } from "./types";

type ScopedTreeNavProps = {
  nodes: ScopedTreeNode[];
  /** Currently selected file's relative path */
  currentPath: string;
  /** Label shown in the header (e.g. "Tasks") */
  label: string;
  /** Icon for the header */
  icon: React.ComponentType<{ className?: string }>;
  /** Base route for links (e.g. "/tasks/editor") */
  basePath: string;
  /** Build the link href for a file node */
  getHref: (node: ScopedTreeNode & { type: "file" }) => string;
  /** Optional action button in the header (e.g. "New Task") */
  headerAction?: ReactNode;
};

const EXPANDED_PREFIX = "aether:config-editor:expanded:";

function loadExpanded(key: string): Set<string> {
  try {
    const stored = localStorage.getItem(EXPANDED_PREFIX + key);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveExpanded(key: string, set: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_PREFIX + key, JSON.stringify([...set]));
  } catch {}
}

function getAncestorPaths(filePath: string): string[] {
  const segments = filePath.split("/");
  const paths: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    paths.push(segments.slice(0, i).join("/"));
  }
  return paths;
}

function filterTree(nodes: ScopedTreeNode[], query: string): ScopedTreeNode[] {
  const lower = query.toLowerCase();
  const result: ScopedTreeNode[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      if (node.title.toLowerCase().includes(lower) || node.name.toLowerCase().includes(lower)) {
        result.push(node);
      }
    } else {
      const filteredChildren = filterTree(node.children, query);
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
  }

  return result;
}

export function ScopedTreeNav({
  nodes,
  currentPath,
  label,
  icon: Icon,
  basePath,
  getHref,
  headerAction,
}: ScopedTreeNavProps) {
  const storageKey = basePath.replace(/\//g, "-");

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const stored = loadExpanded(storageKey);
    for (const p of getAncestorPaths(currentPath)) {
      stored.add(p);
    }
    return stored;
  });

  useEffect(() => {
    saveExpanded(storageKey, expanded);
  }, [expanded, storageKey]);

  useEffect(() => {
    setExpanded((prev) => {
      const ancestors = getAncestorPaths(currentPath);
      let changed = false;
      const next = new Set(prev);
      for (const p of ancestors) {
        if (!next.has(p)) {
          next.add(p);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [currentPath]);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  const isSearching = search.trim().length > 0;
  const filteredNodes = useMemo(
    () => (isSearching ? filterTree(nodes, search.trim()) : nodes),
    [nodes, search, isSearching],
  );

  return (
    <div className="surface-card h-fit overflow-hidden lg:sticky lg:top-24">
      <div className="border-b border-[var(--line)] bg-[var(--teal-subtle)] px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">{label}</p>
            <h1 className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
              <Icon className="size-4 text-[var(--teal)]" />
              Editor
            </h1>
          </div>
          {headerAction}
        </div>
      </div>

      <div className="border-b border-[var(--line)] px-3 py-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-soft)]/50" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <nav className="max-h-[calc(100vh-16rem)] overflow-y-auto px-3 py-3">
        {filteredNodes.length > 0 ? (
          <TreeList
            nodes={filteredNodes}
            currentPath={currentPath}
            expanded={expanded}
            toggleFolder={toggleFolder}
            isSearching={isSearching}
            getHref={getHref}
            depth={0}
          />
        ) : (
          <p className="px-2 py-4 text-center text-sm text-[var(--ink-soft)]">
            {isSearching ? "No files match your search." : "No files found."}
          </p>
        )}
      </nav>
    </div>
  );
}

function TreeList(props: {
  nodes: ScopedTreeNode[];
  currentPath: string;
  expanded: Set<string>;
  toggleFolder: (path: string) => void;
  isSearching: boolean;
  getHref: (node: ScopedTreeNode & { type: "file" }) => string;
  depth: number;
}) {
  return (
    <ul className={cn("space-y-0.5", props.depth ? "mt-0.5" : "")}>
      {props.nodes.map((node) => (
        <li key={node.type === "folder" ? node.path : node.relativePath}>
          {node.type === "folder" ? (
            <FolderNode
              node={node}
              currentPath={props.currentPath}
              expanded={props.expanded}
              toggleFolder={props.toggleFolder}
              isSearching={props.isSearching}
              getHref={props.getHref}
              depth={props.depth}
            />
          ) : (
            <TreeNavLink
              href={props.getHref(node)}
              isActive={node.relativePath === props.currentPath}
              depth={props.depth}
              title={node.title}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function FolderNode(props: {
  node: ScopedTreeNode & { type: "folder" };
  currentPath: string;
  expanded: Set<string>;
  toggleFolder: (path: string) => void;
  isSearching: boolean;
  getHref: (node: ScopedTreeNode & { type: "file" }) => string;
  depth: number;
}) {
  const { node } = props;
  const isExpanded = props.isSearching || props.expanded.has(node.path);

  return (
    <div>
      <button
        type="button"
        onClick={() => props.toggleFolder(node.path)}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)] hover:bg-[var(--accent)] transition-colors"
        style={{ paddingLeft: `${props.depth * 14 + 10}px` }}
      >
        <ChevronRightIcon className={cn("size-3 shrink-0 transition-transform duration-150", isExpanded && "rotate-90")} />
        <FolderTreeIcon className="size-3.5 text-[var(--teal)]/50" />
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && (
        <TreeList
          nodes={node.children}
          currentPath={props.currentPath}
          expanded={props.expanded}
          toggleFolder={props.toggleFolder}
          isSearching={props.isSearching}
          getHref={props.getHref}
          depth={props.depth + 1}
        />
      )}
    </div>
  );
}

function TreeNavLink(props: { href: string; isActive: boolean; depth: number; title: string }) {
  return (
    <Link
      to={props.href}
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm no-underline transition-colors",
        props.isActive
          ? "bg-[var(--teal)]/10 font-medium text-[var(--teal)]"
          : "text-[var(--ink-soft)] hover:bg-[var(--accent)] hover:text-[var(--ink)]",
      )}
      style={{ paddingLeft: `${props.depth * 14 + 10}px` }}
    >
      {props.isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--teal)]" aria-hidden />
      )}
      <FileTextIcon
        className={cn(
          "size-4 shrink-0",
          props.isActive ? "text-[var(--teal)]" : "text-[var(--ink-soft)]/50 group-hover:text-[var(--ink-soft)]",
        )}
      />
      <span className="truncate">{props.title}</span>
    </Link>
  );
}
