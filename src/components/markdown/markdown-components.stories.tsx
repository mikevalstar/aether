import type { Meta, StoryObj } from "@storybook/react-vite";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createMarkdownComponents, type MarkdownVariant } from "./markdown-components";

// Wrapper component for Storybook
function MarkdownRenderer({ content, variant }: { content: string; variant: MarkdownVariant }) {
	const components = createMarkdownComponents(variant);
	return (
		<div className="max-w-3xl text-[var(--ink)]">
			<Markdown remarkPlugins={[remarkGfm]} components={components}>
				{content}
			</Markdown>
		</div>
	);
}

const meta = {
	title: "Components/Markdown/ProseMarkdown",
	component: MarkdownRenderer,
	argTypes: {
		variant: {
			control: "select",
			options: ["compact", "prose"],
		},
	},
	args: {
		variant: "prose",
	},
} satisfies Meta<typeof MarkdownRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const kitchenSink = `# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

This is a paragraph with **bold text**, *italic text*, and \`inline code\`. Here's a [link](https://example.com) too.

---

## Lists

### Unordered
- First item
- Second item with **bold**
- Third item
  - Nested item
  - Another nested

### Ordered
1. Step one
2. Step two
3. Step three

### Task list
- [x] Completed task
- [ ] Pending task
- [ ] Another pending

## Blockquote

> This is a blockquote with some meaningful content.
> It can span multiple lines.

## Table

| Feature | Status | Priority |
|---------|--------|----------|
| Auth | Done | High |
| Chat | In Progress | High |
| Dashboard | Planned | Medium |
| Settings | Planned | Low |

## Code

Inline: Use \`const x = 42\` in your code.

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) throw new Error("Failed to fetch user");
  return response.json();
}
\`\`\`

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

A code block without a language:

\`\`\`
just some plain text in a code block
\`\`\`
`;

export const Prose: Story = {
	args: {
		content: kitchenSink,
		variant: "prose",
	},
};

export const Compact: Story = {
	args: {
		content: kitchenSink,
		variant: "compact",
	},
};

export const Headings: Story = {
	args: {
		content: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`,
	},
};

export const CodeBlocks: Story = {
	args: {
		content: `## Code Examples

\`\`\`typescript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

\`\`\`python
def fibonacci(n: int) -> int:
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
\`\`\`

\`\`\`
No language specified
\`\`\`

And some \`inline code\` in a paragraph.`,
	},
};

export const Tables: Story = {
	args: {
		content: `## Data Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| POST | /api/users | Create a user |
| GET | /api/users/:id | Get user by ID |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |`,
	},
};

export const BlockquoteAndHr: Story = {
	args: {
		content: `## Quote

> The best way to predict the future is to invent it.
> — Alan Kay

---

Some text after the horizontal rule.`,
	},
};

export const LongContent: Story = {
	args: {
		content: `# Project Requirements

## Overview

This document outlines the requirements for the Aether dashboard project. The goal is to create a personal productivity tool that integrates AI chat, task management, and note-taking capabilities.

## Core Features

### 1. AI Chat Interface

The chat interface should support multi-turn conversations with Claude. Users should be able to:

- Start new conversations
- Continue existing threads
- Switch between different AI models
- View token usage and estimated costs

### 2. Task Management

A lightweight task management system that integrates with the dashboard:

1. Create, edit, and delete tasks
2. Organize tasks by project or category
3. Set priorities and due dates
4. Track completion status

### 3. Note Integration

> Future feature: Integration with Obsidian for seamless note management.

## Technical Requirements

| Requirement | Detail |
|-------------|--------|
| Framework | TanStack Start |
| Database | SQLite via Prisma |
| Auth | Better Auth |
| Styling | Tailwind + Shadcn |

### API Design

\`\`\`typescript
// Example API route structure
export const chatRouter = {
  sendMessage: createServerFn()
    .input(z.object({
      threadId: z.string(),
      message: z.string(),
      model: z.enum(["haiku", "sonnet", "opus"]),
    }))
    .handler(async ({ input }) => {
      // Stream response from Claude
    }),
};
\`\`\`

---

*Last updated: March 2026*`,
	},
};
