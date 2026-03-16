import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlowBg } from "./glow-bg";

const meta = {
	title: "Design System/Layout/Glow Background",
	component: GlowBg,
	decorators: [
		(Story) => (
			<div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-border bg-background">
				<Story />
				<div className="relative z-10 flex h-full items-center justify-center text-sm text-muted-foreground">
					Content sits above the glow
				</div>
			</div>
		),
	],
	argTypes: {
		color: { control: "text" },
		size: { control: "text" },
		position: { control: "text" },
	},
} satisfies Meta<typeof GlowBg>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Teal: Story = {
	args: {
		color: "var(--teal)",
		size: "size-[600px]",
		position: "-right-40 -top-40",
	},
};

export const Coral: Story = {
	args: {
		color: "var(--coral)",
		size: "size-[400px]",
		position: "-left-32 top-1/3",
	},
};

export const Combined: Story = {
	args: {
		color: "var(--teal)",
		size: "size-[600px]",
		position: "-right-40 -top-40",
	},
	render: () => (
		<div className="relative h-[400px] w-full overflow-hidden rounded-xl border border-border bg-background">
			<GlowBg color="var(--teal)" size="size-[600px]" position="-right-40 -top-40" />
			<GlowBg color="var(--coral)" size="size-[400px]" position="-left-32 top-1/3" />
			<div className="relative z-10 flex h-full items-center justify-center text-sm text-muted-foreground">
				Two glows layered together
			</div>
		</div>
	),
};
