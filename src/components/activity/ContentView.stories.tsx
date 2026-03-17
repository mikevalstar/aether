import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContentView } from "./ContentView";

const meta = {
	title: "Features/Activity/Content View",
	tags: ["autodocs"],
	component: ContentView,
	decorators: [
		(Story) => (
			<div className="max-w-3xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ContentView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MarkdownFile: Story = {
	args: {
		content: `# Daily Notes

## Tasks
- [ ] Review pull requests
- [x] Deploy staging environment
- [ ] Write documentation

## Notes
Some important observations from today's standup meeting.

### Links
- [Project board](https://example.com)
- [Docs](https://docs.example.com)`,
	},
};

export const CodeFile: Story = {
	args: {
		content: `import { prisma } from "#/db";

export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return users;
}`,
	},
};

export const EmptyContent: Story = {
	args: {
		content: "",
	},
};

export const SingleLine: Story = {
	args: {
		content: "Hello, world!",
	},
};
