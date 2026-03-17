import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "jotai";
import ThemeToggle from "./ThemeToggle";

const meta = {
	title: "Design System/Theme/ThemeToggle",
	tags: ["autodocs"],
	component: ThemeToggle,
	decorators: [
		(Story) => (
			<Provider>
				<div className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
					<Story />
					<span className="text-sm text-muted-foreground">Click to cycle: light → dark → auto</span>
				</div>
			</Provider>
		),
	],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
