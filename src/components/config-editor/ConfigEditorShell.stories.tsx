import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "@storybook/test";
import { CalendarClock } from "lucide-react";
import type { ObsidianDocument } from "#/lib/obsidian/obsidian";
import { ConfigEditorShell } from "./ConfigEditorShell";
import { TaskFrontmatterDisplay } from "./TaskFrontmatterDisplay";
import type { ConfigEditorData, ScopedTreeNode } from "./types";

const sampleTree: ScopedTreeNode[] = [
  {
    type: "file",
    name: "daily-summary.md",
    title: "Daily Summary",
    routePath: "aether-config/tasks/daily-summary",
    relativePath: "aether-config/tasks/daily-summary.md",
  },
  {
    type: "file",
    name: "weekly-review.md",
    title: "Weekly Review",
    routePath: "aether-config/tasks/weekly-review",
    relativePath: "aether-config/tasks/weekly-review.md",
  },
  {
    type: "file",
    name: "inbox-digest.md",
    title: "Inbox Digest",
    routePath: "aether-config/tasks/inbox-digest",
    relativePath: "aether-config/tasks/inbox-digest.md",
  },
];

const sampleDocument: ObsidianDocument = {
  title: "Daily Summary",
  body: "Summarize the day's activities and highlight anything important.\n\n## Instructions\n\n- Check calendar events\n- Review completed board items\n- Note any pending notifications\n- Provide a brief weather outlook",
  rawContent:
    "---\ntitle: Daily Summary\ncron: '0 9 * * *'\nmodel: claude-haiku-4-5\neffort: low\nenabled: true\nnotification: notify\nnotificationLevel: info\nnotifyUsers:\n  - all\npushMessage: false\n---\n\nSummarize the day's activities and highlight anything important.\n\n## Instructions\n\n- Check calendar events\n- Review completed board items\n- Note any pending notifications\n- Provide a brief weather outlook\n",
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

const withDocumentData: ConfigEditorData = {
  tree: sampleTree,
  document: sampleDocument,
  requestedFilename: "daily-summary.md",
  configured: true,
};

const emptyData: ConfigEditorData = {
  tree: sampleTree,
  document: null,
  requestedFilename: "",
  configured: true,
};

const notConfiguredData: ConfigEditorData = {
  tree: [],
  document: null,
  requestedFilename: "",
  configured: false,
};

const meta = {
  title: "Features/Config Editor/Editor Shell",
  tags: ["autodocs"],
  component: ConfigEditorShell,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ConfigEditorShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDocument: Story = {
  args: {
    data: withDocumentData,
    navLabel: "Tasks",
    navIcon: CalendarClock,
    basePath: "/tasks/editor",
    renderFrontmatter: (doc: ObsidianDocument, onRefresh: () => void) => (
      <TaskFrontmatterDisplay document={doc} onRefresh={onRefresh} />
    ),
    onSaved: fn(),
  },
};

export const NoFileSelected: Story = {
  args: {
    data: emptyData,
    navLabel: "Tasks",
    navIcon: CalendarClock,
    basePath: "/tasks/editor",
    onSaved: fn(),
  },
};

export const NotConfigured: Story = {
  args: {
    data: notConfiguredData,
    navLabel: "Tasks",
    navIcon: CalendarClock,
    basePath: "/tasks/editor",
    onSaved: fn(),
  },
};
