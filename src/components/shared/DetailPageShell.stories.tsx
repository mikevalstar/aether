import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarClock, Workflow, Zap } from "lucide-react";
import { DetailPageShell } from "./DetailPageShell";
import { RunHistoryTable, type RunItem } from "./RunHistoryTable";

const meta = {
  title: "Components/DetailPageShell",
  tags: ["autodocs"],
  component: DetailPageShell,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DetailPageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleRuns: RunItem[] = [
  {
    id: "run-1",
    type: "task",
    model: "claude-haiku-4-5",
    totalInputTokens: 1240,
    totalOutputTokens: 380,
    totalEstimatedCostUsd: 0.0042,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    messagesJson: "[]",
    systemPromptJson: null,
    availableToolsJson: null,
  },
  {
    id: "run-2",
    type: "task",
    model: "claude-sonnet-4-6",
    totalInputTokens: 8200,
    totalOutputTokens: 1420,
    totalEstimatedCostUsd: 0.0341,
    aggregateInputTokens: 12_400,
    aggregateOutputTokens: 2_100,
    aggregateEstimatedCostUsd: 0.0612,
    subAgentCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    messagesJson: "[]",
    systemPromptJson: null,
    availableToolsJson: null,
  },
];

const noopAsync = async () => undefined;

export const Task: Story = {
  args: {
    icon: CalendarClock,
    label: "Task History",
    title: "Daily morning brief",
    backTo: "/tasks",
    backLabel: "Back to tasks",
    externalLink: { kind: "external", href: "#", title: "Open in Obsidian" },
    children: <RunHistoryTable runs={sampleRuns} onDelete={noopAsync} onConvertToChat={noopAsync} emptyLabel="task" />,
  },
};

export const Workflow_: Story = {
  name: "Workflow",
  args: {
    icon: Workflow,
    label: "Workflow",
    title: "Summarize inbox",
    backTo: "/workflows",
    backLabel: "Back to workflows",
    externalLink: { kind: "external", href: "#", title: "View in Obsidian" },
    children: (
      <div className="space-y-8">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-sm text-[var(--ink-soft)]">Workflow form would render here.</p>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">Run History</h2>
          <RunHistoryTable runs={sampleRuns} onDelete={noopAsync} onConvertToChat={noopAsync} emptyLabel="workflow" />
        </div>
      </div>
    ),
  },
};

export const Trigger: Story = {
  args: {
    icon: Zap,
    label: "Trigger History",
    title: "Inbound webhook handler",
    backTo: "/triggers",
    backLabel: "Back to triggers",
    externalLink: { kind: "external", href: "#", title: "Open in Obsidian" },
    children: <RunHistoryTable runs={[]} onDelete={noopAsync} onConvertToChat={noopAsync} emptyLabel="trigger" />,
  },
};

export const WithoutExternalLink: Story = {
  args: {
    icon: CalendarClock,
    label: "Task History",
    title: "Untitled task",
    backTo: "/tasks",
    backLabel: "Back to tasks",
    children: <RunHistoryTable runs={sampleRuns} onDelete={noopAsync} onConvertToChat={noopAsync} emptyLabel="task" />,
  },
};
