import type { Meta, StoryObj } from "@storybook/react-vite";
import { RunHistoryTable, type RunItem } from "./RunHistoryTable";

const meta = {
  title: "Components/RunHistoryTable",
  tags: ["autodocs"],
  component: RunHistoryTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RunHistoryTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessages = JSON.stringify([
  { role: "user", content: "Summarize my open PRs." },
  {
    role: "assistant",
    content: "You have 3 open PRs: 2 awaiting review, 1 with merge conflicts.",
  },
]);

const runs: RunItem[] = [
  {
    id: "run_01",
    type: "task",
    model: "claude-haiku-4-5",
    totalInputTokens: 1240,
    totalOutputTokens: 320,
    totalEstimatedCostUsd: 0.0042,
    aggregateInputTokens: 1240,
    aggregateOutputTokens: 320,
    aggregateEstimatedCostUsd: 0.0042,
    subAgentCount: 0,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    messagesJson: sampleMessages,
    systemPromptJson: null,
    availableToolsJson: null,
  },
  {
    id: "run_02",
    type: "task",
    model: "claude-sonnet-4-6",
    totalInputTokens: 9810,
    totalOutputTokens: 2180,
    totalEstimatedCostUsd: 0.471,
    aggregateInputTokens: 14210,
    aggregateOutputTokens: 3450,
    aggregateEstimatedCostUsd: 0.781,
    subAgentCount: 2,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    messagesJson: sampleMessages,
    systemPromptJson: null,
    availableToolsJson: null,
  },
];

const noop = async () => ({}) as unknown;

export const Default: Story = {
  args: {
    runs,
    onDelete: noop,
    onConvertToChat: noop,
    emptyLabel: "task",
  },
};

export const Empty: Story = {
  args: {
    runs: [],
    onDelete: noop,
    onConvertToChat: noop,
    emptyLabel: "task",
  },
};
