import type { Meta, StoryObj } from "@storybook/react-vite";
import { DiffView } from "./DiffView";

const meta = {
  title: "Features/Activity/Diff View",
  tags: ["autodocs"],
  component: DiffView,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ModifiedFile: Story = {
  args: {
    filePath: "notes/daily/2026-03-15.md",
    original: `# Daily Notes

## Tasks
- [ ] Review pull requests
- [ ] Deploy staging environment

## Notes
Some observations.`,
    modified: `# Daily Notes

## Tasks
- [x] Review pull requests
- [ ] Deploy staging environment
- [ ] Write documentation

## Notes
Some observations from the standup meeting.

## Links
- [Project board](https://example.com)`,
  },
};

export const NewFile: Story = {
  args: {
    filePath: "notes/new-note.md",
    original: "",
    modified: `# New Note

This is a brand new file created by the AI assistant.

## Contents
- Item one
- Item two
- Item three`,
  },
};

export const SmallChange: Story = {
  args: {
    filePath: "config.json",
    original: `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project"
}`,
    modified: `{
  "name": "my-project",
  "version": "1.1.0",
  "description": "A sample project with updates"
}`,
  },
};

export const LargeCodeDiff: Story = {
  args: {
    filePath: "src/lib/utils.ts",
    original: `export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}`,
    modified: `import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function formatDate(date: Date): string {
  return dayjs(date).format("MMM D, YYYY");
}

export function formatRelativeDate(date: Date): string {
  return dayjs(date).fromNow();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\\s+/g, "-");
}`,
  },
};
