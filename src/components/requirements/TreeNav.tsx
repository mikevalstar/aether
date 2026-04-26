import { Link } from "@tanstack/react-router";
import { FileTextIcon, FolderIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { getRequirementHref, type RequirementTreeNode } from "#/lib/requirements";
import { cn } from "#/lib/utils";
import { StatusBadge } from "./StatusBadge";

type TreeNavProps = {
  nodes: RequirementTreeNode[];
  currentRoutePath: string;
};

export function TreeNav({ nodes, currentRoutePath }: TreeNavProps) {
  return (
    <div className="surface-card lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:flex lg:flex-col overflow-hidden">
      <div className="border-b border-[var(--line)] px-3 py-2.5">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.15em] text-[var(--ink-dim)]">
          Index
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <TreeList nodes={nodes} currentRoutePath={currentRoutePath} />
      </nav>
    </div>
  );
}

function TreeList(props: { nodes: RequirementTreeNode[]; currentRoutePath: string; depth?: number }) {
  return (
    <ul className={cn("space-y-px", props.depth ? "mt-px" : "")}>
      {props.nodes.map((node) => (
        <li key={node.type === "folder" ? node.path : node.relativePath}>
          {node.type === "folder" ? (
            <div>
              <div
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--ink-dim)]"
                style={{
                  paddingLeft: `${(props.depth ?? 0) * 12 + 8}px`,
                }}
              >
                <FolderIcon className="size-3 text-[var(--ink-faint)]" />
                <span>{node.name}</span>
              </div>
              <TreeList nodes={node.children} currentRoutePath={props.currentRoutePath} depth={(props.depth ?? 0) + 1} />
            </div>
          ) : (
            <TreeNavLink
              routePath={node.routePath}
              isActive={node.routePath === props.currentRoutePath}
              depth={props.depth ?? 0}
              title={node.title}
              status={node.status}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function TreeNavLink(props: { routePath: string; isActive: boolean; depth: number; title: string; status?: string }) {
  return (
    <Link
      to={getRequirementHref(props.routePath)}
      className={cn(
        "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] no-underline transition-colors",
        props.isActive
          ? "bg-[var(--accent)]/10 font-medium text-[var(--ink)]"
          : "text-[var(--ink-soft)] hover:bg-[var(--accent)]/5 hover:text-[var(--ink)]",
      )}
      style={{
        paddingLeft: `${props.depth * 12 + 8}px`,
      }}
    >
      {props.isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-(--accent)" aria-hidden />
      )}
      <FileTextIcon
        className={cn(
          "size-3.5 shrink-0",
          props.isActive ? "text-[var(--accent)]" : "text-[var(--ink-faint)] group-hover:text-[var(--ink-soft)]",
        )}
      />
      <span className="truncate">{props.title}</span>
      {props.status ? (
        <span className="ml-auto shrink-0">
          <StatusBadge status={props.status} size="sm" />
        </span>
      ) : null}
    </Link>
  );
}

export function RequirementNavLink({
  routePath,
  hash,
  children,
  ...rest
}: Omit<ComponentPropsWithoutRef<typeof Link>, "to"> & {
  routePath: string;
  hash?: string;
  children: ReactNode;
}) {
  return (
    <Link to={`${getRequirementHref(routePath)}${hash ?? ""}`} {...rest}>
      {children}
    </Link>
  );
}
