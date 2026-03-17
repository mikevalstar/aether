import type { Meta, StoryObj } from "@storybook/react-vite";
import { MissingDocument } from "./MissingDocument";

const meta = {
	title: "Features/Requirements/Missing Document",
	tags: ["autodocs"],
	component: MissingDocument,
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof MissingDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPath: Story = {
	args: {
		requestedPath: "integrations/obsidian",
	},
};

export const EmptyPath: Story = {
	args: {
		requestedPath: "",
	},
};
