import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FileX, Pencil } from "lucide-react";
import { formatRelativeTime } from "#/components/activity/format-relative-time";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { TriggerListItem } from "#/lib/triggers/trigger.functions";

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  if (status === "success")
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        Success
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-red-600 border-red-300">
      <AlertCircle className="mr-1 size-3" />
      Error
    </Badge>
  );
}

export function TriggerTable({ items }: { items: TriggerListItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trigger</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Pattern</TableHead>
            <TableHead>Last Fired</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const dimmed = !item.fileExists || !item.enabled;

            return (
              <TableRow key={item.id} className={dimmed ? "opacity-50" : undefined}>
                <TableCell>
                  <Link to="/triggers/$" params={{ _splat: item.filename }} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.model}
                    {!item.fileExists && (
                      <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                        <FileX className="mr-1 size-3" />
                        File removed
                      </Badge>
                    )}
                    {!item.enabled && item.fileExists && (
                      <Badge variant="outline" className="ml-2">
                        Paused
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.type}</code>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  {item.pattern ? (
                    <Tooltip>
                      <TooltipTrigger className="text-sm truncate block max-w-[200px]">
                        <code className="text-xs">{item.pattern}</code>
                      </TooltipTrigger>
                      <TooltipContent>
                        <code className="text-xs">{item.pattern}</code>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-muted-foreground text-xs">All events</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {item.lastFiredAt ? (
                    formatRelativeTime(item.lastFiredAt)
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.lastRunStatus} />
                </TableCell>
                <TableCell>
                  {item.fileExists && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/triggers/editor/$" params={{ _splat: item.filename }} search={{ configure: false }}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit trigger</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
