import { useRouter } from "@tanstack/react-router";
import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { Textarea } from "#/components/ui/textarea";
import { runWorkflow } from "#/lib/workflow.functions";
import type { WorkflowField } from "#/lib/workflow-executor";

export function WorkflowForm({
	filename,
	title,
	description,
	model,
	fields,
	fileExists,
}: {
	filename: string;
	title: string;
	description: string | null;
	model: string;
	fields: WorkflowField[];
	fileExists: boolean;
}) {
	const router = useRouter();
	const [formValues, setFormValues] = useState<Record<string, string>>(() => {
		const defaults: Record<string, string> = {};
		for (const field of fields) {
			if (field.default) defaults[field.name] = field.default;
		}
		return defaults;
	});
	const [submitting, setSubmitting] = useState(false);

	function setValue(name: string, value: string) {
		setFormValues((prev) => ({ ...prev, [name]: value }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitting(true);

		try {
			await runWorkflow({ data: { filename, formValues } });
			toast.success("Workflow started", {
				description: `${title} is running in the background.`,
			});
			// Reset form
			const defaults: Record<string, string> = {};
			for (const field of fields) {
				if (field.default) defaults[field.name] = field.default;
			}
			setFormValues(defaults);
			// Refresh to show new run
			router.invalidate();
		} catch (err) {
			toast.error("Failed to start workflow", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setSubmitting(false);
		}
	}

	if (!fileExists) {
		return (
			<div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
				Workflow file has been removed. Past runs are still available below.
			</div>
		);
	}

	return (
		<form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-lg border p-4">
			<div className="flex items-center gap-2 mb-2">
				<h3 className="text-sm font-medium">Run Workflow</h3>
				<Badge variant="outline" className="text-xs">
					{model}
				</Badge>
			</div>
			{description && <p className="text-xs text-muted-foreground -mt-2">{description}</p>}

			{fields.map((field) => (
				<div key={field.name} className="space-y-1.5">
					<Label htmlFor={`field-${field.name}`} className="text-sm">
						{field.label}
						{field.required && <span className="text-red-500 ml-0.5">*</span>}
					</Label>
					{field.type === "textarea" ? (
						<Textarea
							id={`field-${field.name}`}
							value={formValues[field.name] ?? ""}
							onChange={(e) => setValue(field.name, e.target.value)}
							placeholder={field.placeholder}
							required={field.required}
							rows={3}
						/>
					) : field.type === "select" && field.options ? (
						<Select
							value={formValues[field.name] ?? ""}
							onValueChange={(v) => setValue(field.name, v)}
							required={field.required}
						>
							<SelectTrigger id={`field-${field.name}`}>
								<SelectValue placeholder={field.placeholder ?? "Select..."} />
							</SelectTrigger>
							<SelectContent>
								{field.options.map((opt) => (
									<SelectItem key={opt} value={opt}>
										{opt}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<Input
							id={`field-${field.name}`}
							type={field.type === "url" ? "url" : "text"}
							value={formValues[field.name] ?? ""}
							onChange={(e) => setValue(field.name, e.target.value)}
							placeholder={field.placeholder}
							required={field.required}
						/>
					)}
				</div>
			))}

			<Button type="submit" disabled={submitting} className="w-full sm:w-auto">
				{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}
				Run Workflow
			</Button>
		</form>
	);
}
