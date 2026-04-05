import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { TaskFrontmatterModal } from "./TaskFrontmatterModal";

const sampleDocument: ObsidianDocument = {
  title: "Daily Summary",
  body: "Summarize the day's activities.",
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
  ...sampleDocument,
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

const meta = {
  title: "Features/Config Editor/Frontmatter Modal",
  tags: ["autodocs"],
  component: TaskFrontmatterModal,
} satisfies Meta<typeof TaskFrontmatterModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScheduleTab: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    document: sampleDocument,
    initialTab: "schedule",
    onSaved: fn(),
  },
};

export const AIConfigTab: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    document: fullDocument,
    initialTab: "ai",
    onSaved: fn(),
  },
};

export const NotificationsTab: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    document: fullDocument,
    initialTab: "notifications",
    onSaved: fn(),
  },
};
