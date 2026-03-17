import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ObsidianTreeNode, ObsidianViewerData } from "#/lib/obsidian";
import { ObsidianViewer } from "./ObsidianViewer";

const sampleTree: ObsidianTreeNode[] = [
	{
		type: "folder",
		name: "Projects",
		path: "Projects",
		isAiConfig: false,
		isAiMemory: false,
		children: [
			{ type: "file", name: "aether.md", title: "Aether", routePath: "Projects/aether", relativePath: "Projects/aether.md" },
		],
	},
	{ type: "file", name: "index.md", title: "Home", routePath: "index", relativePath: "index.md" },
];

const viewerDataWithDoc: ObsidianViewerData = {
	tree: sampleTree,
	aiConfigPath: null,
	aiMemoryPath: null,
	requestedPath: "Projects/aether",
	configured: true,
	document: {
		title: "Aether Project",
		body: "# Aether\n\nA personal dashboard project built with **TanStack Start**.\n\n## Features\n\n- AI chat interface\n- Obsidian vault browser\n- Task scheduling\n\n## Getting Started\n\n```bash\npnpm install\npnpm dev\n```\n\nVisit [localhost:3000](http://localhost:3000) to see the app.",
		rawContent: "---\ntitle: Aether Project\nstatus: active\n---\n\n# Aether\n\nA personal dashboard project.",
		routePath: "Projects/aether",
		relativePath: "Projects/aether.md",
		frontmatter: { status: "active", tags: ["project", "dashboard"] },
	},
};

const viewerDataIndex: ObsidianViewerData = {
	tree: sampleTree,
	aiConfigPath: null,
	aiMemoryPath: null,
	requestedPath: "",
	configured: true,
	document: null,
};

const viewerDataMissing: ObsidianViewerData = {
	tree: sampleTree,
	aiConfigPath: null,
	aiMemoryPath: null,
	requestedPath: "deleted-file",
	configured: true,
	document: null,
};

const viewerDataNotConfigured: ObsidianViewerData = {
	tree: [],
	aiConfigPath: null,
	aiMemoryPath: null,
	requestedPath: "",
	configured: false,
	document: null,
};

const meta = {
	title: "Obsidian/Viewer",
	component: ObsidianViewer,
} satisfies Meta<typeof ObsidianViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDocument: Story = {
	args: {
		data: viewerDataWithDoc,
	},
};

export const WelcomeIndex: Story = {
	args: {
		data: viewerDataIndex,
	},
};

export const MissingDocument: Story = {
	args: {
		data: viewerDataMissing,
	},
};

export const NotConfigured: Story = {
	args: {
		data: viewerDataNotConfigured,
	},
};
