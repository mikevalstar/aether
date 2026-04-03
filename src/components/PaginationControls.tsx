import {
  Pagination,
  PaginationContent,
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
 * Shows pages 1, last, and within ±2 of the current page.
 * Renders nothing if totalPages <= 1.
 */
export function PaginationControls({ page, totalPages, onPageChange, className }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  );

  return (
    <section className={`mt-4 flex justify-center ${className ?? ""}`}>
      <Pagination>
        <PaginationContent>
          {page > 1 && (
            <PaginationItem>
              <PaginationPrevious onClick={() => onPageChange(page - 1)} />
            </PaginationItem>
          )}
          {pages.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink isActive={p === page} onClick={() => onPageChange(p)}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          {page < totalPages && (
            <PaginationItem>
              <PaginationNext onClick={() => onPageChange(page + 1)} />
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </section>
  );
}
