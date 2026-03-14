import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--teal)]" />
			</main>
		);
	}

	const user = session.user;

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-10">
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--teal)]">
					Dashboard
				</p>
				<h1 className="display-title mb-1 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
					Good to see you{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
				</h1>
				<p className="text-sm text-[var(--ink-soft)]">{user.email}</p>
			</section>

			<section className="mb-6 grid gap-3 sm:grid-cols-2">
				<Link to="/settings/password" className="surface-card p-5 no-underline">
					<p className="text-sm font-semibold text-[var(--ink)]">Password</p>
					<p className="mt-1 text-sm text-[var(--ink-soft)]">
						Change your password or replace the temporary one you were given.
					</p>
				</Link>
				<Link to="/usage" className="surface-card p-5 no-underline">
					<p className="text-sm font-semibold text-[var(--ink)]">Usage</p>
					<p className="mt-1 text-sm text-[var(--ink-soft)]">
						See chat token usage, estimated costs, and model trends over time.
					</p>
				</Link>
				<Link to="/requirements" className="surface-card p-5 no-underline">
					<p className="text-sm font-semibold text-[var(--ink)]">
						Requirements
					</p>
					<p className="mt-1 text-sm text-[var(--ink-soft)]">
						Read feature requirements and linked planning docs inside the app.
					</p>
				</Link>
				{user.role === "admin" ? (
					<Link to="/users" className="surface-card p-5 no-underline">
						<p className="text-sm font-semibold text-[var(--ink)]">Users</p>
						<p className="mt-1 text-sm text-[var(--ink-soft)]">
							Create invite-only accounts and manage who can sign in.
						</p>
					</Link>
				) : null}
			</section>

			<section className="grid overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] gap-px sm:grid-cols-3">
				{WIDGETS.map(({ title, desc }) => (
					<article key={title} className="bg-[var(--surface)] p-6">
						<h2 className="mb-1.5 text-sm font-semibold text-[var(--ink)]">
							{title}
						</h2>
						<p className="m-0 text-sm text-[var(--ink-soft)]">{desc}</p>
						<p className="mt-3 text-xs text-[var(--ink-soft)]">Coming soon</p>
					</article>
				))}
			</section>

			<section className="mt-6">
				<button
					type="button"
					onClick={() => {
						void authClient.signOut().then(() => navigate({ to: "/login" }));
					}}
					className="rounded-md border border-[var(--line)] px-5 py-2.5 text-sm font-medium text-[var(--ink-soft)] transition hover:border-[var(--teal)] hover:text-[var(--ink)]"
				>
					Sign out
				</button>
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
