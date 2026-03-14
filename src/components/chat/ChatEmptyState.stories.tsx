import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatEmptyState } from "./ChatEmptyState";

const noop = () => {};

const meta = {
	title: "Chat/Empty State",
	component: ChatEmptyState,
	args: {
		onModelChange: noop,
		onSend: noop,
	},
	decorators: [
		(Story) => (
			<div className="h-[600px] rounded-xl border border-[var(--line)] bg-[var(--surface)]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChatEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		model: "claude-haiku-4-5",
		modelLabel: "Claude Haiku 4.5",
	},
};

export const Sonnet: Story = {
	args: {
		model: "claude-sonnet-4-6",
		modelLabel: "Claude Sonnet 4.6",
	},
};

export const Opus: Story = {
	args: {
		model: "claude-opus-4-6",
		modelLabel: "Claude Opus 4.6",
	},
};

export const Disabled: Story = {
	args: {
		model: "claude-haiku-4-5",
		modelLabel: "Claude Haiku 4.5",
		disabled: true,
	},
};
