import { CalendarDaysIcon, UserRoundIcon } from "lucide-react";
import type { RequirementDocument } from "#/lib/requirements";
import { MetaPill } from "./MetaPill";
import { StatusBadge } from "./StatusBadge";

type DocumentHeaderProps = {
  document: RequirementDocument;
};

export function DocumentHeader({ document }: DocumentHeaderProps) {
  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="px-5 pb-4 pt-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="relative min-w-0 flex-1 pl-3">
            <span aria-hidden className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-(--accent)" />
            <h2 className="display-title text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-2xl">
              {document.title}
            </h2>
            <p className="mt-1.5 font-mono text-[12px] text-[var(--ink-dim)]">
              {document.canonicalFile ?? `docs/requirements/${document.relativePath}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
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
