import type { Meta, StoryObj } from "@storybook/react-vite";
import { TaskEmptyState } from "./TaskEmptyState";

const meta = {
	title: "Tasks/Empty State",
	component: TaskEmptyState,
	decorators: [
		(Story) => (
			<div className="max-w-2xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TaskEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
