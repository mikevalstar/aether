import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarClock } from "lucide-react";
import { ScopedTreeNav } from "./ScopedTreeNav";
import type { ScopedTreeNode } from "./types";

const sampleNodes: ScopedTreeNode[] = [
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

const meta = {
  title: "Features/Config Editor/Scoped Tree Nav",
  tags: ["autodocs"],
  component: ScopedTreeNav,
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScopedTreeNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    nodes: sampleNodes,
    currentPath: "",
    label: "Tasks",
    icon: CalendarClock,
    basePath: "/tasks/editor",
    getHref: (node) => `/tasks/editor/${node.name}`,
  },
};

export const WithActiveFile: Story = {
  args: {
    nodes: sampleNodes,
    currentPath: "aether-config/tasks/daily-summary.md",
    label: "Tasks",
    icon: CalendarClock,
    basePath: "/tasks/editor",
    getHref: (node) => `/tasks/editor/${node.name}`,
  },
};

export const Empty: Story = {
  args: {
    nodes: [],
    currentPath: "",
    label: "Tasks",
    icon: CalendarClock,
    basePath: "/tasks/editor",
    getHref: (node) => `/tasks/editor/${node.name}`,
  },
};
