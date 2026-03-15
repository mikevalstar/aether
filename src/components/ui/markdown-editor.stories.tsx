import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MarkdownEditor } from "./markdown-editor";

const sampleMarkdown = `# Welcome to Aether

This is a **markdown editor** with a custom toolbar, tooltips with keyboard shortcuts, and a live word count.

## Features

- Bold, italic, and ~~strikethrough~~ formatting
- Headings (H1–H3)
- [Links](https://example.com) and images
- Code blocks and \`inline code\`
- Bullet and numbered lists

> Blockquotes work too.

### Code Example

\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Try editing this content to see the word and character counts update in real time.
`;

const meta = {
	title: "Design System/Forms/Markdown Editor",
	component: MarkdownEditor,
	argTypes: {
		showStatusBar: { control: "boolean" },
	},
	parameters: {
		layout: "fullscreen",
	},
} satisfies Meta<typeof MarkdownEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledEditor(props: {
	initialValue?: string;
	showStatusBar?: boolean;
}) {
	const [value, setValue] = useState(props.initialValue ?? sampleMarkdown);
	return (
		<div className="h-[600px]">
			<MarkdownEditor
				value={value}
				onChange={setValue}
				showStatusBar={props.showStatusBar}
				className="h-full"
			/>
		</div>
	);
}

export const Default: Story = {
	render: (args) => <ControlledEditor showStatusBar={args.showStatusBar} />,
	args: {
		showStatusBar: true,
		value: sampleMarkdown,
		onChange: () => {},
	},
};

export const WithoutStatusBar: Story = {
	render: () => <ControlledEditor showStatusBar={false} />,
	args: {
		showStatusBar: false,
		value: sampleMarkdown,
		onChange: () => {},
	},
};

export const EmptyState: Story = {
	render: (args) => (
		<ControlledEditor initialValue="" showStatusBar={args.showStatusBar} />
	),
	args: {
		showStatusBar: true,
		value: "",
		onChange: () => {},
	},
};

export const LongContent: Story = {
	render: (args) => (
		<ControlledEditor
			initialValue={`${sampleMarkdown}\n${sampleMarkdown}\n${sampleMarkdown}`}
			showStatusBar={args.showStatusBar}
		/>
	),
	args: {
		showStatusBar: true,
		value: sampleMarkdown,
		onChange: () => {},
	},
};
