import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentHeader } from "./DocumentHeader";

const meta = {
	title: "Requirements/Document Header",
	component: DocumentHeader,
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof DocumentHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullMetadata: Story = {
	args: {
		document: {
			title: "AI Chat Interface",
			body: "",
			routePath: "chat",
			relativePath: "chat.md",
			status: "in-progress",
			owner: "Mike Valstar",
			lastUpdated: "2026-03-10",
			canonicalFile: "docs/requirements/chat.md",
		},
	},
};

export const DoneStatus: Story = {
	args: {
		document: {
			title: "Requirements Viewer",
			body: "",
			routePath: "requirements-viewer",
			relativePath: "requirements-viewer.md",
			status: "done",
			owner: "Mike Valstar",
			lastUpdated: "2026-03-01",
		},
	},
};

export const TodoStatus: Story = {
	args: {
		document: {
			title: "Obsidian Integration",
			body: "",
			routePath: "obsidian",
			relativePath: "obsidian.md",
			status: "todo",
		},
	},
};

export const MinimalMetadata: Story = {
	args: {
		document: {
			title: "Feature Index",
			body: "",
			routePath: "",
			relativePath: "index.md",
		},
	},
};

export const LongTitle: Story = {
	args: {
		document: {
			title:
				"Authentication, Authorization, and Role-Based Access Control System",
			body: "",
			routePath: "auth",
			relativePath: "auth.md",
			status: "in-progress",
			owner: "Mike Valstar",
			lastUpdated: "2026-03-12",
			canonicalFile: "docs/requirements/auth.md",
		},
	},
};
