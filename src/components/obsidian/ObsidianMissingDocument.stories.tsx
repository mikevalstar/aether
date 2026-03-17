import type { Meta, StoryObj } from "@storybook/react-vite";
import { ObsidianMissingDocument } from "./ObsidianMissingDocument";

const meta = {
	title: "Features/Obsidian/Missing Document",
	tags: ["autodocs"],
	component: ObsidianMissingDocument,
	decorators: [
		(Story) => (
			<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ObsidianMissingDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		requestedPath: "Projects/old-project.md",
	},
};

export const EmptyPath: Story = {
	args: {
		requestedPath: "",
	},
};
