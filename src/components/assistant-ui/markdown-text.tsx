"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
	type CodeHeaderProps,
	MarkdownTextPrimitive,
	unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
	useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { CheckIcon, CopyIcon } from "lucide-react";
import { memo } from "react";
import remarkGfm from "remark-gfm";

import { TooltipIconButton } from "#/components/assistant-ui/tooltip-icon-button";
import {
	createMarkdownComponents,
	useCopyToClipboard,
} from "#/components/markdown/markdown-components";
import { cn } from "#/lib/utils";

const MarkdownTextImpl = () => {
	return (
		<MarkdownTextPrimitive
			remarkPlugins={[remarkGfm]}
			className="aui-md"
			components={defaultComponents}
		/>
	);
};

export const MarkdownText = memo(MarkdownTextImpl);

// ─── Assistant-UI specific overrides ──────────────────────────────────

const CodeHeader = ({ language, code }: CodeHeaderProps) => {
	const { isCopied, copy } = useCopyToClipboard();

	return (
		<div className="aui-code-header-root mt-2.5 flex items-center justify-between rounded-t-lg border border-b-0 border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs">
			<span className="aui-code-header-language font-medium lowercase text-[var(--ink-soft)]">
				{language}
			</span>
			<TooltipIconButton
				tooltip="Copy"
				onClick={() => code && copy(code)}
			>
				{!isCopied && <CopyIcon />}
				{isCopied && <CheckIcon />}
			</TooltipIconButton>
		</div>
	);
};

// Start from the shared compact components, then override code-related ones
// that need assistant-ui-specific hooks (useIsMarkdownCodeBlock, CodeHeader)
const sharedComponents = createMarkdownComponents("compact");

const defaultComponents = memoizeMarkdownComponents({
	...sharedComponents,
	// Override pre to work with assistant-ui's CodeHeader (inserted above pre by the primitive)
	pre: ({ className, ...props }) => (
		<pre
			className={cn(
				"aui-md-pre overflow-x-auto rounded-t-none rounded-b-lg border border-[var(--line)] border-t-0 bg-[oklch(0.16_0.003_80)] p-3 text-xs leading-relaxed text-[oklch(0.94_0.003_80)]",
				className,
			)}
			{...props}
		/>
	),
	// Override code to use assistant-ui's block detection hook
	code: function Code({ className, ...props }) {
		const isCodeBlock = useIsMarkdownCodeBlock();
		return (
			<code
				className={cn(
					!isCodeBlock &&
						"aui-md-inline-code rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
					className,
				)}
				{...props}
			/>
		);
	},
	CodeHeader,
});
