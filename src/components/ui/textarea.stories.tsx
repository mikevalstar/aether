import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta = {
	title: "Design System/Forms/Textarea",
	component: Textarea,
	argTypes: {
		disabled: { control: "boolean" },
		placeholder: { control: "text" },
	},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { placeholder: "Type your message here..." },
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm gap-1.5">
			<Label htmlFor="message">Message</Label>
			<Textarea id="message" placeholder="Type your message here..." />
		</div>
	),
};

export const Disabled: Story = {
	args: { placeholder: "Disabled", disabled: true },
};

export const Invalid: Story = {
	render: () => (
		<div className="grid w-full max-w-sm gap-1.5">
			<Label htmlFor="bio">Bio</Label>
			<Textarea
				id="bio"
				aria-invalid="true"
				defaultValue="This field has an error"
			/>
		</div>
	),
};

export const WithDefaultValue: Story = {
	args: {
		defaultValue:
			"This textarea auto-sizes to fit its content thanks to field-sizing-content.",
	},
};
