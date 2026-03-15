import { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import { Save, X, Loader2 } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { ObsidianDocument } from "#/lib/obsidian";
import { saveObsidianDocument } from "#/lib/obsidian.functions";

type ObsidianEditorProps = {
	document: ObsidianDocument;
	onCancel: () => void;
	onSaved: () => void;
};

export function ObsidianEditor({
	document,
	onCancel,
	onSaved,
}: ObsidianEditorProps) {
	const [content, setContent] = useState(document.rawContent);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const hasChanges = content !== document.rawContent;

	async function handleSave() {
		setSaving(true);
		setError(null);
		try {
			await saveObsidianDocument({
				data: {
					relativePath: document.relativePath,
					content,
				},
			});
			onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-3">
				<div className="flex items-center gap-3">
					<span className="text-sm font-medium text-[var(--ink)]">
						Editing
					</span>
					<span className="font-mono text-xs text-[var(--ink-soft)]/60">
						{document.relativePath}
					</span>
					{hasChanges && (
						<span className="rounded-full bg-[var(--coral)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--coral)]">
							Unsaved
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={onCancel}>
						<X className="mr-1.5 size-3.5" />
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleSave}
						disabled={saving || !hasChanges}
					>
						{saving ? (
							<Loader2 className="mr-1.5 size-3.5 animate-spin" />
						) : (
							<Save className="mr-1.5 size-3.5" />
						)}
						Save
					</Button>
				</div>
			</div>

			{error && (
				<div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
					{error}
				</div>
			)}

			<div className="min-h-0 flex-1" data-color-mode="auto">
				<MDEditor
					value={content}
					onChange={(val) => setContent(val ?? "")}
					height="100%"
					visibleDragbar={false}
					preview="edit"
				/>
			</div>
		</div>
	);
}
