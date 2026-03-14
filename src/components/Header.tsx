import { Link } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	const { data: session } = authClient.useSession();

	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-sm">
			<nav className="page-wrap flex items-center gap-6 py-3">
				<Link
					to="/"
					className="text-sm font-semibold text-[var(--ink)] no-underline"
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
						<Link
							to="/dashboard"
							className="nav-link"
							activeProps={{ className: "nav-link is-active" }}
						>
							Dashboard
						</Link>
					)}
				</div>

				<div className="ml-auto flex items-center gap-3">
					{session?.user ? (
						<button
							type="button"
							onClick={() => {
								void authClient.signOut();
							}}
							className="text-sm text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
						>
							Sign out
						</button>
					) : (
						<Link
							to="/login"
							className="rounded-md bg-[var(--teal)] px-3 py-1.5 text-sm font-medium text-white no-underline transition hover:opacity-85"
						>
							Sign in
						</Link>
					)}
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
