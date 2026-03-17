import type { Meta, StoryObj } from "@storybook/react-vite";
import dayjs from "dayjs";
import type { ActivityListItem } from "#/lib/activity.functions";
import { ActivityTable } from "./ActivityTable";

const noop = () => {};

const meta = {
	title: "Features/Activity/Activity Table",
	tags: ["autodocs"],
	component: ActivityTable,
	args: {
		onItemClick: noop,
	},
	decorators: [
		(Story) => (
			<div className="max-w-4xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ActivityTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const now = dayjs();
function minutesAgo(m: number) {
	return now.subtract(m, "minute").toISOString();
}
function hoursAgo(h: number) {
	return now.subtract(h, "hour").toISOString();
}
function daysAgo(d: number) {
	return now.subtract(d, "day").toISOString();
}

const sampleItems: ActivityListItem[] = [
	{
		id: "1",
		type: "file_change",
		summary: "Updated daily notes",
		metadata: null,
		createdAt: minutesAgo(3),
		fileChangeDetail: {
			filePath: "notes/daily/2026-03-15.md",
			changeSource: "ai",
		},
	},
	{
		id: "2",
		type: "file_change",
		summary: "Created meeting template",
		metadata: null,
		createdAt: minutesAgo(45),
		fileChangeDetail: {
			filePath: "templates/meeting.md",
			changeSource: "ai",
		},
	},
	{
		id: "3",
		type: "file_change",
		summary: "Edited project roadmap",
		metadata: null,
		createdAt: hoursAgo(2),
		fileChangeDetail: {
			filePath: "projects/roadmap.md",
			changeSource: "manual",
		},
	},
	{
		id: "4",
		type: "file_change",
		summary: "Reverted config changes",
		metadata: null,
		createdAt: daysAgo(1),
		fileChangeDetail: {
			filePath: "config/settings.json",
			changeSource: "manual",
		},
	},
	{
		id: "5",
		type: "file_change",
		summary: "Added new recipe note",
		metadata: null,
		createdAt: daysAgo(3),
		fileChangeDetail: {
			filePath: "notes/recipes/pasta.md",
			changeSource: "ai",
		},
	},
];

export const WithItems: Story = {
	args: {
		items: sampleItems,
	},
};

export const Empty: Story = {
	args: {
		items: [],
	},
};

export const SingleItem: Story = {
	args: {
		items: [sampleItems[0]],
	},
};

export const AllManual: Story = {
	args: {
		items: sampleItems.map((item) => ({
			...item,
			fileChangeDetail: item.fileChangeDetail ? { ...item.fileChangeDetail, changeSource: "manual" } : null,
		})),
	},
};

export const AllAI: Story = {
	args: {
		items: sampleItems.map((item) => ({
			...item,
			fileChangeDetail: item.fileChangeDetail ? { ...item.fileChangeDetail, changeSource: "ai" } : null,
		})),
	},
};
