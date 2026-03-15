import { createPatch } from "diff";

export function DiffView({
	original,
	modified,
	filePath,
}: {
	original: string;
	modified: string;
	filePath: string;
}) {
	if (!original && modified) {
		return (
			<div className="rounded-md border bg-muted/30">
				<div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
					New file
				</div>
				<pre className="overflow-x-auto p-4 text-xs leading-relaxed">
					{modified.split("\n").map((line, lineIdx) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
							key={lineIdx}
							className="text-green-700 dark:text-green-400"
						>
							<span className="mr-3 inline-block w-8 text-right text-muted-foreground">
								{lineIdx + 1}
							</span>
							+{line}
						</div>
					))}
				</pre>
			</div>
		);
	}

	const patch = createPatch(filePath, original, modified, "", "", {
		context: 3,
	});
	const lines = patch.split("\n");
	// Skip the first 4 header lines (diff ---, +++, etc)
	const diffLines = lines.slice(4);

	return (
		<div className="rounded-md border bg-muted/30">
			<div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
				Unified diff
			</div>
			<pre className="overflow-x-auto p-4 text-xs leading-relaxed">
				{diffLines.map((line, lineIdx) => {
					let className = "";
					if (line.startsWith("+")) {
						className = "bg-green-500/10 text-green-700 dark:text-green-400";
					} else if (line.startsWith("-")) {
						className = "bg-red-500/10 text-red-700 dark:text-red-400";
					} else if (line.startsWith("@@")) {
						className =
							"text-blue-600 dark:text-blue-400 font-semibold mt-2 mb-1";
					} else {
						className = "text-muted-foreground";
					}

					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: diff lines lack stable IDs
						<div key={lineIdx} className={className}>
							{line}
						</div>
					);
				})}
			</pre>
		</div>
	);
}
