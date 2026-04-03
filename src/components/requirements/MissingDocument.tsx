import { BookOpenTextIcon, SearchXIcon } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";
import { RequirementNavLink } from "./TreeNav";

type MissingDocumentProps = {
  requestedPath: string;
};

export function MissingDocument({ requestedPath }: MissingDocumentProps) {
  return (
    <EmptyState
      variant="centered"
      icon={SearchXIcon}
      title="Requirement not found"
      description={
        requestedPath
          ? `The document for "${requestedPath}" does not exist or is no longer available.`
          : "This requirement document is unavailable."
      }
      action={
        <RequirementNavLink
          routePath=""
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--teal)] px-5 py-2.5 text-sm font-medium text-white no-underline shadow-sm hover:opacity-90"
        >
          <BookOpenTextIcon className="size-4" />
          Open requirements index
        </RequirementNavLink>
      }
    />
  );
}
