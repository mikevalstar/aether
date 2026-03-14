import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatHeader } from "./ChatHeader";

const noop = () => {};

const meta = {
	title: "Chat/Chat Header",
	component: ChatHeader,
	args: {
		onMobileMenuClick: noop,
		onModelChange: noop,
		onDelete: noop,
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl border border-[var(--line)] bg-[var(--surface)]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChatHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithThread: Story = {
	args: {
		title: "How do I set up a Prisma schema?",
		model: "claude-haiku-4-5",
		showStats: true,
		inputTokens: 1_243,
		outputTokens: 3_891,
		costLabel: "$0.0207",
	},
};

export const NewChat: Story = {
	args: {
		title: "New chat",
		model: "claude-haiku-4-5",
		showStats: false,
		onDelete: undefined,
	},
};

export const SonnetModel: Story = {
	args: {
		title: "Explain quantum computing basics",
		model: "claude-sonnet-4-6",
		showStats: true,
		inputTokens: 8_402,
		outputTokens: 12_150,
		costLabel: "$0.2074",
	},
};

export const OpusModel: Story = {
	args: {
		title: "Review my architecture decisions",
		model: "claude-opus-4-6",
		showStats: true,
		inputTokens: 24_800,
		outputTokens: 45_230,
		costLabel: "$1.2548",
	},
};

export const LowUsage: Story = {
	args: {
		title: "Quick question about TypeScript",
		model: "claude-haiku-4-5",
		showStats: true,
		inputTokens: 42,
		outputTokens: 187,
		costLabel: "<$0.0001",
	},
};

export const Disabled: Story = {
	args: {
		title: "Processing...",
		model: "claude-haiku-4-5",
		showStats: true,
		inputTokens: 500,
		outputTokens: 1_200,
		costLabel: "$0.0065",
		disabled: true,
	},
};

export const WithMobileMenu: Story = {
	args: {
		title: "Mobile view with menu button",
		model: "claude-haiku-4-5",
		showStats: true,
		inputTokens: 2_100,
		outputTokens: 5_400,
		costLabel: "$0.0291",
		showMobileMenu: true,
	},
};

export const LongTitle: Story = {
	args: {
		title:
			"This is a very long thread title that should be truncated when it exceeds the available space in the header bar",
		model: "claude-sonnet-4-6",
		showStats: true,
		inputTokens: 3_200,
		outputTokens: 7_800,
		costLabel: "$0.1266",
	},
};
