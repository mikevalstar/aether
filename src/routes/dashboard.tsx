import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpen,
	CalendarCheck,
	ChartLine,
	FileText,
	KeyRound,
	LogOut,
	RefreshCw,
	Sparkles,
	Users,
	Workflow,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "#/components/ui/button";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { Spinner } from "#/components/ui/spinner";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";
import { getCurrentHour } from "#/lib/date";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
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
	const firstName = user.name ? user.name.split(" ")[0] : null;
	const greeting = getGreeting();

	return (
		<main className="relative overflow-hidden">
			<GlowBg color="var(--teal)" size="size-[500px]" position="-right-48 -top-48" />
			<GlowBg color="var(--coral)" size="size-[350px]" position="-left-36 top-64" />

			<div className="page-wrap relative px-4 pb-16 pt-12 sm:pt-16">
				{/* Header */}
				<section className="mb-12">
					<SectionLabel icon={CalendarCheck}>{greeting}</SectionLabel>

					<h1 className="display-title mt-5 mb-2 text-4xl font-bold tracking-tight sm:text-5xl">
						{firstName ? (
							<>
								Hey, <span className="text-[var(--teal)]">{firstName}</span>
							</>
						) : (
							<>
								Welcome <span className="text-[var(--teal)]">back</span>
							</>
						)}
					</h1>
					<p className="text-sm text-muted-foreground">{user.email}</p>
				</section>

				{/* Quick actions */}
				<section className="mb-12">
					<h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quick actions</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Link
							to="/chat"
							className="group relative rounded-xl border border-[var(--teal)]/20 bg-[var(--teal-subtle)] p-6 no-underline transition-shadow hover:shadow-lg"
						>
							<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--teal-subtle)] text-[var(--teal)]">
								<Sparkles className="size-5" strokeWidth={1.75} />
							</div>
							<p className="mb-1 text-base font-bold tracking-tight text-foreground">AI Chat</p>
							<p className="mb-3 text-sm leading-relaxed text-muted-foreground">
								Ask questions, explore ideas, and chat with Claude.
							</p>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--teal)]">
								Open chat
								<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
							</span>
						</Link>

						<Link
							to="/usage"
							className="group relative rounded-xl border border-[var(--coral)]/20 bg-[var(--coral)]/8 p-6 no-underline transition-shadow hover:shadow-lg"
						>
							<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--coral)]/8 text-[var(--coral)]">
								<ChartLine className="size-5" strokeWidth={1.75} />
							</div>
							<p className="mb-1 text-base font-bold tracking-tight text-foreground">Usage</p>
							<p className="mb-3 text-sm leading-relaxed text-muted-foreground">
								Token usage, costs, and model trends over time.
							</p>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--coral)]">
								View stats
								<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
							</span>
						</Link>

						<a
							href="/o/"
							className="group relative rounded-xl border border-[var(--chart-4)]/20 bg-[var(--chart-4)]/8 p-6 no-underline transition-shadow hover:shadow-lg"
						>
							<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--chart-4)]/8 text-[var(--chart-4)]">
								<BookOpen className="size-5" strokeWidth={1.75} />
							</div>
							<p className="mb-1 text-base font-bold tracking-tight text-foreground">Linked Notes</p>
							<p className="mb-3 text-sm leading-relaxed text-muted-foreground">Browse and search your Obsidian vault.</p>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--chart-4)]">
								Open vault
								<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
							</span>
						</a>

						<a
							href="/tasks/"
							className="group relative rounded-xl border border-[var(--chart-3)]/20 bg-[var(--chart-3)]/8 p-6 no-underline transition-shadow hover:shadow-lg"
						>
							<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--chart-3)]/8 text-[var(--chart-3)]">
								<RefreshCw className="size-5" strokeWidth={1.75} />
							</div>
							<p className="mb-1 text-base font-bold tracking-tight text-foreground">Recurring Tasks</p>
							<p className="mb-3 text-sm leading-relaxed text-muted-foreground">
								Track scheduled AI tasks, review run history, and tune your automations.
							</p>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--chart-3)]">
								Open tasks
								<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
							</span>
						</a>

						<a
							href="/workflows/"
							className="group relative rounded-xl border border-[var(--chart-4)]/20 bg-[var(--chart-4)]/8 p-6 no-underline transition-shadow hover:shadow-lg"
						>
							<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--chart-4)]/8 text-[var(--chart-4)]">
								<Workflow className="size-5" strokeWidth={1.75} />
							</div>
							<p className="mb-1 text-base font-bold tracking-tight text-foreground">Workflows</p>
							<p className="mb-3 text-sm leading-relaxed text-muted-foreground">
								Launch form-based AI workflows from your Obsidian config and review past runs.
							</p>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--chart-4)]">
								Open workflows
								<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
							</span>
						</a>

						<Link
							to="/requirements"
							className="group relative rounded-xl border border-[var(--chart-3)]/20 bg-[var(--chart-3)]/8 p-6 no-underline transition-shadow hover:shadow-lg"
						>
							<div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--chart-3)]/8 text-[var(--chart-3)]">
								<FileText className="size-5" strokeWidth={1.75} />
							</div>
							<p className="mb-1 text-base font-bold tracking-tight text-foreground">Requirements</p>
							<p className="mb-3 text-sm leading-relaxed text-muted-foreground">Feature specs and linked planning docs.</p>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--chart-3)]">
								Browse docs
								<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
							</span>
						</Link>
					</div>
				</section>

				{/* Settings & admin */}
				<section className="mb-12 flex flex-wrap items-center gap-3">
					<Link
						to="/settings/password"
						className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground no-underline transition-colors hover:border-[var(--teal)]/30 hover:text-foreground"
					>
						<KeyRound className="size-3.5" strokeWidth={1.75} />
						Password
					</Link>
					{user.role === "admin" ? (
						<Link
							to="/users"
							className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground no-underline transition-colors hover:border-[var(--coral)]/30 hover:text-foreground"
						>
							<Users className="size-3.5" strokeWidth={1.75} />
							Users
						</Link>
					) : null}
				</section>

				{/* Upcoming features */}
				<section className="mb-10">
					<h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Still to build</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{UPCOMING.map(({ icon: Icon, title, desc, color, bg, border }) => (
							<div key={title} className={`rounded-xl border ${border} ${bg} p-6 opacity-75`}>
								<div className={`mb-3 inline-flex size-9 items-center justify-center rounded-lg ${bg} ${color}`}>
									<Icon className="size-4" strokeWidth={1.75} />
								</div>
								<h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
								<p className="m-0 text-sm text-muted-foreground">{desc}</p>
							</div>
						))}
					</div>
				</section>

				{/* Sign out */}
				<section>
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 text-muted-foreground hover:text-foreground"
						onClick={() => {
							void authClient.signOut().then(() => navigate({ to: "/login" }));
						}}
					>
						<LogOut className="size-3.5" />
						Sign out
					</Button>
				</section>
			</div>
		</main>
	);
}

function getGreeting(): string {
	const hour = getCurrentHour();
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

const UPCOMING = [
	{
		icon: CalendarCheck,
		title: "Daily Planner",
		desc: "Manage your tasks, goals, and schedule for the day.",
		color: "text-[var(--chart-5)]",
		bg: "bg-[var(--chart-5)]/8",
		border: "border-[var(--chart-5)]/15",
	},
];
