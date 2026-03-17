import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
	Activity,
	BarChart3,
	BookOpen,
	CheckSquare,
	Columns3,
	FileText,
	GitBranch,
	LayoutDashboard,
	Loader2,
	LogOut,
	MessageSquare,
	Plus,
	ScrollText,
	Settings,
	Sun,
	Users,
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

const PAGES = [
	{ label: "Dashboard", route: "/dashboard", icon: LayoutDashboard },
	{ label: "Chat", route: "/chat", icon: MessageSquare },
	{ label: "Tasks", route: "/tasks", icon: CheckSquare },
	{ label: "Workflows", route: "/workflows", icon: GitBranch },
	{ label: "Board", route: "/board", icon: Columns3 },
	{ label: "Obsidian", route: "/o", icon: BookOpen },
	{ label: "Activity", route: "/activity", icon: Activity },
	{ label: "Usage", route: "/usage", icon: BarChart3 },
	{ label: "Logs", route: "/logs", icon: ScrollText },
	{ label: "Requirements", route: "/requirements", icon: FileText },
	{ label: "Settings", route: "/settings/preferences", icon: Settings },
	{ label: "Users", route: "/users", icon: Users },
] as const;

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
				.catch(() => {})
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

	const themeLabel = `Toggle Theme (current: ${themeMode})`;

	return (
		<CommandDialog open={open} onOpenChange={setOpen} showCloseButton={false}>
			<CommandInput placeholder="Type a command or search..." value={search} onValueChange={setSearch} />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>

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

				{/* Actions */}
				<CommandGroup heading="Actions">
					<CommandItem value="action-new-chat" onSelect={() => select("/chat?new=1")}>
						<Plus className="mr-2 size-4" />
						New Chat
					</CommandItem>
					<CommandItem value="action-toggle-theme" onSelect={toggleTheme}>
						<Sun className="mr-2 size-4" />
						{themeLabel}
					</CommandItem>
					<CommandItem value="action-sign-out" onSelect={signOut}>
						<LogOut className="mr-2 size-4" />
						Sign Out
					</CommandItem>
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
