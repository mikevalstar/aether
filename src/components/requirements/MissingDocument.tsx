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
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] no-underline hover:bg-[var(--accent-hover)]"
        >
          <BookOpenTextIcon className="size-4" />
          Open requirements index
        </RequirementNavLink>
      }
    />
  );
}
