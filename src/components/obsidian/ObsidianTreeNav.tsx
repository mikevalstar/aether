import { Link } from "@tanstack/react-router";
import { BrainIcon, ChevronRightIcon, FileTextIcon, FolderIcon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { getObsidianHref, type ObsidianTreeNode } from "#/lib/obsidian/obsidian";
import { cn } from "#/lib/utils";
import { NewFileDialog } from "./NewFileDialog";

type ObsidianTreeNavProps = {
  nodes: ObsidianTreeNode[];
  aiConfigPath: string | null;
  aiMemoryPath: string | null;
  currentRoutePath: string;
};

const EXPANDED_KEY = "aether:obsidian:expanded";
const SECTIONS_KEY = "aether:obsidian:sections";

function loadExpanded(): Set<string> {
  try {
    const stored = localStorage.getItem(EXPANDED_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
}

function saveExpanded(set: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]));
  } catch {}
}

function loadSectionCollapsed(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(SECTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveSectionCollapsed(state: Record<string, boolean>) {
  try {
    localStorage.setItem(SECTIONS_KEY, JSON.stringify(state));
  } catch {}
}

function getAncestorPaths(routePath: string): string[] {
  const segments = routePath.split("/");
  const paths: string[] = [];
  for (let i = 1; i < segments.length; i++) {
    paths.push(segments.slice(0, i).join("/"));
  }
  return paths;
}

function filterTree(nodes: ObsidianTreeNode[], query: string): ObsidianTreeNode[] {
  const lower = query.toLowerCase();
  const result: ObsidianTreeNode[] = [];

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

export function ObsidianTreeNav({ nodes, aiConfigPath, aiMemoryPath, currentRoutePath }: ObsidianTreeNavProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const stored = loadExpanded();
    for (const p of getAncestorPaths(currentRoutePath)) {
      stored.add(p);
    }
    return stored;
  });

  useEffect(() => {
    saveExpanded(expanded);
  }, [expanded]);

  useEffect(() => {
    setExpanded((prev) => {
      const ancestors = getAncestorPaths(currentRoutePath);
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
  }, [currentRoutePath]);

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

  const [newFileOpen, setNewFileOpen] = useState(false);
  const [sectionCollapsed, setSectionCollapsed] = useState(loadSectionCollapsed);

  const toggleSection = useCallback((key: string) => {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveSectionCollapsed(next);
      return next;
    });
  }, []);

  const isSearching = search.trim().length > 0;
  const filteredNodes = useMemo(
    () => (isSearching ? filterTree(nodes, search.trim()) : nodes),
    [nodes, search, isSearching],
  );

  const { aiConfigNode, aiMemoryNode, mainNodes } = useMemo(() => {
    if (!aiConfigPath && !aiMemoryPath)
      return {
        aiConfigNode: null,
        aiMemoryNode: null,
        mainNodes: filteredNodes,
      };

    let configNode: ObsidianTreeNode | null = null;
    let memoryNode: ObsidianTreeNode | null = null;
    const rest: ObsidianTreeNode[] = [];

    for (const node of filteredNodes) {
      if (node.type === "folder" && node.isAiConfig) {
        configNode = node;
      } else if (node.type === "folder" && node.isAiMemory) {
        memoryNode = node;
      } else {
        rest.push(node);
      }
    }

    return {
      aiConfigNode: configNode,
      aiMemoryNode: memoryNode,
      mainNodes: rest,
    };
  }, [filteredNodes, aiConfigPath, aiMemoryPath]);

  return (
    <div className="surface-card overflow-hidden lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.15em] text-[var(--ink-dim)]">Vault</p>
        <Button variant="outline" size="sm" className="h-7 px-2 text-[11.5px]" onClick={() => setNewFileOpen(true)}>
          <PlusIcon className="mr-1 size-3" />
          New
        </Button>
      </div>

      <NewFileDialog open={newFileOpen} onOpenChange={setNewFileOpen} />

      <div className="border-b border-[var(--line)] px-2 py-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {aiConfigNode && aiConfigNode.type === "folder" && (
          <SpecialSection
            label="AI Config"
            icon={SparklesIcon}
            color="var(--accent)"
            collapsed={!!sectionCollapsed.aiConfig}
            onToggle={() => toggleSection("aiConfig")}
          >
            <TreeList
              nodes={aiConfigNode.children}
              currentRoutePath={currentRoutePath}
              expanded={expanded}
              toggleFolder={toggleFolder}
              isSearching={isSearching}
              depth={0}
            />
          </SpecialSection>
        )}

        {aiMemoryNode && aiMemoryNode.type === "folder" && (
          <SpecialSection
            label="AI Memory"
            icon={BrainIcon}
            color="var(--accent)"
            collapsed={!!sectionCollapsed.aiMemory}
            onToggle={() => toggleSection("aiMemory")}
          >
            <TreeList
              nodes={aiMemoryNode.children}
              currentRoutePath={currentRoutePath}
              expanded={expanded}
              toggleFolder={toggleFolder}
              isSearching={isSearching}
              depth={0}
            />
          </SpecialSection>
        )}

        {(aiConfigNode || aiMemoryNode) && mainNodes.length > 0 && <div className="my-2 border-t border-[var(--line)]" />}

        {mainNodes.length > 0 ? (
          <TreeList
            nodes={mainNodes}
            currentRoutePath={currentRoutePath}
            expanded={expanded}
            toggleFolder={toggleFolder}
            isSearching={isSearching}
            depth={0}
          />
        ) : (
          !aiConfigNode &&
          !aiMemoryNode && (
            <p className="px-2 py-4 text-center text-[13px] text-[var(--ink-soft)]">
              {isSearching ? "No files match your search." : "No files found."}
            </p>
          )
        )}
      </nav>
    </div>
  );
}

