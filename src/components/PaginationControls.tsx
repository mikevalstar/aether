import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "#/components/ui/pagination";

export interface PaginationControlsProps {
  /** Current page number (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Called when the user clicks a page link */
  onPageChange: (page: number) => void;
  /** Additional class name for the outer section */
  className?: string;
}

/**
 * Reusable pagination bar with prev/next buttons and a windowed page list.
 * Shows pages 1, last, and within ±2 of the current page; gaps render as
 * ellipses so the page count is legible without flooding the bar.
 *
 * Redesign notes:
 * - Tighter sizing (size-8 sq chips), sharp `--radius-sm` corners.
 * - Active page swaps from a generic outline button to a solid `--accent`
 *   chip with `--accent-foreground` text — same affordance as primary
 *   buttons so the current page reads as "you are here."
 * - Renders nothing if totalPages <= 1.
 */
export function PaginationControls({ page, totalPages, onPageChange, className }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const visible = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  // Insert ellipses where the windowed list skips pages.
  const items: Array<{ kind: "page"; value: number } | { kind: "ellipsis"; key: string }> = [];
  visible.forEach((p, i) => {
    if (i > 0 && p - visible[i - 1] > 1) {
      items.push({ kind: "ellipsis", key: `ellipsis-${p}` });
    }
    items.push({ kind: "page", value: p });
  });

  return (
    <section className={`mt-6 flex justify-center ${className ?? ""}`}>
      <Pagination>
        <PaginationContent className="gap-0.5">
          {page > 1 && (
            <PaginationItem>
              <PaginationPrevious onClick={() => onPageChange(page - 1)} size="sm" className="h-8 gap-1 px-2.5 text-xs" />
            </PaginationItem>
          )}
          {items.map((item) =>
            item.kind === "ellipsis" ? (
              <PaginationItem key={item.key}>
                <PaginationEllipsis className="size-8" />
              </PaginationItem>
            ) : (
              <PaginationItem key={item.value}>
                <PaginationLink
                  isActive={item.value === page}
                  onClick={() => onPageChange(item.value)}
                  size="sm"
                  className={
                    item.value === page
                      ? "size-8 border-transparent bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] hover:text-[var(--accent-foreground)] font-semibold"
                      : "size-8 text-xs font-medium"
                  }
                >
                  {item.value}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          {page < totalPages && (
            <PaginationItem>
              <PaginationNext onClick={() => onPageChange(page + 1)} size="sm" className="h-8 gap-1 px-2.5 text-xs" />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </section>
  );
}
