import {
	BookOpenTextIcon,
	CalendarDaysIcon,
	FileTextIcon,
	FolderTreeIcon,
	TriangleAlertIcon,
	UserRoundIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "#/components/ui/badge";
import {
	getRequirementHref,
	type RequirementDocument,
	type RequirementsViewerData,
	type RequirementTreeNode,
	resolveRequirementLinkTarget,
} from "#/lib/requirements";
import { cn } from "#/lib/utils";

type RequirementsViewerProps = {
	data: RequirementsViewerData;
};

export function RequirementsViewer({ data }: RequirementsViewerProps) {
	const document = data.document;

	return (
		<main className="mx-auto flex w-[min(1560px,calc(100%-2rem))] px-4 pb-12 pt-8 text-[14px]">
			<div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
				<aside className="surface-card h-fit overflow-hidden lg:sticky lg:top-24">
					<div className="border-b border-[var(--line)] px-5 py-4">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
							Requirements
						</p>
						<h1 className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
							<FolderTreeIcon className="size-4" />
							Viewer
						</h1>
						<p className="mt-1 text-sm text-[var(--ink-soft)]">
							Browse the docs in `docs/requirements/` without leaving Aether.
						</p>
					</div>

					<nav className="max-h-[calc(100vh-10rem)] overflow-y-auto px-3 py-3">
						<TreeList
							nodes={data.tree}
							currentRoutePath={document?.routePath ?? data.requestedPath}
						/>
					</nav>
				</aside>

				<section className="surface-card min-w-0 overflow-hidden">
					{document ? (
						<DocumentView document={document} />
					) : (
						<MissingDocument requestedPath={data.requestedPath} />
					)}
				</section>
			</div>
		</main>
	);
}

function TreeList(props: {
	nodes: RequirementTreeNode[];
	currentRoutePath: string;
	depth?: number;
}) {
	return (
		<ul className={cn("space-y-1", props.depth ? "mt-1" : "")}>
			{props.nodes.map((node) => (
				<li key={node.type === "folder" ? node.path : node.relativePath}>
					{node.type === "folder" ? (
						<div>
							<div
								className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]"
								style={{ paddingLeft: `${(props.depth ?? 0) * 14 + 10}px` }}
							>
								<FolderTreeIcon className="size-3.5" />
								<span>{node.name}</span>
							</div>
							<TreeList
								nodes={node.children}
								currentRoutePath={props.currentRoutePath}
								depth={(props.depth ?? 0) + 1}
							/>
						</div>
					) : (
						<RequirementNavLink
							routePath={node.routePath}
							className={cn(
								"flex items-center gap-2 rounded-md px-2.5 py-2 text-sm no-underline",
								node.routePath === props.currentRoutePath
									? "bg-[var(--accent)] text-[var(--ink)]"
									: "text-[var(--ink-soft)] hover:bg-[var(--accent)] hover:text-[var(--ink)]",
							)}
							style={{ paddingLeft: `${(props.depth ?? 0) * 14 + 10}px` }}
						>
							<FileTextIcon className="size-4 shrink-0" />
							<span className="truncate">{node.title}</span>
							{node.status ? (
								<Badge
									variant="outline"
									className="ml-auto shrink-0 text-[10px]"
								>
									{node.status}
								</Badge>
							) : null}
						</RequirementNavLink>
					)}
				</li>
			))}
		</ul>
	);
}

