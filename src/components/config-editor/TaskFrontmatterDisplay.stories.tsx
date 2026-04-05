import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { TaskFrontmatterDisplay } from "./TaskFrontmatterDisplay";

const baseDocument: ObsidianDocument = {
  title: "Daily Summary",
  body: "Summarize the day's activities and highlight anything important.",
  rawContent:
    "---\ntitle: Daily Summary\ncron: '0 9 * * *'\nmodel: claude-haiku-4-5\neffort: low\nenabled: true\n---\nSummarize the day's activities.",
  routePath: "aether-config/tasks/daily-summary",
  relativePath: "aether-config/tasks/daily-summary.md",
  frontmatter: {
    title: "Daily Summary",
    cron: "0 9 * * *",
    model: "claude-haiku-4-5",
    effort: "low",
    enabled: true,
    notification: "notify",
    notificationLevel: "info",
    notifyUsers: ["all"],
    pushMessage: false,
  },
};

const fullDocument: ObsidianDocument = {
  ...baseDocument,
  title: "Weekly Review",
  frontmatter: {
    title: "Weekly Review",
    cron: "0 18 * * 5",
    model: "claude-sonnet-4-6",
    effort: "high",
    enabled: true,
    timezone: "America/Toronto",
    endDate: "2026-12-31",
    maxTokens: 8000,
    notification: "notify",
    notificationLevel: "warning",
    notifyUsers: ["all"],
    pushMessage: true,
  },
};

const disabledDocument: ObsidianDocument = {
  ...baseDocument,
  title: "Paused Task",
  frontmatter: {
    ...baseDocument.frontmatter,
    enabled: false,
    notification: "silent",
  },
};

const meta = {
  title: "Features/Config Editor/Task Frontmatter Display",
  tags: ["autodocs"],
  component: TaskFrontmatterDisplay,
  decorators: [
    (Story) => (
      <div className="max-w-3xl surface-card overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskFrontmatterDisplay>;

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

export const Disabled: Story = {
  args: {
    document: disabledDocument,
    onRefresh: fn(),
  },
};
