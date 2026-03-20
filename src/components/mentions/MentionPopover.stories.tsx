import type { Meta, StoryObj } from "@storybook/react-vite";
import type { MentionState } from "#/hooks/useMentionAutocomplete";
import type { ObsidianMentionResult } from "#/lib/obsidian.functions";
import { MentionPopover } from "./MentionPopover";

const mockResults: ObsidianMentionResult[] = [
  { title: "Daily Note 2026-03-20", relativePath: "Daily/2026-03-20.md", folder: "Daily" },
  { title: "Project Aether", relativePath: "Projects/Project Aether.md", folder: "Projects" },
  { title: "Meeting Notes", relativePath: "Meeting Notes.md", folder: "" },
  { title: "Recipe Collection", relativePath: "Life/Recipe Collection.md", folder: "Life" },
  { title: "Reading List", relativePath: "Reading List.md", folder: "" },
];

const meta: Meta<typeof MentionPopover> = {
  title: "Mentions/MentionPopover",
  component: MentionPopover,
  decorators: [
    (Story) => (
      <div className="relative mt-64 w-96">
        <Story />
        <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">@project...</div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MentionPopover>;

const baseState: MentionState = {
  isOpen: true,
  results: mockResults,
  selectedIndex: 0,
};

export const Default: Story = {
  args: {
    state: baseState,
    onSelect: (result) => console.log("Selected:", result.title),
  },
};

export const WithSelectedItem: Story = {
  args: {
    state: { ...baseState, selectedIndex: 2 },
    onSelect: (result) => console.log("Selected:", result.title),
  },
};

export const SingleResult: Story = {
  args: {
    state: {
      ...baseState,
      results: mockResults.slice(0, 1),
      selectedIndex: 0,
    },
    onSelect: (result) => console.log("Selected:", result.title),
  },
};

export const Closed: Story = {
  args: {
    state: { isOpen: false, results: [], selectedIndex: 0 },
    onSelect: () => {},
  },
};

export const EmptyResults: Story = {
  args: {
    state: { isOpen: true, results: [], selectedIndex: 0 },
    onSelect: () => {},
  },
};
