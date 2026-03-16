import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { authClient } from "#/lib/auth-client";
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

const navLinks = [
	{ to: "/" as const, label: "Home", auth: false },
	{ to: "/dashboard" as const, label: "Dashboard", auth: true },
	{ to: "/chat" as const, label: "Chat", auth: true },
	{ to: "/usage" as const, label: "Usage", auth: true },
	{ to: "/tasks" as const, label: "Tasks", auth: true },
	{ to: "/activity" as const, label: "Activity", auth: true },
	{ to: "/o" as const, label: "Obsidian", auth: true },
	{ to: "/requirements" as const, label: "Requirements", auth: true },
];

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

	const visibleLinks = navLinks.filter((link) => !link.auth || session?.user);

	return (
		<header className="sticky top-0 z-50 border-b border-border bg-[var(--header-bg)] px-4 backdrop-blur-sm">
			<nav className="page-wrap flex items-center gap-6 py-3">
				<Link
					to="/"
					className="text-sm font-bold text-primary no-underline tracking-wide"
				>
					Aether
				</Link>

				{/* Desktop nav links */}
				<div className="hidden md:flex items-center gap-5 text-sm font-medium">
					{visibleLinks.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className="nav-link"
							activeProps={{ className: "nav-link is-active" }}
						>
							{link.label}
						</Link>
					))}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					{session?.user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									aria-label="User menu"
									className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<Avatar size="sm">
										{session.user.image && (
											<AvatarImage
												src={session.user.image}
												alt={session.user.name ?? ""}
											/>
										)}
										<AvatarFallback className="bg-primary text-xs text-primary-foreground">
											{getInitials(session.user.name, session.user.email)}
										</AvatarFallback>
									</Avatar>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<div className="px-2 py-1.5 text-sm">
									<p className="font-medium text-foreground">
										{session.user.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{session.user.email}
									</p>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onSelect={() =>
										void navigate({ to: "/settings/preferences" })
									}
								>
									<Settings className="mr-2 size-4" />
									Settings
								</DropdownMenuItem>
								{session.user.role === "admin" && (
									<DropdownMenuItem
										onSelect={() => void navigate({ to: "/users" })}
									>
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
						<SheetTitle className="text-sm font-bold text-primary">
							Aether
						</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col py-2">
						{visibleLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className="nav-link-mobile px-4 py-2.5 text-sm font-medium"
								activeProps={{
									className:
										"nav-link-mobile is-active px-4 py-2.5 text-sm font-medium",
								}}
							>
								{link.label}
							</Link>
						))}
						{session?.user && (
							<>
								<div className="my-2 border-t border-border" />
								<Link
									to="/settings/preferences"
									className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
									activeProps={{
										className:
											"nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
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
											className:
												"nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
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
