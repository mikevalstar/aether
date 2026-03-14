import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
	title: "Design System/Forms/Switch",
	component: Switch,
	argTypes: {
		size: {
			control: "select",
			options: ["default", "sm"],
		},
		disabled: { control: "boolean" },
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
	args: { defaultChecked: true },
};

export const Small: Story = {
	args: { size: "sm" },
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const DisabledChecked: Story = {
	args: { disabled: true, defaultChecked: true },
};

export const WithLabel: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Switch id="airplane" />
			<Label htmlFor="airplane">Airplane Mode</Label>
		</div>
	),
};
