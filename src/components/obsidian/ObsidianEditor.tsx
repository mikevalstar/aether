import { AlertCircle, CheckCircle2, Info, Loader2, Save, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/sonner";

const MarkdownEditor = lazy(() =>
	import("#/components/ui/markdown-editor").then((m) => ({
		default: m.MarkdownEditor,
	})),
);

import {
	type AiConfigValidationResponse,
	getAiConfigValidatorInfo,
	validateAiConfigContent,
} from "#/lib/ai-config.functions";
import { getAiConfigFilename, type ObsidianDocument } from "#/lib/obsidian";
import { saveObsidianDocument } from "#/lib/obsidian.functions";

// ─── Platform detection ─────────────────────────────────────────────────

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "\u2318" : "Ctrl+";

// ─── Types ──────────────────────────────────────────────────────────────

type ObsidianEditorProps = {
	document: ObsidianDocument;
	aiConfigPath: string | null;
	onCancel: () => void;
	onSaved: () => void;
};

type SaveState = "idle" | "saving" | "saved";

export function ObsidianEditor({ document, aiConfigPath, onCancel, onSaved }: ObsidianEditorProps) {
	const [content, setContent] = useState(document.rawContent);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [error, setError] = useState<string | null>(null);

	const aiConfigFilename = getAiConfigFilename(document.relativePath, aiConfigPath);

	const [validatorInfo, setValidatorInfo] = useState<{
		description: string;
		label: string;
	} | null>(null);
	const [validatorLoaded, setValidatorLoaded] = useState(false);
	const [validation, setValidation] = useState<AiConfigValidationResponse | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const isUnrecognizedConfig = aiConfigFilename !== null && validatorLoaded && validatorInfo === null;

	// Load validator info on mount
	useEffect(() => {
		if (!aiConfigFilename) return;

		getAiConfigValidatorInfo({ data: { filename: aiConfigFilename } }).then((info) => {
			if (info) setValidatorInfo(info);
			setValidatorLoaded(true);
		});
	}, [aiConfigFilename]);

	const runValidation = useCallback(
		(rawContent: string) => {
			if (!aiConfigFilename) return;

			validateAiConfigContent({
				data: { filename: aiConfigFilename, rawContent },
			}).then(setValidation);
		},
		[aiConfigFilename],
	);

	// Run validation on mount with initial content
	const initialContentRef = useRef(content);
	useEffect(() => {
		runValidation(initialContentRef.current);
	}, [runValidation]);

	function handleContentChange(value: string) {
		setContent(value);

		if (aiConfigFilename) {
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => runValidation(value), 400);
		}
	}

	const hasChanges = content !== document.rawContent;

	async function handleSave() {
		setSaveState("saving");
		setError(null);
		try {
			await saveObsidianDocument({
				data: {
					relativePath: document.relativePath,
					content,
				},
			});
			setSaveState("saved");
			toast.success("File saved");
			setTimeout(() => onSaved(), 600);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save";
			setError(message);
			toast.error("Save failed", { description: message });
			setSaveState("idle");
		}
	}

	// Cmd+S / Ctrl+S to save
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				if (hasChanges && saveState === "idle") handleSave();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

	return (
		<div className="flex h-full flex-col">
			{/* ─── Header ─── */}
			<div className="relative border-b border-[var(--line)]">
				<div
					className="absolute inset-x-0 top-0 h-1"
					style={{
						background: "linear-gradient(90deg, var(--teal), var(--coral))",
					}}
				/>
				<div className="flex items-center justify-between px-6 py-3 pt-4">
					<div className="flex min-w-0 items-center gap-3">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">Editing</p>
						<h2 className="display-title min-w-0 truncate text-lg font-bold tracking-tight text-[var(--ink)]">
							{document.title}
						</h2>
						{hasChanges && (
							<span className="shrink-0 rounded-full bg-[var(--coral)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--coral)]">
								Unsaved
							</span>
						)}
						{validation && !validation.isValid && (
							<span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive-foreground">
								Validation errors
							</span>
						)}
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Button variant="ghost" size="sm" onClick={onCancel}>
							<X className="mr-1.5 size-3.5" />
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
							disabled={saveState !== "idle" || !hasChanges}
							className={saveState === "saved" ? "bg-emerald-600 text-white hover:bg-emerald-600" : undefined}
						>
							{saveState === "saving" ? (
								<Loader2 className="mr-1.5 size-3.5 animate-spin" />
							) : saveState === "saved" ? (
								<CheckCircle2 className="mr-1.5 size-3.5" />
							) : (
								<Save className="mr-1.5 size-3.5" />
							)}
							{saveState === "saved" ? "Saved" : "Save"}
							{saveState === "idle" && (
								<kbd className="ml-2 rounded bg-primary-foreground/20 px-1 py-0.5 font-mono text-[10px] leading-none">
									{modKey}S
								</kbd>
							)}
						</Button>
					</div>
				</div>
			</div>

			{error && (
				<div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-6 py-2 text-sm text-destructive-foreground">
					<AlertCircle className="size-4 shrink-0" />
					{error}
				</div>
			)}

			{isUnrecognizedConfig && <UnrecognizedConfigBanner filename={aiConfigFilename} />}

			{/* ─── Editor ─── */}
			<Suspense
				fallback={
					<div className="flex min-h-0 flex-1 items-center justify-center">
						<Loader2 className="size-5 animate-spin text-[var(--ink-soft)]" />
					</div>
				}
			>
				<MarkdownEditor value={content} onChange={handleContentChange} className="min-h-0 flex-1" />
			</Suspense>

			{/* ─── File path ─── */}
			<div className="border-t border-[var(--line)] bg-[var(--surface)] px-6 py-1.5">
				<span className="font-mono text-[11px] text-[var(--ink-soft)]/60">{document.relativePath}</span>
			</div>

			{aiConfigFilename && <AiConfigValidationPanel validatorInfo={validatorInfo} validation={validation} />}
		</div>
	);
}

