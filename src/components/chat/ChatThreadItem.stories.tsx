import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatThreadItem } from "./ChatThreadItem";

const noop = () => {};

const meta = {
	title: "Features/Chat/Thread Item",
	tags: ["autodocs"],
	component: ChatThreadItem,
	args: {
		onClick: noop,
		onDelete: noop,
	},
	decorators: [
		(Story) => (
			<div className="w-80 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChatThreadItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		title: "How do I set up Prisma?",
		preview: "You can start by installing the Prisma CLI...",
	},
};

export const Active: Story = {
	args: {
		title: "How do I set up Prisma?",
		preview: "You can start by installing the Prisma CLI...",
		isActive: true,
	},
};

export const LongTitle: Story = {
	args: {
		title: "This is a very long thread title that should truncate gracefully in the sidebar",
		preview: "And this preview text is also quite long and should be truncated as well to keep the layout clean",
	},
};

export const Disabled: Story = {
	args: {
		title: "Read-only thread",
		preview: "Cannot delete while busy...",
		isActive: true,
		disabled: true,
	},
};

export const ThreadList: Story = {
	args: {
		title: "",
		preview: "",
	},
	render: () => (
		<div className="space-y-1">
			<ChatThreadItem
				title="Architecture review notes"
				preview="Let me break down the key concerns..."
				isActive
				onClick={noop}
				onDelete={noop}
			/>
			<ChatThreadItem
				title="TypeScript generics help"
				preview="Generics let you create reusable components..."
				onClick={noop}
				onDelete={noop}
			/>
			<ChatThreadItem
				title="Debugging the auth flow"
				preview="The issue is in the session middleware..."
				onClick={noop}
				onDelete={noop}
			/>
			<ChatThreadItem
				title="Recipe ideas for dinner"
				preview="Here are some quick weeknight options..."
				onClick={noop}
				onDelete={noop}
			/>
		</div>
	),
};
