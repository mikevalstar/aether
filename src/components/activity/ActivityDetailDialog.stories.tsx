import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ActivityDetail } from "#/lib/activity.functions";
import { ActivityDetailDialog } from "./ActivityDetailDialog";

const noop = () => {};

const baseFileChangeDetail = {
	id: "fc-1",
	filePath: "notes/daily/2026-03-15.md",
	originalContent: `# Daily Notes

## Tasks
- [ ] Review pull requests
- [ ] Deploy staging

## Notes
Some observations.`,
	newContent: `# Daily Notes

## Tasks
- [x] Review pull requests
- [ ] Deploy staging
- [ ] Write documentation

## Notes
Some observations from standup.`,
	changeSource: "ai",
	toolName: "obsidian-edit",
} satisfies NonNullable<ActivityDetail["fileChangeDetail"]>;

const meta = {
	title: "Activity/Activity Detail Dialog",
	component: ActivityDetailDialog,
	args: {
		onClose: noop,
		onRevert: noop,
		reverting: false,
		loading: false,
	},
} satisfies Meta<typeof ActivityDetailDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseDetail: ActivityDetail = {
	id: "detail-1",
	type: "file_change",
	summary: "Updated daily notes with task completions",
	metadata: null,
	createdAt: new Date().toISOString(),
	fileChangeDetail: baseFileChangeDetail,
	currentFileContent: `# Daily Notes

## Tasks
- [x] Review pull requests
- [ ] Deploy staging
- [ ] Write documentation

## Notes
Some observations from standup.`,
	fileExists: true,
};

export const CurrentVersion: Story = {
	args: {
		detail: baseDetail,
	},
};

export const ModifiedSince: Story = {
	args: {
		detail: {
			...baseDetail,
			currentFileContent: `# Daily Notes — Modified

## Tasks
- [x] Review pull requests
- [x] Deploy staging
- [ ] Write documentation

## Notes
Updated after the detail was recorded.`,
		},
	},
};

export const FileDeleted: Story = {
	args: {
		detail: {
			...baseDetail,
			fileExists: false,
			currentFileContent: null,
		},
	},
};

export const NewFile: Story = {
	args: {
		detail: {
			...baseDetail,
			summary: "Created new meeting template",
			fileChangeDetail: {
				...baseFileChangeDetail,
				filePath: "templates/meeting.md",
				originalContent: null,
				newContent: `# Meeting: {{title}}

## Attendees
-

## Agenda
1.

## Action Items
- [ ]`,
			},
		},
	},
};

export const ManualSource: Story = {
	args: {
		detail: {
			...baseDetail,
			fileChangeDetail: {
				...baseFileChangeDetail,
				changeSource: "manual",
				toolName: null,
			},
		},
	},
};

export const Loading: Story = {
	args: {
		detail: null,
		loading: true,
	},
};

export const Reverting: Story = {
	args: {
		detail: baseDetail,
		reverting: true,
	},
};
