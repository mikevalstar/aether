import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { data: session } = authClient.useSession();

	return (
		<main className="page-wrap px-4 pb-8 pt-14">
			<section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-14 sm:px-10 sm:py-20">
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />

				<p className="island-kicker mb-3">Personal Dashboard</p>
				<h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
					Your life, organised.
				</h1>
				<p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
					Aether brings together your notes, tasks, and AI assistant in one
					calm, focused place.
				</p>

				<div className="flex flex-wrap gap-3">
					{session?.user ? (
						<Link
							to="/dashboard"
							className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white no-underline transition hover:-translate-y-0.5 hover:opacity-90"
						>
							Go to Dashboard
						</Link>
					) : (
						<>
							<Link
								to="/login"
								className="rounded-full bg-[var(--lagoon-deep)] px-6 py-3 text-sm font-semibold text-white no-underline transition hover:-translate-y-0.5 hover:opacity-90"
							>
								Get started
							</Link>
							<Link
								to="/login"
								className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-6 py-3 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
							>
								Sign in
							</Link>
						</>
					)}
				</div>
			</section>

			<section className="mt-8 grid gap-4 sm:grid-cols-3">
				{[
					[
						"💬",
						"AI Chat",
						"Ask questions about your Obsidian notes in natural language.",
					],
					[
						"📅",
						"Daily Planner",
						"Organise your tasks and goals for each day.",
					],
					[
						"📓",
						"Linked Notes",
						"Browse and connect ideas across your entire vault.",
					],
				].map(([icon, title, desc], index) => (
					<article
						key={title as string}
						className="island-shell feature-card rise-in rounded-2xl p-6"
						style={{ animationDelay: `${index * 90 + 80}ms` }}
					>
						<div className="mb-3 text-2xl">{icon}</div>
						<h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
							{title}
						</h2>
						<p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
					</article>
				))}
			</section>
		</main>
	);
}
