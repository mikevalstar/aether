import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarImage,
} from "./avatar";

const meta = {
	title: "UI/Avatar",
	component: Avatar,
	argTypes: {
		size: {
			control: "select",
			options: ["default", "sm", "lg"],
		},
	},
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarImage
				src="https://api.dicebear.com/9.x/avataaars/svg?seed=Aether"
				alt="User"
			/>
			<AvatarFallback>MV</AvatarFallback>
		</Avatar>
	),
};

export const FallbackOnly: Story = {
	render: (args) => (
		<Avatar {...args}>
			<AvatarFallback>MV</AvatarFallback>
		</Avatar>
	),
};

export const Small: Story = {
	args: { size: "sm" },
	render: (args) => (
		<Avatar {...args}>
			<AvatarFallback>A</AvatarFallback>
		</Avatar>
	),
};

export const Large: Story = {
	args: { size: "lg" },
	render: (args) => (
		<Avatar {...args}>
			<AvatarFallback>MV</AvatarFallback>
		</Avatar>
	),
};

export const WithBadge: Story = {
	render: () => (
		<Avatar>
			<AvatarFallback>MV</AvatarFallback>
			<AvatarBadge />
		</Avatar>
	),
};

export const Group: Story = {
	render: () => (
		<AvatarGroup>
			<Avatar>
				<AvatarFallback>A</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>B</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>C</AvatarFallback>
			</Avatar>
		</AvatarGroup>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex items-center gap-3">
			<Avatar size="sm">
				<AvatarFallback>SM</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>MD</AvatarFallback>
			</Avatar>
			<Avatar size="lg">
				<AvatarFallback>LG</AvatarFallback>
			</Avatar>
		</div>
	),
};
