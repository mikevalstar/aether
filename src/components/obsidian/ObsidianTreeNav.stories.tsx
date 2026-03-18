import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ObsidianTreeNode } from "#/lib/obsidian";
import { ObsidianTreeNav } from "./ObsidianTreeNav";

const sampleNodes: ObsidianTreeNode[] = [
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
      {
        type: "folder",
        name: "Archive",
        path: "Projects/Archive",
        isAiConfig: false,
        isAiMemory: false,
        children: [
          {
            type: "file",
            name: "old.md",
            title: "Old Project",
            routePath: "Projects/Archive/old",
            relativePath: "Projects/Archive/old.md",
          },
        ],
      },
    ],
  },
  {
    type: "folder",
    name: "Notes",
    path: "Notes",
    isAiConfig: false,
    isAiMemory: false,
    children: [
      { type: "file", name: "daily.md", title: "Daily Log", routePath: "Notes/daily", relativePath: "Notes/daily.md" },
      { type: "file", name: "ideas.md", title: "Ideas", routePath: "Notes/ideas", relativePath: "Notes/ideas.md" },
    ],
  },
  { type: "file", name: "index.md", title: "Home", routePath: "index", relativePath: "index.md" },
];

const withAiConfig: ObsidianTreeNode[] = [
  {
    type: "folder",
    name: "ai-config",
    path: "ai-config",
    isAiConfig: true,
    isAiMemory: false,
    children: [
      {
        type: "file",
        name: "system.md",
        title: "System Prompt",
        routePath: "ai-config/system",
        relativePath: "ai-config/system.md",
      },
      {
        type: "file",
        name: "tools.md",
        title: "Tools Config",
        routePath: "ai-config/tools",
        relativePath: "ai-config/tools.md",
      },
    ],
  },
  {
    type: "folder",
    name: "ai-memory",
    path: "ai-memory",
    isAiConfig: false,
    isAiMemory: true,
    children: [
      {
        type: "file",
        name: "context.md",
        title: "Context",
        routePath: "ai-memory/context",
        relativePath: "ai-memory/context.md",
      },
    ],
  },
  ...sampleNodes,
];

const meta = {
  title: "Features/Obsidian/Tree Nav",
  tags: ["autodocs"],
  component: ObsidianTreeNav,
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ObsidianTreeNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    nodes: sampleNodes,
    aiConfigPath: null,
    aiMemoryPath: null,
    currentRoutePath: "",
  },
};

export const WithActiveFile: Story = {
  args: {
    nodes: sampleNodes,
    aiConfigPath: null,
    aiMemoryPath: null,
    currentRoutePath: "Projects/aether",
  },
};

export const WithAiConfig: Story = {
  args: {
    nodes: withAiConfig,
    aiConfigPath: "ai-config",
    aiMemoryPath: "ai-memory",
    currentRoutePath: "",
  },
};

export const Empty: Story = {
  args: {
    nodes: [],
    aiConfigPath: null,
    aiMemoryPath: null,
    currentRoutePath: "",
  },
};
