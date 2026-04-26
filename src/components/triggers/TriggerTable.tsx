import { Link, useNavigate } from "@tanstack/react-router";
import { FileX, Pencil } from "lucide-react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { DataTable, type DataTableColumn } from "#/components/ui/data-table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { TriggerListItem } from "#/lib/triggers/trigger.functions";

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-[var(--ink-faint)]">—</span>;
  if (status === "success") {
    return (
      <Badge variant="success" size="glyph" aria-label="Success" title="Success">
        ✓
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" size="glyph" aria-label="Error" title="Error">
      ✕
    </Badge>
  );
}

export function TriggerTable({ items }: { items: TriggerListItem[] }) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  const columns: DataTableColumn<TriggerListItem>[] = [
    {
      key: "trigger",
      header: "Trigger",
      cell: (item) => (
        <div className={!item.fileExists || !item.enabled ? "opacity-60" : ""}>
          <Link
            to="/triggers/$"
            params={{ _splat: item.filename }}
            className="font-medium text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
          >
            {item.title}
          </Link>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-soft)]">
            <Badge variant="model-name">{item.model}</Badge>
            {!item.fileExists && (
              <Badge variant="warning">
                <FileX />
                File removed
              </Badge>
            )}
            {!item.enabled && item.fileExists && <Badge variant="ghost">Paused</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      mono: true,
      cell: (item) => (
        <code className="rounded border border-[var(--line)] bg-[var(--bg)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]">
          {item.type}
        </code>
      ),
    },
    {
      key: "pattern",
      header: "Pattern",
      mono: true,
      className: "max-w-[220px]",
      cell: (item) =>
        item.pattern ? (
          <Tooltip>
            <TooltipTrigger className="block max-w-[220px] truncate text-left text-[12.5px] text-[var(--ink)]">
              {item.pattern}
            </TooltipTrigger>
            <TooltipContent>
              <code className="font-mono text-xs">{item.pattern}</code>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-[var(--ink-faint)]">All events</span>
        ),
    },
    {
      key: "last",
      header: "Last Fired",
      mono: true,
      cell: (item) =>
        item.lastFiredAt ? (
          <span className="text-[12.5px] text-[var(--ink)]">{formatRelativeTime(item.lastFiredAt)}</span>
        ) : (
          <span className="text-[var(--ink-faint)]">Never</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusPill status={item.lastRunStatus} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          {item.fileExists && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                  <Link to="/triggers/editor/$" params={{ _splat: item.filename }} search={{ configure: false }}>
                    <Pencil className="size-4 text-[var(--ink-soft)]" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit trigger</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      title="Triggers"
      count={items.length}
      data={items}
      columns={columns}
      rowKey={(item) => item.id}
      showChevron
      onRowClick={(item) => navigate({ to: "/triggers/$", params: { _splat: item.filename } })}
    />
  );
}
