import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
	title: "Design System/Forms/Label",
	component: Label,
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { children: "Email address" },
};

export const WithInput: Story = {
	render: () => (
		<div className="grid w-full max-w-sm gap-1.5">
			<Label htmlFor="name">Full name</Label>
			<Input id="name" placeholder="John Doe" />
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<Label>
			Email <span className="text-destructive">*</span>
		</Label>
	),
};
