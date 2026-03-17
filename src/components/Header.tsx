import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	Activity,
	BarChart3,
	BookOpen,
	CheckSquare,
	ChevronDown,
	Columns3,
	FileText,
	GitBranch,
	LayoutDashboard,
	LogOut,
	Menu,
	MessageSquare,
	ScrollText,
	Settings,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import CommandKButton from "#/components/CommandKButton";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { authClient } from "#/lib/auth-client";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

function getInitials(name?: string | null, email?: string | null) {
	if (name) {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	}
	if (email) return email[0].toUpperCase();
	return "?";
}

interface NavLink {
	to: string;
	label: string;
	icon: LucideIcon;
	auth: boolean;
}

const primaryLinks: NavLink[] = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
	{ to: "/chat", label: "Chat", icon: MessageSquare, auth: true },
	{ to: "/tasks", label: "Tasks", icon: CheckSquare, auth: true },
	{ to: "/workflows", label: "Workflows", icon: GitBranch, auth: true },
	{ to: "/board", label: "Board", icon: Columns3, auth: true },
	{ to: "/o", label: "Obsidian", icon: BookOpen, auth: true },
];

const systemLinks: NavLink[] = [
	{ to: "/activity", label: "Activity", icon: Activity, auth: true },
	{ to: "/usage", label: "Usage", icon: BarChart3, auth: true },
	{ to: "/logs", label: "Logs", icon: ScrollText, auth: true },
	{ to: "/requirements", label: "Requirements", icon: FileText, auth: true },
];

const publicLinks: NavLink[] = [{ to: "/", label: "Home", icon: LayoutDashboard, auth: false }];

export default function Header() {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();
	const [mobileOpen, setMobileOpen] = useState(false);
	const routerState = useRouterState();

	// Close mobile menu on navigation
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on pathname change
	useEffect(() => {
		setMobileOpen(false);
	}, [routerState.location.pathname]);

	const isAuthed = !!session?.user;
	const routerPath = routerState.location.pathname;

	// Check if any system link is currently active
	const systemIsActive = systemLinks.some((link) => routerPath.startsWith(link.to));

	// When logged in: show primary + system links. When not: show public links only.
	const visiblePrimary = isAuthed ? primaryLinks : publicLinks;

	return (
		<header className="sticky top-0 z-50 border-b border-border bg-[var(--header-bg)] px-4 backdrop-blur-sm">
			<nav className="page-wrap flex items-center gap-6 py-3">
				{/* Brand — links to dashboard when authed, home when not */}
				<Link to={isAuthed ? "/dashboard" : "/"} className="text-sm font-bold text-primary no-underline tracking-wide">
					Aether
				</Link>

				{/* Desktop nav links */}
				<div className="hidden md:flex items-center gap-4 text-sm font-medium">
					{visiblePrimary.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className="nav-link flex items-center gap-1.5"
							activeProps={{ className: "nav-link is-active flex items-center gap-1.5" }}
						>
							<link.icon className="size-3.5" />
							{link.label}
						</Link>
					))}

					{/* System dropdown — only when authed */}
					{isAuthed && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" className={`nav-link flex items-center gap-1.5 ${systemIsActive ? "is-active" : ""}`}>
									<Settings className="size-3.5" />
									System
									<ChevronDown className="size-3 opacity-50" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-44">
								{systemLinks.map((link) => (
									<DropdownMenuItem key={link.to} asChild>
										<Link to={link.to} className="flex items-center gap-2 no-underline">
											<link.icon className="size-4" />
											{link.label}
										</Link>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>

				<div className="ml-auto flex items-center gap-2">
					{isAuthed && <CommandKButton />}
					<ThemeToggle />
					{isAuthed && <NotificationBell />}
					{isAuthed ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label="User menu"
									className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<Avatar size="sm">
										{session.user.image && <AvatarImage src={session.user.image} alt={session.user.name ?? ""} />}
										<AvatarFallback className="bg-primary text-xs text-primary-foreground">
											{getInitials(session.user.name, session.user.email)}
										</AvatarFallback>
									</Avatar>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<div className="px-2 py-1.5 text-sm">
									<p className="font-medium text-foreground">{session.user.name}</p>
									<p className="text-xs text-muted-foreground">{session.user.email}</p>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => void navigate({ to: "/settings/preferences" })}>
									<Settings className="mr-2 size-4" />
									Settings
								</DropdownMenuItem>
								{session.user.role === "admin" && (
									<DropdownMenuItem onSelect={() => void navigate({ to: "/users" })}>
										<Users className="mr-2 size-4" />
										Users
									</DropdownMenuItem>
								)}
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => void authClient.signOut()}>
									<LogOut className="mr-2 size-4" />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button asChild size="sm">
							<Link to="/login" className="no-underline">
								Sign in
							</Link>
						</Button>
					)}

					{/* Mobile hamburger */}
					<button
						type="button"
						aria-label="Open menu"
						className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
						onClick={() => setMobileOpen(true)}
					>
						<Menu className="size-5" />
					</button>
				</div>
			</nav>

			{/* Mobile nav sheet */}
			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetContent side="right" className="w-64 p-0">
					<SheetHeader className="border-b border-border px-4 py-3">
						<SheetTitle className="text-sm font-bold text-primary">Aether</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col py-2">
						{visiblePrimary.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
								activeProps={{
									className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
								}}
							>
								<link.icon className="size-4" />
								{link.label}
							</Link>
						))}

						{isAuthed && (
							<>
								<div className="my-2 border-t border-border" />
								<p className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">System</p>
								{systemLinks.map((link) => (
									<Link
										key={link.to}
										to={link.to}
										className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
										activeProps={{
											className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
										}}
									>
										<link.icon className="size-4" />
										{link.label}
									</Link>
								))}
								<div className="my-2 border-t border-border" />
								<Link
									to="/settings/preferences"
									className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
									activeProps={{
										className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
									}}
								>
									<Settings className="size-4" />
									Settings
								</Link>
								{session.user.role === "admin" && (
									<Link
										to="/users"
										className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
										activeProps={{
											className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
										}}
									>
										<Users className="size-4" />
										Users
									</Link>
								)}
								<button
									type="button"
									className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2 text-left w-full"
									onClick={() => void authClient.signOut()}
								>
									<LogOut className="size-4" />
									Sign out
								</button>
							</>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</header>
	);
}
