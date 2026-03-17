import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge } from "./StatusBadge";

const meta = {
	title: "Features/Requirements/Status Badge",
	tags: ["autodocs"],
	component: StatusBadge,
	argTypes: {
		status: {
			control: "select",
			options: ["done", "in-progress", "todo"],
		},
		size: {
			control: "select",
			options: ["sm", "md"],
		},
	},
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Done: Story = {
	args: { status: "done" },
};

export const InProgress: Story = {
	args: { status: "in-progress" },
};

export const Todo: Story = {
	args: { status: "todo" },
};

export const SmallSize: Story = {
	args: { status: "in-progress", size: "sm" },
};

export const AllStatuses: Story = {
	args: { status: "done" },
	render: () => (
		<div className="flex flex-wrap items-center gap-3">
			<StatusBadge status="done" />
			<StatusBadge status="in-progress" />
			<StatusBadge status="todo" />
		</div>
	),
};

export const AllSmall: Story = {
	args: { status: "done", size: "sm" },
	render: () => (
		<div className="flex flex-wrap items-center gap-3">
			<StatusBadge status="done" size="sm" />
			<StatusBadge status="in-progress" size="sm" />
			<StatusBadge status="todo" size="sm" />
		</div>
	),
};

export const UnknownStatus: Story = {
	args: { status: "blocked" },
};
