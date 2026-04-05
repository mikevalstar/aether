import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { WorkflowFrontmatterDisplay } from "./WorkflowFrontmatterDisplay";

const baseDocument: ObsidianDocument = {
  title: "URL to Recipe",
  body: "Fetch the recipe at the following URL and convert it.\n\nURL: {{url}}\n\nAdditional instructions:\n{{instructions}}",
  rawContent:
    "---\ntitle: URL to Recipe\ndescription: Convert a recipe URL into a formatted recipe file\nmodel: claude-haiku-4-5\neffort: low\nfields:\n  - name: url\n    label: Recipe URL\n    type: url\n    required: true\n  - name: instructions\n    label: Additional Instructions\n    type: textarea\n    required: false\n---\nFetch the recipe at the following URL and convert it.\n\nURL: {{url}}\n\nAdditional instructions:\n{{instructions}}",
  routePath: "aether-config/workflows/url-to-recipe",
  relativePath: "aether-config/workflows/url-to-recipe.md",
  frontmatter: {
    title: "URL to Recipe",
    description: "Convert a recipe URL into a formatted recipe file",
    model: "claude-haiku-4-5",
    effort: "low",
    notification: "notify",
    notificationLevel: "info",
    notifyUsers: ["all"],
    pushMessage: false,
    fields: [
      {
        name: "url",
        label: "Recipe URL",
        type: "url",
        required: true,
        placeholder: "https://example.com/recipe/...",
      },
      {
        name: "instructions",
        label: "Additional Instructions",
        type: "textarea",
        required: false,
        placeholder: "Any modifications or notes...",
      },
    ] as unknown as string[],
  },
};

const fullDocument: ObsidianDocument = {
  ...baseDocument,
  title: "Content Generator",
  frontmatter: {
    title: "Content Generator",
    description: "Generate content based on a topic and style",
    model: "claude-sonnet-4-6",
    effort: "high",
    maxTokens: 8000,
    notification: "push",
    notificationLevel: "medium",
    notifyUsers: ["all"],
    pushMessage: true,
    fields: [
      { name: "topic", label: "Topic", type: "text", required: true },
      { name: "style", label: "Writing Style", type: "select", required: true, options: ["formal", "casual", "technical"] },
      { name: "length", label: "Target Length", type: "select", required: false, options: ["short", "medium", "long"] },
      { name: "notes", label: "Additional Notes", type: "textarea", required: false },
    ] as unknown as string[],
  },
};

const emptyFieldsDocument: ObsidianDocument = {
  ...baseDocument,
  title: "New Workflow",
  frontmatter: {
    title: "New Workflow",
    model: "claude-haiku-4-5",
    effort: "low",
    notification: "silent",
    fields: [] as string[],
  },
};

const meta = {
  title: "Features/Config Editor/Workflow Frontmatter Display",
  tags: ["autodocs"],
  component: WorkflowFrontmatterDisplay,
  decorators: [
    (Story) => (
      <div className="max-w-3xl surface-card overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowFrontmatterDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    document: baseDocument,
    onRefresh: fn(),
  },
};

export const FullConfig: Story = {
  args: {
    document: fullDocument,
    onRefresh: fn(),
  },
};

export const EmptyFields: Story = {
  args: {
    document: emptyFieldsDocument,
    onRefresh: fn(),
  },
};
