import type { Meta, StoryObj } from "@storybook/react-vite";
import { Rocket, Sparkles, Star } from "lucide-react";
import { SectionLabel } from "./section-label";

const meta = {
	title: "Design System/Typography/Section Label",
	tags: ["autodocs"],
	component: SectionLabel,
	argTypes: {
		color: { control: "text" },
	},
} satisfies Meta<typeof SectionLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		icon: Sparkles,
		children: "Personal Dashboard",
	},
};

export const Teal: Story = {
	args: {
		icon: Rocket,
		children: "Features",
		color: "text-[var(--teal)]",
	},
};

export const NoIcon: Story = {
	args: {
		children: "Section Title",
	},
};

export const CustomColor: Story = {
	args: {
		icon: Star,
		children: "Highlights",
		color: "text-[var(--chart-3)]",
	},
};
