import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpen,
	BrainCircuit,
	CalendarCheck,
	Lock,
	Sparkles,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { FeatureCard } from "#/components/ui/feature-card";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: HomePage });

const features = [
	{
		icon: BrainCircuit,
		title: "AI Chat",
		description:
			"Ask questions about your notes in natural language. Claude understands context, connects ideas, and helps you think.",
		color: "text-[var(--teal)]",
		bg: "bg-[var(--teal-subtle)]",
		border: "border-[var(--teal)]/20",
	},
	{
		icon: CalendarCheck,
		title: "Daily Planner",
		description:
			"Organise your tasks and goals for each day. Stay focused on what matters most.",
		color: "text-[var(--coral)]",
		bg: "bg-[var(--coral)]/8",
		border: "border-[var(--coral)]/20",
	},
	{
		icon: BookOpen,
		title: "Linked Notes",
		description:
			"Browse and connect ideas across your entire vault. See relationships you didn't know existed.",
		color: "text-[var(--chart-3)]",
		bg: "bg-[var(--chart-3)]/8",
		border: "border-[var(--chart-3)]/20",
	},
] as const;

function HomePage() {
	const { data: session } = authClient.useSession();

	return (
		<main className="relative overflow-hidden">
			<GlowBg
				color="var(--teal)"
				size="size-[600px]"
				position="-right-40 -top-40"
			/>
			<GlowBg
				color="var(--coral)"
				size="size-[400px]"
				position="-left-32 top-1/3"
			/>

			{/* Hero */}
			<section className="page-wrap relative px-4 pb-24 pt-20 sm:pt-28">
				<SectionLabel icon={Sparkles}>Personal Dashboard</SectionLabel>

				<h1 className="display-title mt-6 mb-6 max-w-2xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
					Your life, <span className="text-[var(--teal)]">organised.</span>
				</h1>

				<p className="mb-10 max-w-lg text-lg leading-relaxed text-muted-foreground">
					Aether brings together your notes, tasks, and AI assistant in one
					calm, focused space — so you can think clearly and act deliberately.
				</p>

				<div className="flex flex-wrap items-center gap-4">
					{session?.user ? (
						<Button asChild size="lg" className="gap-2 pr-5">
							<Link to="/dashboard" className="no-underline">
								Go to Dashboard
								<ArrowRight className="size-4" />
							</Link>
						</Button>
					) : (
						<Button asChild size="lg" className="gap-2 pr-5">
							<Link to="/login" className="no-underline">
								Sign in
								<ArrowRight className="size-4" />
							</Link>
						</Button>
					)}
					<span className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Lock className="size-3.5" />
						Invite-only
					</span>
				</div>
			</section>

			{/* Features */}
			<section className="page-wrap px-4 pb-28">
				<div className="grid gap-6 sm:grid-cols-3">
					{features.map((feature) => (
						<FeatureCard key={feature.title} {...feature} />
					))}
				</div>
			</section>
		</main>
	);
}
