import type { Meta, StoryObj } from "@storybook/react-vite";
import { TaskRunHistory } from "./TaskRunHistory";

const sampleTask = {
	filename: "daily-summary.md",
	title: "Daily Summary",
	cron: "0 9 * * *",
	model: "claude-haiku-4-5",
	effort: "low",
	enabled: true,
	timezone: "America/Toronto",
	fileExists: true,
};

const sampleRuns = [
	{
		id: "run-1",
		title: "Daily Summary",
		model: "claude-haiku-4-5" as const,
		effort: "low",
		totalInputTokens: 1250,
		totalOutputTokens: 430,
		totalEstimatedCostUsd: 0.0021,
		createdAt: new Date(Date.now() - 3_600_000).toISOString(),
		updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
		messagesJson: JSON.stringify([
			{ role: "user", content: "Generate a daily summary." },
			{ role: "assistant", content: "Here is your summary for today..." },
		]),
		systemPromptJson: null,
		availableToolsJson: null,
	},
	{
		id: "run-2",
		title: "Daily Summary",
		model: "claude-haiku-4-5" as const,
		effort: "low",
		totalInputTokens: 980,
		totalOutputTokens: 310,
		totalEstimatedCostUsd: 0.0015,
		createdAt: new Date(Date.now() - 86_400_000).toISOString(),
		updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
		messagesJson: JSON.stringify([
			{ role: "user", content: "Generate a daily summary." },
			{ role: "assistant", content: "Yesterday's summary..." },
		]),
		systemPromptJson: null,
		availableToolsJson: null,
	},
];

const meta = {
	title: "Features/Tasks/Run History",
	tags: ["autodocs"],
	component: TaskRunHistory,
	decorators: [
		(Story) => (
			<div className="max-w-4xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TaskRunHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		task: sampleTask,
		runs: sampleRuns,
	},
};

export const NoRuns: Story = {
	args: {
		task: sampleTask,
		runs: [],
	},
};

export const PausedTask: Story = {
	args: {
		task: { ...sampleTask, enabled: false },
		runs: sampleRuns,
	},
};

export const FileRemoved: Story = {
	args: {
		task: { ...sampleTask, fileExists: false },
		runs: sampleRuns,
	},
};

export const NoTimezone: Story = {
	args: {
		task: { ...sampleTask, timezone: null },
		runs: sampleRuns,
	},
};
