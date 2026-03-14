import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	SelectGroup,
	SelectLabel,
	SelectSeparator,
} from "./select";
import { Label } from "./label";

const meta = {
	title: "UI/Select",
	component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="cherry">Cherry</SelectItem>
				<SelectItem value="grape">Grape</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithLabel: Story = {
	render: () => (
		<div className="grid w-full max-w-sm gap-1.5">
			<Label>Model</Label>
			<Select defaultValue="haiku">
				<SelectTrigger className="w-[200px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="haiku">Claude Haiku 4.5</SelectItem>
					<SelectItem value="sonnet">Claude Sonnet 4.6</SelectItem>
					<SelectItem value="opus">Claude Opus 4.6</SelectItem>
				</SelectContent>
			</Select>
		</div>
	),
};

export const WithGroups: Story = {
	render: () => (
		<Select>
			<SelectTrigger className="w-[220px]">
				<SelectValue placeholder="Select a timezone" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>North America</SelectLabel>
					<SelectItem value="est">Eastern (EST)</SelectItem>
					<SelectItem value="cst">Central (CST)</SelectItem>
					<SelectItem value="pst">Pacific (PST)</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Europe</SelectLabel>
					<SelectItem value="gmt">GMT</SelectItem>
					<SelectItem value="cet">Central European (CET)</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	),
};

export const Small: Story = {
	render: () => (
		<Select>
			<SelectTrigger size="sm" className="w-[150px]">
				<SelectValue placeholder="Size: sm" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="a">Option A</SelectItem>
				<SelectItem value="b">Option B</SelectItem>
			</SelectContent>
		</Select>
	),
};
