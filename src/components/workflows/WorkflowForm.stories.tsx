import type { Meta, StoryObj } from "@storybook/react-vite";
import { WorkflowForm } from "./WorkflowForm";

const fields = [
  {
    name: "url",
    label: "Skill URL",
    type: "url",
    required: true,
    placeholder: "https://github.com/owner/repo or https://skills.sh/...",
  },
  {
    name: "instructions",
    label: "Additional Instructions",
    type: "textarea",
    required: false,
    placeholder: "Any extra notes — what it does, why you want it, specific install command...",
  },
  {
    name: "status",
    label: "Skill Status",
    type: "select",
    required: true,
    options: ["new", "tried", "skipped"],
  },
  {
    name: "folder",
    label: "Bookmark Folder",
    type: "text",
    required: false,
    placeholder: "vault/skills/inbox",
  },
];

const meta = {
  title: "Features/Workflows/Form",
  tags: ["autodocs"],
  component: WorkflowForm,
  decorators: [
    (Story) => (
      <div className="max-w-4xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    filename: "add-ai-skill.md",
    title: "Add AI Skill",
    description: "Add a new AI skill to the AI Skills note — bookmarked by default unless already tried.",
    model: "claude-haiku-4-5",
    fields,
    fileExists: true,
    workflowId: "WF_01",
  },
};

export const SimpleForm: Story = {
  args: {
    filename: "recipe-formatter.md",
    title: "Recipe Formatter",
    description: "Convert a recipe URL into a formatted recipe file in the recipes folder.",
    model: "minimax-m2.7",
    fields: [
      {
        name: "url",
        label: "Recipe URL",
        type: "url",
        required: true,
        placeholder: "https://example.com/recipes/...",
      },
    ],
    fileExists: true,
    workflowId: "WF_02",
  },
};

export const FileRemoved: Story = {
  args: {
    filename: "removed.md",
    title: "Removed Workflow",
    description: null,
    model: "claude-haiku-4-5",
    fields,
    fileExists: false,
  },
};