function DocumentView(props: { document: RequirementDocument }) {
	const { document } = props;
	const markdownComponents = getMarkdownComponents(document.relativePath);

	return (
		<div>
			<div className="border-b border-[var(--line)] px-6 py-5 sm:px-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
							Requirements doc
						</p>
						<h2 className="display-title mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
							{document.title}
						</h2>
						<p className="mt-2 text-sm text-[var(--ink-soft)]">
							{document.canonicalFile ??
								`docs/requirements/${document.relativePath}`}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-soft)]">
						{document.status ? <Badge>{document.status}</Badge> : null}
						{document.owner ? (
							<MetaPill icon={<UserRoundIcon className="size-3.5" />}>
								{document.owner}
							</MetaPill>
						) : null}
						{document.lastUpdated ? (
							<MetaPill icon={<CalendarDaysIcon className="size-3.5" />}>
								{document.lastUpdated}
							</MetaPill>
						) : null}
					</div>
				</div>
			</div>

			<div className="px-6 py-6 sm:px-8 sm:py-8">
				<div className="max-w-none text-[var(--ink)]">
					<Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
						{document.body}
					</Markdown>
				</div>
			</div>
		</div>
	);
}

function getMarkdownComponents(currentRelativePath: string): Components {
	return {
		h1: ({ className, ...props }) => (
			<h1
				className={cn(
					"display-title mt-10 mb-4 text-3xl font-bold tracking-tight text-[var(--ink)] first:mt-0 sm:text-[2rem]",
					className,
				)}
				{...props}
			/>
		),
		h2: ({ className, ...props }) => (
			<h2
				className={cn(
					"mt-10 mb-3 border-b border-[var(--line)] pb-2 text-[1.45rem] font-semibold tracking-tight text-[var(--ink)] first:mt-0",
					className,
				)}
				{...props}
			/>
		),
		h3: ({ className, ...props }) => (
			<h3
				className={cn(
					"mt-8 mb-2 text-[1.15rem] font-semibold text-[var(--ink)]",
					className,
				)}
				{...props}
			/>
		),
		h4: ({ className, ...props }) => (
			<h4
				className={cn(
					"mt-6 mb-2 text-base font-semibold text-[var(--ink)]",
					className,
				)}
				{...props}
			/>
		),
		h5: ({ className, ...props }) => (
			<h5
				className={cn(
					"mt-5 mb-2 text-sm font-semibold text-[var(--ink)]",
					className,
				)}
				{...props}
			/>
		),
		h6: ({ className, ...props }) => (
			<h6
				className={cn(
					"mt-5 mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]",
					className,
				)}
				{...props}
			/>
		),
		p: ({ className, ...props }) => (
			<p
				className={cn(
					"my-4 text-[0.97rem] leading-7 text-[var(--ink)]",
					className,
				)}
				{...props}
			/>
		),
		a: ({ href, children, className, ...rest }) => (
			<MarkdownAnchor
				href={href}
				currentRelativePath={currentRelativePath}
				className={cn(
					"font-medium text-[var(--teal)] underline decoration-[color:var(--line)] underline-offset-3 hover:text-[var(--ink)]",
					className,
				)}
				{...rest}
			>
				{children}
			</MarkdownAnchor>
		),
		strong: ({ className, ...props }) => (
			<strong
				className={cn("font-semibold text-[var(--ink)]", className)}
				{...props}
			/>
		),
		em: ({ className, ...props }) => (
			<em className={cn("italic text-[var(--ink)]", className)} {...props} />
		),
		ul: ({ className, ...props }) => (
			<ul
				className={cn(
					"my-4 ml-5 list-disc space-y-2 marker:text-[var(--ink-soft)]",
					className,
				)}
				{...props}
			/>
		),
		ol: ({ className, ...props }) => (
			<ol
				className={cn(
					"my-4 ml-5 list-decimal space-y-2 marker:text-[var(--ink-soft)]",
					className,
				)}
				{...props}
			/>
		),
		li: ({ className, ...props }) => (
			<li
				className={cn(
					"pl-1 leading-7 text-[0.97rem] text-[var(--ink)]",
					className,
				)}
				{...props}
			/>
		),
		blockquote: ({ className, ...props }) => (
			<blockquote
				className={cn(
					"my-6 rounded-r-lg border-l-3 border-[var(--teal)] bg-[var(--bg)] px-4 py-3 text-[0.97rem] leading-7 text-[var(--ink-soft)] italic",
					className,
				)}
				{...props}
			/>
		),
		hr: ({ className, ...props }) => (
			<hr
				className={cn("my-8 border-0 border-t border-[var(--line)]", className)}
				{...props}
			/>
		),
		table: ({ className, ...props }) => (
			<div className="my-6 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
				<table
					className={cn("w-full min-w-[36rem] border-collapse", className)}
					{...props}
				/>
			</div>
		),
		thead: ({ className, ...props }) => (
			<thead className={cn("bg-[var(--bg)]", className)} {...props} />
		),
		tbody: ({ className, ...props }) => (
			<tbody className={cn("align-top", className)} {...props} />
		),
		tr: ({ className, ...props }) => (
			<tr
				className={cn("border-t border-[var(--line)]", className)}
				{...props}
			/>
		),
		th: ({ className, ...props }) => (
			<th
				className={cn(
					"px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]",
					className,
				)}
				{...props}
			/>
		),
		td: ({ className, ...props }) => (
			<td
				className={cn(
					"px-4 py-3 text-[0.92rem] leading-6 text-[var(--ink)] align-top",
					className,
				)}
				{...props}
			/>
		),
		code: ({ className, children, ...props }) => (
			<code
				className={cn(
					"rounded-md border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.84em] text-[var(--ink)]",
					className,
				)}
				{...props}
			>
				{children}
			</code>
		),
		pre: ({ className, ...props }) => (
			<pre
				className={cn(
					"my-6 overflow-x-auto rounded-xl border border-[var(--line)] bg-[oklch(0.16_0.003_80)] p-4 text-[13px] leading-6 text-[oklch(0.94_0.003_80)]",
					className,
				)}
				{...props}
			/>
		),
	};
}

