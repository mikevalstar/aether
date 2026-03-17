import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Slider } from "./slider";

const meta = {
	title: "Design System/Forms/Slider",
	tags: ["autodocs"],
	component: Slider,
	argTypes: {
		disabled: { control: "boolean" },
	},
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { defaultValue: [50], max: 100, step: 1, className: "w-60" },
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-60 gap-2">
			<Label>Volume</Label>
			<Slider defaultValue={[75]} max={100} step={1} />
		</div>
	),
};

export const Range: Story = {
	args: {
		defaultValue: [25, 75],
		max: 100,
		step: 1,
		className: "w-60",
	},
};

export const Disabled: Story = {
	args: {
		defaultValue: [50],
		max: 100,
		disabled: true,
		className: "w-60",
	},
};
