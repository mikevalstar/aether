import type { Meta, StoryObj } from "@storybook/react-vite";
import { TaskTable } from "./TaskTable";

const now = Date.now();

const sampleItems = [
	{
		id: "task-1",
		filename: "daily-summary.md",
		title: "Daily Summary",
		cron: "0 9 * * *",
		model: "claude-haiku-4-5",
		effort: "low",
		enabled: true,
		endDate: null,
		maxTokens: null,
		timezone: "America/Toronto",
		lastRunAt: new Date(now - 3_600_000).toISOString(),
		lastRunStatus: "success",
		lastThreadId: "thread-1",
		fileExists: true,
		nextRun: new Date(now + 7_200_000).toISOString(),
		isBusy: false,
		createdAt: new Date(now - 86_400_000 * 7).toISOString(),
		updatedAt: new Date(now - 3_600_000).toISOString(),
	},
	{
		id: "task-2",
		filename: "weekly-review.md",
		title: "Weekly Review",
		cron: "0 18 * * 5",
		model: "claude-sonnet-4-6",
		effort: "medium",
		enabled: true,
		endDate: null,
		maxTokens: null,
		timezone: null,
		lastRunAt: new Date(now - 86_400_000 * 3).toISOString(),
		lastRunStatus: "error",
		lastThreadId: "thread-2",
		fileExists: true,
		nextRun: new Date(now + 86_400_000 * 2).toISOString(),
		isBusy: false,
		createdAt: new Date(now - 86_400_000 * 14).toISOString(),
		updatedAt: new Date(now - 86_400_000 * 3).toISOString(),
	},
	{
		id: "task-3",
		filename: "cleanup.md",
		title: "Cleanup Old Logs",
		cron: "0 3 * * 0",
		model: "claude-haiku-4-5",
		effort: "low",
		enabled: false,
		endDate: null,
		maxTokens: null,
		timezone: null,
		lastRunAt: null,
		lastRunStatus: null,
		lastThreadId: null,
		fileExists: true,
		nextRun: null,
		isBusy: false,
		createdAt: new Date(now - 86_400_000 * 2).toISOString(),
		updatedAt: new Date(now - 86_400_000 * 2).toISOString(),
	},
	{
		id: "task-4",
		filename: "deleted-task.md",
		title: "Deleted Task",
		cron: "*/30 * * * *",
		model: "claude-haiku-4-5",
		effort: "low",
		enabled: true,
		endDate: null,
		maxTokens: null,
		timezone: null,
		lastRunAt: new Date(now - 86_400_000).toISOString(),
		lastRunStatus: "success",
		lastThreadId: "thread-4",
		fileExists: false,
		nextRun: null,
		isBusy: false,
		createdAt: new Date(now - 86_400_000 * 10).toISOString(),
		updatedAt: new Date(now - 86_400_000).toISOString(),
	},
];

const meta = {
	title: "Features/Tasks/Task Table",
	tags: ["autodocs"],
	component: TaskTable,
	decorators: [
		(Story) => (
			<div className="max-w-5xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TaskTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		items: sampleItems,
	},
};

export const SingleTask: Story = {
	args: {
		items: [sampleItems[0]],
	},
};

export const WithBusyTask: Story = {
	args: {
		items: [{ ...sampleItems[0], isBusy: true }],
	},
};

export const Empty: Story = {
	args: {
		items: [],
	},
};
