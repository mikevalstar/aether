import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { Button } from "./button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

const meta = {
	title: "Design System/Overlays/Tooltip",
	component: Tooltip,
	decorators: [
		(Story) => (
			<TooltipProvider>
				<Story />
			</TooltipProvider>
		),
	],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>This is a tooltip</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const IconButton: Story = {
	render: () => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="outline" size="icon" aria-label="Add item">
					<Plus />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				<p>Add item</p>
			</TooltipContent>
		</Tooltip>
	),
};

export const Positions: Story = {
	render: () => (
		<div className="flex items-center gap-8 p-12">
			{(["top", "right", "bottom", "left"] as const).map((side) => (
				<Tooltip key={side}>
					<TooltipTrigger asChild>
						<Button variant="outline" size="sm">
							{side}
						</Button>
					</TooltipTrigger>
					<TooltipContent side={side}>
						<p>Tooltip on {side}</p>
					</TooltipContent>
				</Tooltip>
			))}
		</div>
	),
};
