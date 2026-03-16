import { CalendarDaysIcon, UserRoundIcon } from "lucide-react";
import type { RequirementDocument } from "#/lib/requirements";
import { MetaPill } from "./MetaPill";
import { StatusBadge } from "./StatusBadge";

type DocumentHeaderProps = {
	document: RequirementDocument;
};

export function DocumentHeader({ document }: DocumentHeaderProps) {
	return (
		<div className="relative overflow-hidden border-b border-[var(--line)]">
			{/* Subtle teal gradient band along the top */}
			<div
				className="absolute inset-x-0 top-0 h-1"
				style={{
					background: "linear-gradient(90deg, var(--teal), var(--coral))",
				}}
			/>

			<div className="px-6 pb-5 pt-6 sm:px-8">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0 flex-1">
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--teal)]">Requirements doc</p>
						<h2 className="display-title mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
							{document.title}
						</h2>
						<p className="mt-2 font-mono text-[13px] text-[var(--ink-soft)]/60">
							{document.canonicalFile ?? `docs/requirements/${document.relativePath}`}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{document.status ? <StatusBadge status={document.status} /> : null}
						{document.owner ? <MetaPill icon={<UserRoundIcon className="size-3.5" />}>{document.owner}</MetaPill> : null}
						{document.lastUpdated ? (
							<MetaPill icon={<CalendarDaysIcon className="size-3.5" />}>{document.lastUpdated}</MetaPill>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
