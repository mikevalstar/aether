import { ChevronRight, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "#/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { cn } from "#/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
};

export type DataTableAction = {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T, index: number) => string;
  /** Optional title shown in the header band above the table. */
  title?: string;
  /** Optional count rendered next to the title in the accent color. */
  count?: number | string;
  /** Optional action buttons rendered on the right of the header band. */
  actions?: DataTableAction[];
  /** Custom right-side header content (overrides actions). */
  headerRight?: React.ReactNode;
  /** Show a chevron at the end of each row. Useful for navigable rows. */
  showChevron?: boolean;
  /** Click handler on rows. */
  onRowClick?: (row: T) => void;
  /** Render when data is empty. */
  empty?: React.ReactNode;
  /** Wrapper className */
  className?: string;
  /** Header band className */
  headerClassName?: string;
};

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function DataTableHeader({
  title,
  count,
  actions,
  headerRight,
  className,
}: {
  title?: string;
  count?: number | string;
  actions?: DataTableAction[];
  headerRight?: React.ReactNode;
  className?: string;
}) {
  if (!title && count === undefined && !actions?.length && !headerRight) return null;

  return (
    <div className={cn("flex items-center gap-3 px-1 pb-2", className)}>
      {(title || count !== undefined) && (
        <div className="flex items-baseline gap-2">
          {title && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">{title}</span>
          )}
          {count !== undefined && (
            <span className="text-[11px] font-semibold tabular-nums text-[var(--accent)]">
              {typeof count === "number" ? String(count).padStart(2, "0") : count}
            </span>
          )}
        </div>
      )}
      <div className="h-px flex-1 bg-[var(--line)]" />
      {headerRight ? (
        <div className="flex items-center gap-2">{headerRight}</div>
      ) : actions?.length ? (
        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button key={action.label} variant="outline" size="xs" onClick={action.onClick}>
                {Icon && <Icon className="size-3" />}
                <span className="tracking-[0.12em]">{action.label.toUpperCase()}</span>
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  title,
  count,
  actions,
  headerRight,
  showChevron,
  onRowClick,
  empty,
  className,
  headerClassName,
}: DataTableProps<T>) {
  const navigable = !!onRowClick;
  const colSpan = columns.length + (showChevron ? 1 : 0);

  return (
    <div className={cn("w-full", className)}>
      <DataTableHeader title={title} count={count} actions={actions} headerRight={headerRight} className={headerClassName} />

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={cn(alignClass(col.align), col.headerClassName)}>
                {col.header}
              </TableHead>
            ))}
            {showChevron && <TableHead className="w-8" aria-hidden />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-6 text-center text-[var(--ink-soft)]">
                {empty ?? "No data"}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => {
              const key = rowKey(row, index);
              const handleClick = navigable ? () => onRowClick?.(row) : undefined;
              return (
                <TableRow
                  key={key}
                  className={navigable ? "cursor-pointer" : undefined}
                  onClick={handleClick}
                  onKeyDown={
                    navigable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick?.(row);
                          }
                        }
                      : undefined
                  }
                  role={navigable ? "button" : undefined}
                  tabIndex={navigable ? 0 : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn(alignClass(col.align), col.className)}>
                      {col.cell(row, index)}
                    </TableCell>
                  ))}
                  {showChevron && (
                    <TableCell className="w-8 px-2 text-right">
                      <ChevronRight className="ml-auto size-4 text-[var(--ink-faint)] transition-colors group-hover:text-[var(--ink-soft)]" />
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
