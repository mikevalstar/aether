import { createPatch } from "diff";
import { Minus, Plus } from "lucide-react";
import { useMemo } from "react";

type DiffLine = {
	type: "add" | "remove" | "context" | "hunk";
	content: string;
	oldLine?: number;
	newLine?: number;
};

function parseDiffLines(patch: string): DiffLine[] {
	const raw = patch.split("\n").slice(4); // skip header
	const result: DiffLine[] = [];
	let oldLine = 0;
	let newLine = 0;

	for (const line of raw) {
		if (line.startsWith("@@")) {
			const match = line.match(/@@ -(\d+)/);
			if (match) {
				oldLine = Number.parseInt(match[1], 10);
				const newMatch = line.match(/\+(\d+)/);
				if (newMatch) newLine = Number.parseInt(newMatch[1], 10);
			}
			result.push({ type: "hunk", content: line });
		} else if (line.startsWith("+")) {
			result.push({
				type: "add",
				content: line.slice(1),
				newLine: newLine++,
			});
		} else if (line.startsWith("-")) {
			result.push({
				type: "remove",
				content: line.slice(1),
				oldLine: oldLine++,
			});
		} else if (line.startsWith(" ")) {
			result.push({
				type: "context",
				content: line.slice(1),
				oldLine: oldLine++,
				newLine: newLine++,
			});
		}
	}
	return result;
}

function DiffStats({ lines }: { lines: DiffLine[] }) {
	const added = lines.filter((l) => l.type === "add").length;
	const removed = lines.filter((l) => l.type === "remove").length;

	if (added === 0 && removed === 0) return null;

	return (
		<div className="flex items-center gap-3 border-b border-border/50 px-4 py-2 text-xs">
			{added > 0 && (
				<span className="flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
					<Plus className="size-3" />
					{added} {added === 1 ? "line" : "lines"}
				</span>
			)}
			{removed > 0 && (
				<span className="flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
					<Minus className="size-3" />
					{removed} {removed === 1 ? "line" : "lines"}
				</span>
			)}
		</div>
	);
}

export function DiffView({
	original,
	modified,
	filePath,
}: {
	original: string;
	modified: string;
	filePath: string;
}) {
	const patch = useMemo(
		() =>
			original
				? createPatch(filePath, original, modified, "", "", { context: 3 })
				: "",
		[filePath, original, modified],
	);
	const diffLines = useMemo(
		() => (patch ? parseDiffLines(patch) : []),
		[patch],
	);

	if (!original && modified) {
		const fileLines = modified.split("\n");
		return (
			<div className="overflow-hidden rounded-md border">
				<div className="flex items-center gap-3 border-b border-border/50 px-4 py-2 text-xs">
					<span className="font-semibold text-muted-foreground">New file</span>
					<span className="flex items-center gap-1 font-medium text-green-700 dark:text-green-400">
						<Plus className="size-3" />
						{fileLines.length} {fileLines.length === 1 ? "line" : "lines"}
					</span>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full border-collapse text-xs leading-relaxed font-mono">
						<tbody>
							{fileLines.map((line, i) => (
								<tr
									// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
									key={i}
									className="bg-green-500/[0.06] hover:bg-green-500/[0.12] transition-colors"
								>
									<td className="min-w-[3ch] select-none whitespace-nowrap border-r border-border/30 px-2.5 py-0 text-right text-muted-foreground/60 tabular-nums">
										{i + 1}
									</td>
									<td className="w-[3px] select-none bg-green-500/30" />
									<td className="px-3 py-0 whitespace-pre">
										<span className="text-green-700 dark:text-green-400">
											{line}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-md border">
			<DiffStats lines={diffLines} />
			<div className="overflow-x-auto">
				<table className="w-full border-collapse text-xs leading-relaxed font-mono">
					<tbody>
						{diffLines.map((line, i) => {
							if (line.type === "hunk") {
								return (
									<tr
										// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
										key={i}
										className="bg-blue-500/[0.06]"
									>
										<td
											colSpan={4}
											className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400"
										>
											{line.content}
										</td>
									</tr>
								);
							}

							const rowBg =
								line.type === "add"
									? "bg-green-500/[0.06] hover:bg-green-500/[0.12]"
									: line.type === "remove"
										? "bg-red-500/[0.06] hover:bg-red-500/[0.12]"
										: "hover:bg-muted/40";

							const gutterColor =
								line.type === "add"
									? "bg-green-500/30"
									: line.type === "remove"
										? "bg-red-500/30"
										: "";

							const textColor =
								line.type === "add"
									? "text-green-700 dark:text-green-400"
									: line.type === "remove"
										? "text-red-700 dark:text-red-400"
										: "text-muted-foreground";

							return (
								<tr
									// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
									key={i}
									className={`${rowBg} transition-colors`}
								>
									<td className="min-w-[3ch] select-none whitespace-nowrap border-r border-border/30 px-2 py-0 text-right text-muted-foreground/50 tabular-nums">
										{line.oldLine ?? ""}
									</td>
									<td className="min-w-[3ch] select-none whitespace-nowrap border-r border-border/30 px-2 py-0 text-right text-muted-foreground/50 tabular-nums">
										{line.newLine ?? ""}
									</td>
									<td className={`w-[3px] select-none ${gutterColor}`} />
									<td className="px-3 py-0 whitespace-pre">
										<span className={textColor}>
											{line.type === "add"
												? "+"
												: line.type === "remove"
													? "-"
													: " "}
											{line.content}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