function UnrecognizedConfigBanner(props: { filename: string }) {
	return (
		<div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
			<AlertCircle className="size-4 shrink-0" />
			<span>
				<strong>{props.filename}</strong> is not a recognized config file and will not be used by Aether.
			</span>
		</div>
	);
}

function AiConfigValidationPanel(props: {
	validatorInfo: { description: string; label: string } | null;
	validation: AiConfigValidationResponse | null;
}) {
	const { validatorInfo, validation } = props;

	if (!validatorInfo && !validation) return null;

	return (
		<div className="border-t border-[var(--line)] bg-[var(--teal-subtle)]">
			{/* Validation status */}
			{validation && (
				<div className="border-b border-[var(--line)] px-6 py-3">
					{validation.isValid ? (
						<div className="flex items-center gap-2 text-sm text-[var(--teal)]">
							<CheckCircle2 className="size-4" />
							<span className="font-medium">Valid</span>
						</div>
					) : (
						<div className="space-y-1.5">
							<div className="flex items-center gap-2 text-sm font-medium text-destructive-foreground">
								<AlertCircle className="size-4" />
								<span>
									{validation.errors.length} validation {validation.errors.length === 1 ? "error" : "errors"}
								</span>
							</div>
							<ul className="space-y-0.5 pl-6">
								{validation.errors.map((err) => (
									<li key={err} className="text-[13px] text-destructive-foreground">
										{err}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{/* Requirements description */}
			{validatorInfo && (
				<div className="px-6 py-3">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
						<Info className="size-3.5" />
						{validatorInfo.label} — Requirements
					</div>
					<div className="mt-2 text-[13px] leading-relaxed text-[var(--ink-soft)] [&_code]:rounded [&_code]:bg-[var(--surface)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_li]:ml-4 [&_li]:list-disc [&_p]:mt-1 [&_strong]:font-semibold [&_strong]:text-[var(--ink)]">
						<Markdown remarkPlugins={[remarkGfm]}>{validatorInfo.description}</Markdown>
					</div>
				</div>
			)}
		</div>
	);
}
