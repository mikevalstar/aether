import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const { data: session } = authClient.useSession();

	return (
		<main className="page-wrap px-4 py-16">
			<section className="mb-16">
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
					Personal Dashboard
				</p>
				<h1 className="display-title mb-4 max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
					Your life, organised.
				</h1>
				<p className="mb-8 max-w-lg text-base text-muted-foreground">
					Aether brings together your notes, tasks, and AI assistant in one
					calm, focused place.
				</p>

				<div className="flex flex-wrap gap-3">
					{session?.user ? (
						<Button asChild>
							<Link to="/dashboard" className="no-underline">
								Go to Dashboard
							</Link>
						</Button>
					) : (
						<Button asChild>
							<Link to="/login" className="no-underline">
								Sign in
							</Link>
						</Button>
					)}
				</div>
				<p className="mt-4 text-sm text-muted-foreground">
					Aether is invite-only right now. Ask an admin to create your account.
				</p>
			</section>

			<section className="grid overflow-hidden rounded-lg border border-border bg-border gap-px sm:grid-cols-3">
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
					<article key={title} className="bg-card p-6">
						<h2 className="mb-1.5 text-sm font-semibold">{title}</h2>
						<p className="m-0 text-sm text-muted-foreground">{desc}</p>
					</article>
				))}
			</section>
		</main>
	);
}
