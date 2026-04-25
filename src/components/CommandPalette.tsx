import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
  Activity,
  AlarmClock,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  CircuitBoard,
  Columns3,
  CornerDownLeft,
  FileText,
  GitBranch,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Plus,
  Puzzle,
  ScrollText,
  Settings,
  Sun,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import { authClient } from "#/lib/auth-client";
import {
  type CommandPaletteObsidianResult,
  type CommandPaletteWorkflow,
  getCommandPaletteWorkflows,
  searchCommandPaletteObsidian,
} from "#/lib/command-palette.functions";
import { themeModeAtom } from "#/lib/theme";
import { plugins } from "#/plugins";
import type { PluginCommand } from "#/plugins/types";

const STATIC_PAGES = [
  { label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
  { label: "Chat", route: "/chat", icon: MessageSquare },
  { label: "Tasks", route: "/tasks", icon: CheckSquare },
  { label: "Task Editor", route: "/tasks/editor", icon: CheckSquare },
  { label: "Workflows", route: "/workflows", icon: GitBranch },
  { label: "Workflow Editor", route: "/workflows/editor", icon: GitBranch },
  { label: "Triggers", route: "/triggers", icon: Zap },
  { label: "Trigger Editor", route: "/triggers/editor", icon: Zap },
  { label: "Webhooks", route: "/triggers/webhooks", icon: Webhook },
  { label: "Board", route: "/board", icon: Columns3 },
  { label: "Obsidian", route: "/o", icon: BookOpen },
  { label: "Notifications", route: "/notifications", icon: Bell },
  { label: "Scheduled Notifications", route: "/scheduled-notifications", icon: AlarmClock },
  { label: "Activity", route: "/activity", icon: Activity },
  { label: "Usage", route: "/usage", icon: BarChart3 },
  { label: "Logs", route: "/logs", icon: ScrollText },
  { label: "Chat Debug", route: "/chat-debug", icon: CircuitBoard },
  { label: "Requirements", route: "/requirements", icon: FileText },
  { label: "Settings", route: "/settings/profile", icon: Settings },
  { label: "Plugins", route: "/settings/plugins", icon: Puzzle },
  { label: "Users", route: "/users", icon: Users },
] as const;

// Build PAGES array including plugin pages
const pluginPages = plugins
  .filter((p) => p.client?.pages?.length)
  .flatMap((p) =>
    (p.client?.pages ?? []).map((page) => ({
      label: page.label,
      route: `/p/${p.meta.id}${(p.client?.pages?.length ?? 0) > 1 ? `/${page.id}` : ""}`,
      icon: page.icon ?? p.meta.icon,
    })),
  );

const PAGES = [...STATIC_PAGES, ...pluginPages];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useAtom(themeModeAtom);

  // Lazy-loaded data
  const [workflows, setWorkflows] = useState<CommandPaletteWorkflow[]>([]);
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const workflowsCached = useRef(false);

  const [obsidianResults, setObsidianResults] = useState<CommandPaletteObsidianResult[]>([]);
  const [obsidianLoading, setObsidianLoading] = useState(false);
  const obsidianDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fetch workflows on open
  useEffect(() => {
    if (open && !workflowsCached.current) {
      setWorkflowsLoading(true);
      getCommandPaletteWorkflows()
        .then((data) => {
          setWorkflows(data);
          workflowsCached.current = true;
        })
        .catch((err) => console.error("Failed to load workflows:", err))
        .finally(() => setWorkflowsLoading(false));
    }
  }, [open]);

  // Debounced obsidian search
  useEffect(() => {
    if (obsidianDebounce.current) clearTimeout(obsidianDebounce.current);

    if (!open || !search.trim()) {
      setObsidianResults([]);
      setObsidianLoading(false);
      return;
    }

    setObsidianLoading(true);
    obsidianDebounce.current = setTimeout(() => {
      searchCommandPaletteObsidian({ data: { query: search } })
        .then(setObsidianResults)
        .catch(() => setObsidianResults([]))
        .finally(() => setObsidianLoading(false));
    }, 250);

    return () => {
      if (obsidianDebounce.current) clearTimeout(obsidianDebounce.current);
    };
  }, [search, open]);

  // Clear search on close
  useEffect(() => {
    if (!open) {
      setSearch("");
      setObsidianResults([]);
    }
  }, [open]);

  const select = useCallback(
    (route: string) => {
      setOpen(false);
      void navigate({ to: route });
    },
    [navigate],
  );

  const toggleTheme = useCallback(() => {
    const next = themeMode === "light" ? "dark" : themeMode === "dark" ? "auto" : "light";
    setThemeMode(next);
    setOpen(false);
  }, [themeMode, setThemeMode]);

  const signOut = useCallback(() => {
    setOpen(false);
    void authClient.signOut().then(() => {
      void navigate({ to: "/login" });
    });
  }, [navigate]);

  const themeLabel = `Toggle theme (current: ${themeMode})`;

  // Raycast-style palette:
  // - Wider dialog (sm:max-w-2xl) so longer page / vault titles don't truncate.
  // - Group headings rendered as uppercase eyebrow labels in `--ink-dim`.
  // - Selected row gets a 2px `--accent` left-bar via the `palette-cmd` styles
  //   added in `styles.css` (cmdk applies `data-selected=true` on the focused
  //   item and `data-[selected=true]:bg-accent` already maps to
  //   `--accent-subtle` via our token aliases).
  // - Footer strip with ↵ to open · ⌘K to close — borrowed straight from
  //   Raycast / Linear.
  return (
    <CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false} className="palette-cmd sm:max-w-2xl">
      <CommandInput placeholder="Search pages, workflows, vault…" value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-sm text-foreground">No results</span>
            <span className="text-xs text-muted-foreground">Try a different search term.</span>
          </div>
        </CommandEmpty>

        {/* Pages */}
        <CommandGroup heading="Pages">
          {PAGES.map((page) => (
            <CommandItem key={page.route} value={`page-${page.label}`} onSelect={() => select(page.route)}>
              <page.icon className="mr-2 size-4" />
              {page.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Workflows */}
        <CommandGroup heading="Workflows">
          {workflowsLoading && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Loading workflows...
            </div>
          )}
          {workflows.map((wf) => (
            <CommandItem
              key={wf.filename}
              value={`workflow-${wf.title}`}
              onSelect={() => select(`/workflows/${wf.filename}`)}
            >
              <GitBranch className="mr-2 size-4" />
              {wf.title}
            </CommandItem>
          ))}
          {!workflowsLoading && workflows.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No workflows found</div>
          )}
        </CommandGroup>

        {/* Obsidian — server-side search, disable cmdk filtering */}
        {search.trim() && (
          <CommandGroup heading="Obsidian" forceMount>
            {obsidianLoading && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Searching vault...
              </div>
            )}
            {obsidianResults.map((result) => (
              <CommandItem
                key={result.routePath}
                value={`obsidian-${result.routePath}`}
                onSelect={() => select(`/o/${result.routePath}`)}
                forceMount
              >
                <BookOpen className="mr-2 size-4" />
                <span>{result.title}</span>
                {result.folder && <span className="ml-auto text-xs text-muted-foreground">{result.folder}</span>}
              </CommandItem>
            ))}
            {!obsidianLoading && obsidianResults.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No vault results</div>
            )}
          </CommandGroup>
        )}

        {/* Plugins */}
        {(() => {
          const pluginCommands: Array<{ pluginName: string; command: PluginCommand }> = [];
          for (const plugin of plugins) {
            for (const cmd of plugin.client?.commands ?? []) {
              pluginCommands.push({ pluginName: plugin.meta.name, command: cmd });
            }
          }
          if (pluginCommands.length === 0) return null;
          return (
            <CommandGroup heading="Plugins">
              {pluginCommands.map((pc) => {
                const CmdIcon = pc.command.icon;
                return (
                  <CommandItem
                    key={`plugin-${pc.command.label}`}
                    value={`plugin-${pc.command.label}`}
                    onSelect={() => {
                      if (pc.command.route) {
                        select(pc.command.route);
                      }
                    }}
                  >
                    {CmdIcon && <CmdIcon className="mr-2 size-4" />}
                    {pc.command.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })()}

        {/* Actions */}
        <CommandGroup heading="Actions">
          <CommandItem value="action-new-chat" onSelect={() => select("/chat")}>
            <Plus className="mr-2 size-4" />
            New chat
          </CommandItem>
          <CommandItem value="action-toggle-theme" onSelect={toggleTheme}>
            <Sun className="mr-2 size-4" />
            {themeLabel}
          </CommandItem>
          <CommandItem value="action-sign-out" onSelect={signOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
      {/* Footer hint strip — Raycast / Linear style. */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] text-foreground">
              <CornerDownLeft className="size-2.5" />
            </kbd>
            <span>open</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex h-4 items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] text-foreground">
              ↑↓
            </kbd>
            <span>navigate</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="inline-flex h-4 items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] text-foreground">
              esc
            </kbd>
            <span>close</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[var(--accent)]">
          <span className="font-mono">æ</span>
          <ArrowRight className="size-2.5" />
          <span className="font-medium tracking-tight">Aether</span>
        </span>
      </div>
    </CommandDialog>
  );
}
