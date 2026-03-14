import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./spinner";

const meta = {
	title: "UI/Spinner",
	component: Spinner,
	argTypes: {
		size: {
			control: "select",
			options: ["default", "sm", "lg"],
		},
	},
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
	args: { size: "sm" },
};

export const Large: Story = {
	args: { size: "lg" },
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-4">
			<Spinner size="sm" />
			<Spinner />
			<Spinner size="lg" />
		</div>
	),
};

export const WithText: Story = {
	render: () => (
		<div className="flex items-center gap-2 text-sm text-muted-foreground">
			<Spinner size="sm" />
			Loading…
		</div>
	),
};
