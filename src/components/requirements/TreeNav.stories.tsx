import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RequirementTreeNode } from "#/lib/requirements";
import { TreeNav } from "./TreeNav";

const sampleTree: RequirementTreeNode[] = [
  {
    type: "file",
    name: "index.md",
    title: "Feature Index",
    routePath: "",
    relativePath: "index.md",
  },
  {
    type: "file",
    name: "auth.md",
    title: "Authentication",
    routePath: "auth",
    relativePath: "auth.md",
    status: "in-progress",
  },
  {
    type: "file",
    name: "chat.md",
    title: "AI Chat Interface",
    routePath: "chat",
    relativePath: "chat.md",
    status: "in-progress",
  },
  {
    type: "file",
    name: "requirements-viewer.md",
    title: "Requirements Viewer",
    routePath: "requirements-viewer",
    relativePath: "requirements-viewer.md",
    status: "done",
  },
  {
    type: "file",
    name: "usage.md",
    title: "Usage Analytics",
    routePath: "usage",
    relativePath: "usage.md",
    status: "in-progress",
  },
];

const nestedTree: RequirementTreeNode[] = [
  {
    type: "file",
    name: "index.md",
    title: "Feature Index",
    routePath: "",
    relativePath: "index.md",
  },
  {
    type: "folder",
    name: "core",
    path: "core",
    children: [
      {
        type: "file",
        name: "auth.md",
        title: "Authentication",
        routePath: "core/auth",
        relativePath: "core/auth.md",
        status: "done",
      },
      {
        type: "file",
        name: "chat.md",
        title: "AI Chat",
        routePath: "core/chat",
        relativePath: "core/chat.md",
        status: "in-progress",
      },
    ],
  },
  {
    type: "folder",
    name: "integrations",
    path: "integrations",
    children: [
      {
        type: "file",
        name: "obsidian.md",
        title: "Obsidian",
        routePath: "integrations/obsidian",
        relativePath: "integrations/obsidian.md",
        status: "todo",
      },
    ],
  },
];

const meta = {
  title: "Features/Requirements/Tree Nav",
  tags: ["autodocs"],
  component: TreeNav,
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TreeNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    nodes: sampleTree,
    currentRoutePath: "",
  },
};

export const ActiveItem: Story = {
  args: {
    nodes: sampleTree,
    currentRoutePath: "chat",
  },
};

export const WithFolders: Story = {
  args: {
    nodes: nestedTree,
    currentRoutePath: "core/chat",
  },
};

export const Empty: Story = {
  args: {
    nodes: [],
    currentRoutePath: "",
  },
};
