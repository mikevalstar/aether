import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ObsidianTreeNode } from "#/lib/obsidian/obsidian";
import { ObsidianWelcome } from "./ObsidianWelcome";

const sampleTree: ObsidianTreeNode[] = [
  {
    type: "folder",
    name: "Projects",
    path: "Projects",
    isAiConfig: false,
    isAiMemory: false,
    children: [
      { type: "file", name: "aether.md", title: "Aether", routePath: "Projects/aether", relativePath: "Projects/aether.md" },
      {
        type: "file",
        name: "blog.md",
        title: "Blog Redesign",
        routePath: "Projects/blog",
        relativePath: "Projects/blog.md",
      },
    ],
  },
  {
    type: "folder",
    name: "Notes",
    path: "Notes",
    isAiConfig: false,
    isAiMemory: false,
    children: [{ type: "file", name: "daily.md", title: "Daily", routePath: "Notes/daily", relativePath: "Notes/daily.md" }],
  },
  { type: "file", name: "index.md", title: "Index", routePath: "index", relativePath: "index.md" },
];

const meta = {
  title: "Features/Obsidian/Welcome",
  tags: ["autodocs"],
  component: ObsidianWelcome,
  decorators: [
    (Story) => (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ObsidianWelcome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tree: sampleTree,
  },
};

export const Empty: Story = {
  args: {
    tree: [],
  },
};

export const SingleFile: Story = {
  args: {
    tree: [{ type: "file", name: "readme.md", title: "Readme", routePath: "readme", relativePath: "readme.md" }],
  },
};
