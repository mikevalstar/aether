import { useNavigate, useRouter } from "@tanstack/react-router";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { getObsidianHref } from "#/lib/obsidian";
import {
	createObsidianFile,
	listObsidianFolders,
	listObsidianTemplates,
	type ObsidianTemplate,
} from "#/lib/obsidian.functions";

type NewFileDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const NO_TEMPLATE = "__none__";

export function NewFileDialog({ open, onOpenChange }: NewFileDialogProps) {
	const [filename, setFilename] = useState("");
	const [folder, setFolder] = useState("");
	const [templateFilename, setTemplateFilename] = useState(NO_TEMPLATE);
	const [templates, setTemplates] = useState<ObsidianTemplate[]>([]);
	const [folders, setFolders] = useState<string[]>([""]);
	const [error, setError] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const navigate = useNavigate();
	const router = useRouter();

	useEffect(() => {
		if (!open) return;
		setFilename("");
		setFolder("");
		setTemplateFilename(NO_TEMPLATE);
		setError(null);

		listObsidianTemplates().then(setTemplates);
		listObsidianFolders().then(setFolders);
	}, [open]);

	async function handleCreate() {
		const trimmed = filename.trim();
		if (!trimmed) {
			setError("Filename is required");
			return;
		}

		setError(null);
		setCreating(true);

		try {
			const result = await createObsidianFile({
				data: {
					folder,
					filename: trimmed,
					templateFilename:
						templateFilename === NO_TEMPLATE ? undefined : templateFilename,
				},
			});
			onOpenChange(false);
			router.invalidate();
			navigate({ to: getObsidianHref(result.routePath) });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create file");
		} finally {
			setCreating(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileTextIcon className="size-4 text-[var(--teal)]" />
						New File
					</DialogTitle>
					<DialogDescription>
						Create a new Markdown file in your vault.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleCreate();
					}}
					className="space-y-4"
				>
					<div className="space-y-2">
						<Label htmlFor="new-file-name">Filename</Label>
						<Input
							id="new-file-name"
							placeholder="my-new-note"
							value={filename}
							onChange={(e) => setFilename(e.target.value)}
							autoFocus
						/>
						<p className="text-xs text-muted-foreground">
							.md extension added automatically if omitted.
						</p>
					</div>

					<div className="space-y-2">
						<Label>Folder</Label>
						<Select value={folder} onValueChange={setFolder}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Vault root" />
							</SelectTrigger>
							<SelectContent>
								{folders.map((f) => (
									<SelectItem key={f || "__root__"} value={f}>
										{f || "/ (vault root)"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Template</Label>
						<Select
							value={templateFilename}
							onValueChange={setTemplateFilename}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="No template" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_TEMPLATE}>Blank file</SelectItem>
								{templates.map((t) => (
									<SelectItem key={t.filename} value={t.filename}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={creating}>
							{creating && (
								<Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
							)}
							Create
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
