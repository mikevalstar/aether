import type { Meta, StoryObj } from "@storybook/react-vite";
import { NewFileDialog } from "./NewFileDialog";

const noop = () => {};

const meta = {
	title: "Obsidian/New File Dialog",
	component: NewFileDialog,
} satisfies Meta<typeof NewFileDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
	args: {
		open: true,
		onOpenChange: noop,
	},
};

export const Closed: Story = {
	args: {
		open: false,
		onOpenChange: noop,
	},
};
