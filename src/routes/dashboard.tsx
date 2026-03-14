import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && !session?.user) {
			void navigate({ to: "/login" });
		}
	}, [session, isPending, navigate]);

	if (isPending || !session?.user) {
		return (
			<main className="page-wrap flex items-center justify-center px-4 py-20">
				<Spinner />
			</main>
		);
	}

	const user = session.user;

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-10">
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
					Dashboard
				</p>
				<h1 className="display-title mb-1 text-3xl font-bold tracking-tight sm:text-4xl">
					Good to see you{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
				</h1>
				<p className="text-sm text-muted-foreground">{user.email}</p>
			</section>

			<section className="mb-6 grid gap-3 sm:grid-cols-2">
				<Link to="/settings/password" className="surface-card p-5 no-underline">
					<p className="text-sm font-semibold">Password</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Change your password or replace the temporary one you were given.
					</p>
				</Link>
				<Link to="/usage" className="surface-card p-5 no-underline">
					<p className="text-sm font-semibold">Usage</p>
					<p className="mt-1 text-sm text-muted-foreground">
						See chat token usage, estimated costs, and model trends over time.
					</p>
				</Link>
				<Link to="/requirements" className="surface-card p-5 no-underline">
					<p className="text-sm font-semibold">Requirements</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Read feature requirements and linked planning docs inside the app.
					</p>
				</Link>
				{user.role === "admin" ? (
					<Link to="/users" className="surface-card p-5 no-underline">
						<p className="text-sm font-semibold">Users</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Create invite-only accounts and manage who can sign in.
						</p>
					</Link>
				) : null}
			</section>

			<section className="grid overflow-hidden rounded-lg border border-border bg-border gap-px sm:grid-cols-3">
				{WIDGETS.map(({ title, desc }) => (
					<article key={title} className="bg-card p-6">
						<h2 className="mb-1.5 text-sm font-semibold">{title}</h2>
						<p className="m-0 text-sm text-muted-foreground">{desc}</p>
						<p className="mt-3 text-xs text-muted-foreground">Coming soon</p>
					</article>
				))}
			</section>

			<section className="mt-6">
				<Button
					variant="outline"
					onClick={() => {
						void authClient.signOut().then(() => navigate({ to: "/login" }));
					}}
				>
					Sign out
				</Button>
			</section>
		</main>
	);
}

const WIDGETS = [
	{
		title: "AI Chat",
		desc: "Chat with your Obsidian library using natural language queries.",
	},
	{
		title: "Notes",
		desc: "Browse and search your Obsidian vault directly from the dashboard.",
	},
	{
		title: "Daily Planner",
		desc: "Manage your tasks, goals, and schedule for the day.",
	},
];