function SpecialSection(props: {
  label: string;
  icon: typeof SparklesIcon;
  color: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const Icon = props.icon;
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--bg)]"
        style={{ color: props.color }}
      >
        <ChevronRightIcon
          className={cn("size-3 shrink-0 transition-transform duration-150", !props.collapsed && "rotate-90")}
        />
        <Icon className="size-3" />
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]">{props.label}</span>
      </button>
      {!props.collapsed && <div className="mt-px">{props.children}</div>}
    </div>
  );
}

function TreeList(props: {
  nodes: ObsidianTreeNode[];
  currentRoutePath: string;
  expanded: Set<string>;
  toggleFolder: (path: string) => void;
  isSearching: boolean;
  depth: number;
}) {
  return (
    <ul className={cn("space-y-px", props.depth ? "mt-px" : "")}>
      {props.nodes.map((node) => (
        <li key={node.type === "folder" ? node.path : node.relativePath}>
          {node.type === "folder" ? (
            <FolderNode
              node={node}
              currentRoutePath={props.currentRoutePath}
              expanded={props.expanded}
              toggleFolder={props.toggleFolder}
              isSearching={props.isSearching}
              depth={props.depth}
            />
          ) : (
            <TreeNavLink
              routePath={node.routePath}
              isActive={node.routePath === props.currentRoutePath}
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
  node: ObsidianTreeNode & { type: "folder" };
  currentRoutePath: string;
  expanded: Set<string>;
  toggleFolder: (path: string) => void;
  isSearching: boolean;
  depth: number;
}) {
  const { node } = props;
  const isExpanded = props.isSearching || props.expanded.has(node.path);

  return (
    <div>
      <button
        type="button"
        onClick={() => props.toggleFolder(node.path)}
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-dim)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--ink)]"
        style={{
          paddingLeft: `${props.depth * 12 + 8}px`,
        }}
      >
        <ChevronRightIcon
          className={cn(
            "size-3 shrink-0 text-[var(--ink-faint)] transition-transform duration-150",
            isExpanded && "rotate-90",
          )}
        />
        <FolderIcon className="size-3 text-[var(--ink-faint)]" />
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && (
        <TreeList
          nodes={node.children}
          currentRoutePath={props.currentRoutePath}
          expanded={props.expanded}
          toggleFolder={props.toggleFolder}
          isSearching={props.isSearching}
          depth={props.depth + 1}
        />
      )}
    </div>
  );
}

function TreeNavLink(props: { routePath: string; isActive: boolean; depth: number; title: string }) {
  return (
    <Link
      to={getObsidianHref(props.routePath)}
      className={cn(
        "group relative flex items-center gap-2 rounded-md py-1.5 pr-2 text-[13px] no-underline transition-colors",
        props.isActive
          ? "bg-[var(--accent)]/10 font-medium text-[var(--ink)]"
          : "text-[var(--ink-soft)] hover:bg-[var(--accent)]/5 hover:text-[var(--ink)]",
      )}
      style={{
        paddingLeft: `${props.depth * 12 + 8}px`,
      }}
    >
      {props.isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-(--accent)" aria-hidden />
      )}
      <FileTextIcon
        className={cn(
          "size-3.5 shrink-0",
          props.isActive ? "text-[var(--accent)]" : "text-[var(--ink-faint)] group-hover:text-[var(--ink-soft)]",
        )}
      />
      <span className="truncate">{props.title}</span>
    </Link>
  );
}

export function ObsidianNavLink({
  routePath,
  hash,
  children,
  className,
  ...rest
}: Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
  routePath: string;
  hash?: string;
  children: ReactNode;
}) {
  return (
    <Link to={`${getObsidianHref(routePath)}${hash ?? ""}`} className={className} {...rest}>
      {children}
    </Link>
  );
}
