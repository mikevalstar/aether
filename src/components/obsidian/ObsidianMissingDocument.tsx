import { BookOpenIcon, SearchXIcon } from "lucide-react";
import { EmptyState } from "#/components/EmptyState";
import { ObsidianNavLink } from "./ObsidianTreeNav";

type ObsidianMissingDocumentProps = {
  requestedPath: string;
};

export function ObsidianMissingDocument({ requestedPath }: ObsidianMissingDocumentProps) {
  return (
    <EmptyState
      variant="centered"
      icon={SearchXIcon}
      title="Document not found"
      description={
        requestedPath
          ? `The file "${requestedPath}" does not exist or is no longer available.`
          : "This document is unavailable."
      }
      action={
        <ObsidianNavLink
          routePath=""
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] no-underline shadow-sm hover:opacity-90"
        >
          <BookOpenIcon className="size-4" />
          Back to vault
        </ObsidianNavLink>
      }
    />
  );
}
