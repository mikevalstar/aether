import {
	BookOpenTextIcon,
	CalendarDaysIcon,
	FileTextIcon,
	FolderTreeIcon,
	TriangleAlertIcon,
	UserRoundIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "#/components/ui/badge";
import {
	CodeBlockPre,
	createMarkdownComponents,
} from "#/components/markdown/markdown-components";
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
							Browse the docs in `docs/requirements/` without
							leaving Aether.
						</p>
					</div>

					<nav className="max-h-[calc(100vh-10rem)] overflow-y-auto px-3 py-3">
						<TreeList
							nodes={data.tree}
							currentRoutePath={
								document?.routePath ?? data.requestedPath
							}
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
				<li
					key={
						node.type === "folder"
							? node.path
							: node.relativePath
					}
				>
					{node.type === "folder" ? (
						<div>
							<div
								className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]"
								style={{
									paddingLeft: `${(props.depth ?? 0) * 14 + 10}px`,
								}}
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
							style={{
								paddingLeft: `${(props.depth ?? 0) * 14 + 10}px`,
							}}
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
	const markdownComponents = createMarkdownComponents("prose", {
		a: ({ href, children, className, ...rest }) => (
			<MarkdownAnchor
				href={href}
				currentRelativePath={document.relativePath}
				className={cn(
					"font-medium text-[var(--teal)] underline decoration-[color:var(--line)] underline-offset-3 hover:text-[var(--ink)]",
					className,
				)}
				{...rest}
			>
				{children}
			</MarkdownAnchor>
		),
		pre: (preProps) => <CodeBlockPre variant="prose" {...preProps} />,
	});

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
						{document.status ? (
							<Badge>{document.status}</Badge>
						) : null}
						{document.owner ? (
							<MetaPill
								icon={
									<UserRoundIcon className="size-3.5" />
								}
							>
								{document.owner}
							</MetaPill>
						) : null}
						{document.lastUpdated ? (
							<MetaPill
								icon={
									<CalendarDaysIcon className="size-3.5" />
								}
							>
								{document.lastUpdated}
							</MetaPill>
						) : null}
					</div>
				</div>
			</div>

			<div className="px-6 py-6 sm:px-8 sm:py-8">
				<div className="max-w-none text-[var(--ink)]">
					<Markdown
						remarkPlugins={[remarkGfm]}
						components={markdownComponents}
					>
						{document.body}
					</Markdown>
				</div>
			</div>
		</div>
	);
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
