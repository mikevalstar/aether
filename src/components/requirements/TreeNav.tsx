import { Link } from "@tanstack/react-router";
import { FileTextIcon, FolderTreeIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { getRequirementHref, type RequirementTreeNode } from "#/lib/requirements";
import { cn } from "#/lib/utils";
import { StatusBadge } from "./StatusBadge";

type TreeNavProps = {
	nodes: RequirementTreeNode[];
	currentRoutePath: string;
};

export function TreeNav({ nodes, currentRoutePath }: TreeNavProps) {
	return (
		<div className="surface-card h-fit overflow-hidden lg:sticky lg:top-24">
			<div className="border-b border-[var(--line)] bg-[var(--teal-subtle)] px-5 py-4">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">Requirements</p>
				<h1 className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
					<FolderTreeIcon className="size-4 text-[var(--teal)]" />
					Viewer
				</h1>
				<p className="mt-1 text-sm text-[var(--ink-soft)]">
					Browse the docs in <code className="text-[12px]">docs/requirements/</code> without leaving Aether.
				</p>
			</div>

			<nav className="max-h-[calc(100vh-10rem)] overflow-y-auto px-3 py-3">
				<TreeList nodes={nodes} currentRoutePath={currentRoutePath} />
			</nav>
		</div>
	);
}

function TreeList(props: { nodes: RequirementTreeNode[]; currentRoutePath: string; depth?: number }) {
	return (
		<ul className={cn("space-y-0.5", props.depth ? "mt-0.5" : "")}>
			{props.nodes.map((node) => (
				<li key={node.type === "folder" ? node.path : node.relativePath}>
					{node.type === "folder" ? (
						<div>
							<div
								className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]"
								style={{
									paddingLeft: `${(props.depth ?? 0) * 14 + 10}px`,
								}}
							>
								<FolderTreeIcon className="size-3.5 text-[var(--teal)]/50" />
								<span>{node.name}</span>
							</div>
							<TreeList nodes={node.children} currentRoutePath={props.currentRoutePath} depth={(props.depth ?? 0) + 1} />
						</div>
					) : (
						<TreeNavLink
							routePath={node.routePath}
							isActive={node.routePath === props.currentRoutePath}
							depth={props.depth ?? 0}
							title={node.title}
							status={node.status}
						/>
					)}
				</li>
			))}
		</ul>
	);
}

function TreeNavLink(props: { routePath: string; isActive: boolean; depth: number; title: string; status?: string }) {
	return (
		<Link
			to={getRequirementHref(props.routePath)}
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
				<span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--teal)]" aria-hidden />
			)}
			<FileTextIcon
				className={cn(
					"size-4 shrink-0",
					props.isActive ? "text-[var(--teal)]" : "text-[var(--ink-soft)]/50 group-hover:text-[var(--ink-soft)]",
				)}
			/>
			<span className="truncate">{props.title}</span>
			{props.status ? (
				<span className="ml-auto shrink-0">
					<StatusBadge status={props.status} size="sm" />
				</span>
			) : null}
		</Link>
	);
}

export function RequirementNavLink({
	routePath,
	hash,
	children,
	...rest
}: Omit<ComponentPropsWithoutRef<typeof Link>, "to"> & {
	routePath: string;
	hash?: string;
	children: ReactNode;
}) {
	return (
		<Link to={`${getRequirementHref(routePath)}${hash ?? ""}`} {...rest}>
			{children}
		</Link>
	);
}
