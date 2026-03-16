import { BookOpenTextIcon, SearchXIcon } from "lucide-react";
import { RequirementNavLink } from "./TreeNav";

type MissingDocumentProps = {
	requestedPath: string;
};

export function MissingDocument({ requestedPath }: MissingDocumentProps) {
	return (
		<div className="flex min-h-[480px] items-center justify-center px-6 py-10 text-center">
			<div className="max-w-lg">
				<div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--coral)]/10 text-[var(--coral)]">
					<SearchXIcon className="size-6" />
				</div>
				<h2 className="mt-5 text-2xl font-semibold text-[var(--ink)]">Requirement not found</h2>
				<p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--ink-soft)]">
					{requestedPath
						? `The document for "${requestedPath}" does not exist or is no longer available.`
						: "This requirement document is unavailable."}
				</p>
				<div className="mt-6 flex items-center justify-center gap-3">
					<RequirementNavLink
						routePath=""
						className="inline-flex items-center gap-2 rounded-lg bg-[var(--teal)] px-5 py-2.5 text-sm font-medium text-white no-underline shadow-sm hover:opacity-90"
					>
						<BookOpenTextIcon className="size-4" />
						Open requirements index
					</RequirementNavLink>
				</div>
			</div>
		</div>
	);
}
