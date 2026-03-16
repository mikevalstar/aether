import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, BrainCircuit, CalendarCheck, Shield, Zap } from "lucide-react";
import { FeatureCard } from "./feature-card";

const meta = {
	title: "Design System/Layout/Feature Card",
	component: FeatureCard,
	argTypes: {
		color: { control: "text" },
		bg: { control: "text" },
		border: { control: "text" },
	},
} satisfies Meta<typeof FeatureCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Teal: Story = {
	args: {
		icon: BrainCircuit,
		title: "AI Chat",
		description:
			"Ask questions about your notes in natural language. Claude understands context, connects ideas, and helps you think.",
		color: "text-[var(--teal)]",
		bg: "bg-[var(--teal-subtle)]",
		border: "border-[var(--teal)]/20",
	},
};

export const Coral: Story = {
	args: {
		icon: CalendarCheck,
		title: "Daily Planner",
		description: "Organise your tasks and goals for each day. Stay focused on what matters most.",
		color: "text-[var(--coral)]",
		bg: "bg-[var(--coral)]/8",
		border: "border-[var(--coral)]/20",
	},
};

export const Blue: Story = {
	args: {
		icon: BookOpen,
		title: "Linked Notes",
		description: "Browse and connect ideas across your entire vault. See relationships you didn't know existed.",
		color: "text-[var(--chart-3)]",
		bg: "bg-[var(--chart-3)]/8",
		border: "border-[var(--chart-3)]/20",
	},
};

export const DefaultColors: Story = {
	args: {
		icon: Shield,
		title: "Default Theme",
		description: "Uses primary/secondary tokens when no custom color props are provided.",
	},
};

export const Grid: Story = {
	args: {
		icon: BrainCircuit,
		title: "AI Chat",
		description: "Ask questions about your notes in natural language.",
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-3">
			<FeatureCard
				icon={BrainCircuit}
				title="AI Chat"
				description="Ask questions about your notes in natural language."
				color="text-[var(--teal)]"
				bg="bg-[var(--teal-subtle)]"
				border="border-[var(--teal)]/20"
			/>
			<FeatureCard
				icon={CalendarCheck}
				title="Daily Planner"
				description="Organise your tasks and goals for each day."
				color="text-[var(--coral)]"
				bg="bg-[var(--coral)]/8"
				border="border-[var(--coral)]/20"
			/>
			<FeatureCard
				icon={BookOpen}
				title="Linked Notes"
				description="Browse and connect ideas across your entire vault."
				color="text-[var(--chart-3)]"
				bg="bg-[var(--chart-3)]/8"
				border="border-[var(--chart-3)]/20"
			/>
		</div>
	),
};

export const TwoColumn: Story = {
	args: {
		icon: Zap,
		title: "Fast",
		description: "Optimised for speed. Everything loads instantly.",
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<FeatureCard
				icon={Zap}
				title="Fast"
				description="Optimised for speed. Everything loads instantly."
				color="text-[var(--coral)]"
				bg="bg-[var(--coral)]/8"
				border="border-[var(--coral)]/20"
			/>
			<FeatureCard
				icon={Shield}
				title="Secure"
				description="Your data stays on your machine. Always."
				color="text-[var(--teal)]"
				bg="bg-[var(--teal-subtle)]"
				border="border-[var(--teal)]/20"
			/>
		</div>
	),
};
