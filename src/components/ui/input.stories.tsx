import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
	title: "Design System/Forms/Input",
	component: Input,
	argTypes: {
		type: {
			control: "select",
			options: ["text", "email", "password", "number", "search", "url"],
		},
		disabled: { control: "boolean" },
		placeholder: { control: "text" },
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { placeholder: "Enter text..." },
};

export const Email: Story = {
	args: { type: "email", placeholder: "you@example.com" },
};

export const Password: Story = {
	args: { type: "password", placeholder: "Password" },
};

export const Disabled: Story = {
	args: { placeholder: "Disabled", disabled: true },
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm gap-1.5">
			<Label htmlFor="email">Email</Label>
			<Input type="email" id="email" placeholder="you@example.com" />
		</div>
	),
};

export const Invalid: Story = {
	render: () => (
		<div className="grid w-full max-w-sm gap-1.5">
			<Label htmlFor="invalid">Email</Label>
			<Input
				type="email"
				id="invalid"
				placeholder="you@example.com"
				aria-invalid="true"
				defaultValue="not-an-email"
			/>
		</div>
	),
};
