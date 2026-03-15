import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
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

export default function Header() {
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();

	return (
		<header className="sticky top-0 z-50 border-b border-border bg-[var(--header-bg)] px-4 backdrop-blur-sm">
			<nav className="page-wrap flex items-center gap-6 py-3">
				<Link
					to="/"
					className="text-sm font-bold text-primary no-underline tracking-wide"
				>
					Aether
				</Link>

				<div className="flex items-center gap-5 text-sm font-medium">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Home
					</Link>
					{session?.user && (
						<>
							<Link
								to="/dashboard"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Dashboard
							</Link>
							<Link
								to="/chat"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Chat
							</Link>
							<Link
								to="/usage"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Usage
							</Link>
							<Link
								to="/activity"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Activity
							</Link>
							<Link
								to="/o"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Obsidian
							</Link>
							<Link
								to="/requirements"
								className="nav-link"
								activeProps={{ className: "nav-link is-active" }}
							>
								Requirements
							</Link>
						</>
					)}
				</div>

				<div className="ml-auto flex items-center gap-2">
					<ThemeToggle />
					{session?.user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
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
									onSelect={() => void navigate({ to: "/settings/password" })}
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
				</div>
			</nav>
		</header>
	);
}
