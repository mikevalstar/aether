import type { Meta, StoryObj } from "@storybook/react-vite";
import type { WorkflowListItem } from "#/lib/workflows/workflow.functions";
import { WorkflowCard } from "./WorkflowCard";

const now = Date.now();

const baseItem: WorkflowListItem = {
  id: "wf-1",
  filename: "add-ai-skill.md",
  title: "Add AI Skill",
  description: "Add a new AI skill to the AI Skills note — bookmarked by default unless already tried.",
  model: "claude-haiku-4-5",
  effort: "low",
  maxTokens: null,
  fields: [
    { name: "url", label: "Skill URL", type: "url", required: true },
    { name: "notes", label: "Additional Instructions", type: "textarea", required: false },
    { name: "status", label: "Skill Status", type: "select", required: true, options: ["new", "tried"] },
  ],
  lastRunAt: new Date(now - 2 * 86_400_000).toISOString(),
  lastRunStatus: null,
  lastThreadId: null,
  fileExists: true,
  createdAt: new Date(now - 86_400_000 * 7).toISOString(),
  updatedAt: new Date(now - 86_400_000).toISOString(),
};

const successItem: WorkflowListItem = {
  ...baseItem,
  id: "wf-2",
  filename: "recipe-formatter.md",
  title: "Recipe Formatter",
  description: "Convert a recipe URL into a formatted recipe file in the recipes folder.",
  model: "minimax-m2.7",
  fields: [
    { name: "url", label: "Recipe URL", type: "url", required: true },
    { name: "tags", label: "Tags", type: "text", required: false },
  ],
  lastRunAt: new Date(now - 23 * 86_400_000).toISOString(),
  lastRunStatus: "success",
};

const errorItem: WorkflowListItem = {
  ...baseItem,
  id: "wf-3",
  filename: "broken.md",
  title: "Broken Workflow",
  description: "Last run errored out — check the run history for details.",
  lastRunAt: new Date(now - 86_400_000).toISOString(),
  lastRunStatus: "error",
};

const removedItem: WorkflowListItem = {
  ...baseItem,
  id: "wf-4",
  filename: "removed.md",
  title: "Removed Workflow",
  description: "The markdown file for this workflow has been removed from the vault.",
  fileExists: false,
  lastRunStatus: null,
};

const meta = {
  title: "Features/Workflows/Card",
  tags: ["autodocs"],
  component: WorkflowCard,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { item: baseItem },
};

export const WithSuccess: Story = {
  args: { item: successItem },
};

export const WithError: Story = {
  args: { item: errorItem },
};

export const FileRemoved: Story = {
  args: { item: removedItem },
};

export const Grid: Story = {
  args: { item: baseItem },
  decorators: [
    () => (
      <div className="grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <WorkflowCard item={baseItem} />
        <WorkflowCard item={successItem} />
        <WorkflowCard item={errorItem} />
        <WorkflowCard item={removedItem} />
      </div>
    ),
  ],
};
