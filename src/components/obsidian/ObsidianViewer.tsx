import { type ComponentPropsWithoutRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Pencil } from "lucide-react";
import {
	CodeBlockPre,
	createMarkdownComponents,
} from "#/components/markdown/markdown-components";
import type { ObsidianDocument, ObsidianViewerData } from "#/lib/obsidian";
import { resolveObsidianLinkTarget } from "#/lib/obsidian";
import { cn } from "#/lib/utils";
import { Button } from "#/components/ui/button";
import { ObsidianEditor } from "./ObsidianEditor";
import { ObsidianMissingDocument } from "./ObsidianMissingDocument";
import { ObsidianNavLink, ObsidianTreeNav } from "./ObsidianTreeNav";
import { ObsidianWelcome } from "./ObsidianWelcome";
import { useRouter } from "@tanstack/react-router";

type ObsidianViewerProps = {
	data: ObsidianViewerData;
};

export function ObsidianViewer({ data }: ObsidianViewerProps) {
	const [editing, setEditing] = useState(false);
	const router = useRouter();

	if (!data.configured) {
		return (
			<main className="mx-auto flex w-[min(1560px,calc(100%-2rem))] px-4 pb-12 pt-8 text-[14px]">
				<div className="surface-card mx-auto max-w-lg px-8 py-12 text-center">
					<h2 className="text-xl font-semibold text-[var(--ink)]">
						Obsidian not configured
					</h2>
					<p className="mt-2 text-sm text-[var(--ink-soft)]">
						Set the <code className="text-[12px]">OBSIDIAN_DIR</code>{" "}
						environment variable to your vault path to enable the Obsidian
						browser.
					</p>
				</div>
			</main>
		);
	}

	const document = data.document;
	const isIndex = data.requestedPath === "";

	return (
		<main className="mx-auto flex w-[min(1560px,calc(100%-2rem))] px-4 pb-12 pt-8 text-[14px]">
			<div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
				<aside>
					<ObsidianTreeNav
						nodes={data.tree}
						aiConfigPath={data.aiConfigPath}
						currentRoutePath={document?.routePath ?? data.requestedPath}
					/>
				</aside>

				<section className="surface-card min-w-0 overflow-hidden">
					{document ? (
						editing ? (
							<ObsidianEditor
								document={document}
								onCancel={() => setEditing(false)}
								onSaved={() => {
									setEditing(false);
									router.invalidate();
								}}
							/>
						) : (
							<DocumentContent
								document={document}
								onEdit={() => setEditing(true)}
							/>
						)
					) : isIndex ? (
						<ObsidianWelcome tree={data.tree} />
					) : (
						<ObsidianMissingDocument requestedPath={data.requestedPath} />
					)}
				</section>
			</div>
		</main>
	);
}

function DocumentContent(props: {
	document: ObsidianDocument;
	onEdit: () => void;
}) {
	const { document, onEdit } = props;
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
			<DocumentHeader document={document} onEdit={onEdit} />

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

function DocumentHeader(props: {
	document: ObsidianDocument;
	onEdit: () => void;
}) {
	const { document, onEdit } = props;

	return (
		<div className="relative overflow-hidden border-b border-[var(--line)]">
			<div
				className="absolute inset-x-0 top-0 h-1"
				style={{
					background: "linear-gradient(90deg, var(--teal), var(--coral))",
				}}
			/>

			<div className="px-6 pb-5 pt-6 sm:px-8">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">
							Obsidian
						</p>
						<h2 className="display-title mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
							{document.title}
						</h2>
						<p className="mt-2 font-mono text-[13px] text-[var(--ink-soft)]/60">
							{document.relativePath}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={onEdit}
						className="mt-4 shrink-0"
					>
						<Pencil className="mr-1.5 size-3.5" />
						Edit
					</Button>
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
	const target = resolveObsidianLinkTarget(currentRelativePath, href);

	if (target) {
		return (
			<ObsidianNavLink
				routePath={target.routePath}
				hash={target.hash}
				className={className}
				{...rest}
			>
				{children}
			</ObsidianNavLink>
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
