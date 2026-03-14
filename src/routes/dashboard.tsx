import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--lagoon-rim)] border-t-[var(--lagoon-deep)]" />
			</main>
		);
	}

	const user = session.user;
	const initials = user.name
		? user.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: (user.email?.[0] ?? "U").toUpperCase();

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			{/* Greeting */}
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />

				<div className="flex flex-wrap items-center gap-4">
					<div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#56c6be,#2f6a4a)] text-lg font-bold text-white shadow-md">
						{user.image ? (
							<img
								src={user.image}
								alt=""
								className="h-14 w-14 rounded-full object-cover"
							/>
						) : (
							initials
						)}
					</div>
					<div>
						<p className="island-kicker mb-1">Dashboard</p>
						<h1 className="display-title text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
							Good to see you{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
						</h1>
						<p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
							{user.email}
						</p>
					</div>
				</div>
			</section>

			{/* Placeholder widgets */}
			<section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{WIDGETS.map(({ title, desc, icon }, index) => (
					<article
						key={title}
						className="island-shell feature-card rise-in rounded-2xl p-6"
						style={{ animationDelay: `${index * 80 + 60}ms` }}
					>
						<div className="mb-3 text-2xl">{icon}</div>
						<h2 className="mb-1.5 text-base font-semibold text-[var(--sea-ink)]">
							{title}
						</h2>
						<p className="text-sm text-[var(--sea-ink-soft)]">{desc}</p>
						<div className="mt-4 h-1.5 w-full rounded-full bg-[var(--line)]">
							<div className="h-full w-0 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
						</div>
						<p className="mt-1.5 text-xs text-[var(--sea-ink-soft)]">
							Coming soon
						</p>
					</article>
				))}
			</section>

			{/* Quick actions */}
			<section className="island-shell mt-6 rounded-2xl p-6">
				<p className="island-kicker mb-3">Quick Actions</p>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={() => {
							void authClient.signOut().then(() => navigate({ to: "/login" }));
						}}
						className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
					>
						Sign out
					</button>
				</div>
			</section>
		</main>
	);
}

const WIDGETS = [
	{
		icon: "💬",
		title: "AI Chat",
		desc: "Chat with your Obsidian library using natural language queries.",
	},
	{
		icon: "📓",
		title: "Notes",
		desc: "Browse and search your Obsidian vault directly from the dashboard.",
	},
	{
		icon: "📅",
		title: "Daily Planner",
		desc: "Manage your tasks, goals, and schedule for the day.",
	},
];