function MarkdownAnchor({
	href,
	currentRelativePath,
	children,
	className,
	...rest
}: ComponentPropsWithoutRef<"a"> & {
	currentRelativePath: string;
}) {
	const target = resolveRequirementLinkTarget(currentRelativePath, href);

	if (target) {
		return (
			<RequirementNavLink
				routePath={target.routePath}
				hash={target.hash}
				className={className}
				{...rest}
			>
				{children}
			</RequirementNavLink>
		);
	}

	const isExternal = href ? /^(https?:|mailto:|tel:)/.test(href) : false;

	return (
		<a
			href={href}
			className={className}
			target={isExternal ? "_blank" : undefined}
			rel={isExternal ? "noreferrer" : undefined}
			{...rest}
		>
			{children}
		</a>
	);
}

function RequirementNavLink({
	routePath,
	hash,
	children,
	...rest
}: ComponentPropsWithoutRef<"a"> & {
	routePath: string;
	hash?: string;
	children: ReactNode;
}) {
	return (
		<a href={`${getRequirementHref(routePath)}${hash ?? ""}`} {...rest}>
			{children}
		</a>
	);
}

function MissingDocument(props: { requestedPath: string }) {
	return (
		<div className="flex min-h-[480px] items-center justify-center px-6 py-10 text-center">
			<div className="max-w-lg">
				<div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)]">
					<TriangleAlertIcon className="size-5" />
				</div>
				<h2 className="mt-5 text-2xl font-semibold text-[var(--ink)]">
					Requirement not found
				</h2>
				<p className="mt-2 text-sm text-[var(--ink-soft)]">
					{props.requestedPath
						? `The document for "${props.requestedPath}" does not exist or is no longer available.`
						: "This requirement document is unavailable."}
				</p>
				<div className="mt-6 flex items-center justify-center gap-3">
					<RequirementNavLink
						routePath=""
						className="inline-flex items-center gap-2 rounded-md bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white no-underline hover:opacity-90"
					>
						<BookOpenTextIcon className="size-4" />
						Open requirements index
					</RequirementNavLink>
				</div>
			</div>
		</div>
	);
}

function MetaPill(props: { icon: ReactNode; children: ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1">
			{props.icon}
			{props.children}
		</span>
	);
}
