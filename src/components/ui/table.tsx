import type * as React from "react";

import { cn } from "#/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto overflow-hidden rounded-sm border border-[var(--table-border)] bg-[var(--table-surface)]"
    >
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b [&_tr]:border-[var(--table-border)] [&_tr]:bg-[oklch(from_var(--table-surface)_calc(l_-_0.03)_c_h)]",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-[var(--table-border)] bg-[oklch(from_var(--table-surface)_calc(l_-_0.03)_c_h)] font-medium",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group border-t border-[var(--table-border)] transition-colors first:border-t-0 hover:bg-[oklch(from_var(--table-surface)_calc(l_-_0.04)_c_h)] data-[state=selected]:bg-[oklch(from_var(--table-surface)_calc(l_-_0.05)_c_h)]",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-8 whitespace-nowrap px-2.5 text-left align-middle text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "whitespace-nowrap px-2.5 py-1.5 align-middle text-[var(--ink)] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-4 text-sm text-[var(--ink-soft)]", className)} {...props} />;
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
