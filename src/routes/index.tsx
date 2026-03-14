import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { data: session } = authClient.useSession();

	return (
		<main className="page-wrap px-4 py-16">
			<section className="mb-16">
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--teal)]">
					Personal Dashboard
				</p>
				<h1 className="display-title mb-4 max-w-xl text-4xl font-bold leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
					Your life, organised.
				</h1>
				<p className="mb-8 max-w-lg text-base text-[var(--ink-soft)]">
					Aether brings together your notes, tasks, and AI assistant in one
					calm, focused place.
				</p>

				<div className="flex flex-wrap gap-3">
					{session?.user ? (
						<Link
							to="/dashboard"
							className="rounded-md bg-[var(--teal)] px-5 py-2.5 text-sm font-medium text-white no-underline transition hover:opacity-85"
						>
							Go to Dashboard
						</Link>
					) : (
						<Link
							to="/login"
							className="rounded-md bg-[var(--teal)] px-5 py-2.5 text-sm font-medium text-white no-underline transition hover:opacity-85"
						>
							Sign in
						</Link>
					)}
				</div>
				<p className="mt-4 text-sm text-[var(--ink-soft)]">
					Aether is invite-only right now. Ask an admin to create your account.
				</p>
			</section>

			<section className="grid overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--line)] gap-px sm:grid-cols-3">
				{[
					[
						"AI Chat",
						"Ask questions about your Obsidian notes in natural language.",
					],
					["Daily Planner", "Organise your tasks and goals for each day."],
					[
						"Linked Notes",
						"Browse and connect ideas across your entire vault.",
					],
				].map(([title, desc]) => (
					<article key={title} className="bg-[var(--surface)] p-6">
						<h2 className="mb-1.5 text-sm font-semibold text-[var(--ink)]">
							{title}
						</h2>
						<p className="m-0 text-sm text-[var(--ink-soft)]">{desc}</p>
					</article>
				))}
			</section>
		</main>
	);
}
