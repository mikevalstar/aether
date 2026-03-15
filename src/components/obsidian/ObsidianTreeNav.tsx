import { Link } from "@tanstack/react-router";
import {
	BookOpenIcon,
	BrainIcon,
	ChevronRightIcon,
	FileTextIcon,
	FolderTreeIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Input } from "#/components/ui/input";
import { getObsidianHref, type ObsidianTreeNode } from "#/lib/obsidian";
import { cn } from "#/lib/utils";

type ObsidianTreeNavProps = {
	nodes: ObsidianTreeNode[];
	aiConfigPath: string | null;
	aiMemoryPath: string | null;
	currentRoutePath: string;
};

const EXPANDED_KEY = "aether:obsidian:expanded";

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

function getAncestorPaths(routePath: string): string[] {
	const segments = routePath.split("/");
	const paths: string[] = [];
	for (let i = 1; i < segments.length; i++) {
		paths.push(segments.slice(0, i).join("/"));
	}
	return paths;
}

function filterTree(
	nodes: ObsidianTreeNode[],
	query: string,
): ObsidianTreeNode[] {
	const lower = query.toLowerCase();
	const result: ObsidianTreeNode[] = [];

	for (const node of nodes) {
		if (node.type === "file") {
			if (
				node.title.toLowerCase().includes(lower) ||
				node.name.toLowerCase().includes(lower)
			) {
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

export function ObsidianTreeNav({
	nodes,
	aiConfigPath,
	aiMemoryPath,
	currentRoutePath,
}: ObsidianTreeNavProps) {
	const [search, setSearch] = useState("");
	const [expanded, setExpanded] = useState<Set<string>>(() => {
		const stored = loadExpanded();
		// Auto-expand path to current document
		for (const p of getAncestorPaths(currentRoutePath)) {
			stored.add(p);
		}
		return stored;
	});

	useEffect(() => {
		saveExpanded(expanded);
	}, [expanded]);

	// Auto-expand to current doc when it changes
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

	const isSearching = search.trim().length > 0;
	const filteredNodes = useMemo(
		() => (isSearching ? filterTree(nodes, search.trim()) : nodes),
		[nodes, search, isSearching],
	);

	// Split out AI config and AI memory folders from rest
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
		<div className="surface-card h-fit overflow-hidden lg:sticky lg:top-24">
			<div className="border-b border-[var(--line)] bg-[var(--teal-subtle)] px-5 py-4">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
					Obsidian
				</p>
				<h1 className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
					<BookOpenIcon className="size-4 text-[var(--teal)]" />
					Vault Browser
				</h1>
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

			{aiConfigNode && aiConfigNode.type === "folder" && (
				<div className="border-b border-[var(--coral)]/20 bg-[var(--coral)]/5 px-3 py-2">
					<div className="mb-1 flex items-center gap-1.5 px-2">
						<SparklesIcon className="size-3 text-[var(--coral)]" />
						<span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--coral)]">
							AI Config
						</span>
					</div>
					<TreeList
						nodes={aiConfigNode.children}
						currentRoutePath={currentRoutePath}
						expanded={expanded}
						toggleFolder={toggleFolder}
						isSearching={isSearching}
						depth={0}
					/>
				</div>
			)}

			{aiMemoryNode && aiMemoryNode.type === "folder" && (
				<div className="border-b border-[var(--teal)]/20 bg-[var(--teal)]/5 px-3 py-2">
					<div className="mb-1 flex items-center gap-1.5 px-2">
						<BrainIcon className="size-3 text-[var(--teal)]" />
						<span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--teal)]">
							AI Memory
						</span>
					</div>
					<TreeList
						nodes={aiMemoryNode.children}
						currentRoutePath={currentRoutePath}
						expanded={expanded}
						toggleFolder={toggleFolder}
						isSearching={isSearching}
						depth={0}
					/>
				</div>
			)}

			<nav className="max-h-[calc(100vh-16rem)] overflow-y-auto px-3 py-3">
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
					<p className="px-2 py-4 text-center text-sm text-[var(--ink-soft)]">
						{isSearching ? "No files match your search." : "No files found."}
					</p>
				)}
			</nav>
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
		<ul className={cn("space-y-0.5", props.depth ? "mt-0.5" : "")}>
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
				className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)] hover:bg-[var(--accent)] transition-colors"
				style={{
					paddingLeft: `${props.depth * 14 + 10}px`,
				}}
			>
				<ChevronRightIcon
					className={cn(
						"size-3 shrink-0 transition-transform duration-150",
						isExpanded && "rotate-90",
					)}
				/>
				<FolderTreeIcon className="size-3.5 text-[var(--teal)]/50" />
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

function TreeNavLink(props: {
	routePath: string;
	isActive: boolean;
	depth: number;
	title: string;
}) {
	return (
		<Link
			to={getObsidianHref(props.routePath)}
			className={cn(
				"group relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm no-underline transition-colors",
				props.isActive
					? "bg-[var(--teal)]/10 font-medium text-[var(--teal)]"
					: "text-[var(--ink-soft)] hover:bg-[var(--accent)] hover:text-[var(--ink)]",
			)}
			style={{
				paddingLeft: `${props.depth * 14 + 10}px`,
			}}
		>
			{props.isActive && (
				<span
					className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--teal)]"
					aria-hidden
				/>
			)}
			<FileTextIcon
				className={cn(
					"size-4 shrink-0",
					props.isActive
						? "text-[var(--teal)]"
						: "text-[var(--ink-soft)]/50 group-hover:text-[var(--ink-soft)]",
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
		<Link
			to={`${getObsidianHref(routePath)}${hash ?? ""}`}
			className={className}
			{...rest}
		>
			{children}
		</Link>
	);
}
