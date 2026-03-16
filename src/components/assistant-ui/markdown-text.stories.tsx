import type { Meta, StoryObj } from "@storybook/react-vite";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createMarkdownComponents } from "#/components/markdown/markdown-components";

/**
 * The chat markdown uses the "compact" variant from the shared markdown
 * components, with assistant-ui-specific overrides for code blocks.
 *
 * Note: The actual `MarkdownText` component requires assistant-ui runtime
 * context. This story demonstrates the compact chat styling using the same
 * shared components directly via react-markdown.
 */
function ChatMarkdownPreview({ content }: { content: string }) {
	const components = createMarkdownComponents("compact");
	return (
		<div className="max-w-2xl text-sm text-[var(--ink)]">
			<Markdown remarkPlugins={[remarkGfm]} components={components}>
				{content}
			</Markdown>
		</div>
	);
}

const meta = {
	title: "Components/Markdown/ChatMarkdown",
	component: ChatMarkdownPreview,
} satisfies Meta<typeof ChatMarkdownPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleResponse: Story = {
	args: {
		content: `Here's how you can do that:

1. First, install the package
2. Then configure it
3. Finally, use it in your code

Let me know if you need more help!`,
	},
};

export const WithCode: Story = {
	args: {
		content: `You can use the \`useState\` hook like this:

\`\`\`typescript
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
\`\`\`

The \`useState\` hook returns a tuple of the current value and a setter function.`,
	},
};

export const WithTable: Story = {
	args: {
		content: `Here's a comparison of the models:

| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| Haiku | Fast | Good | Low |
| Sonnet | Medium | Great | Medium |
| Opus | Slower | Best | High |

I'd recommend **Sonnet** for most use cases.`,
	},
};

export const WithBlockquote: Story = {
	args: {
		content: `From the documentation:

> The \`createServerFn\` function creates a server-side function that can be called from the client. It supports input validation and middleware.

This means you can safely call it from your components.`,
	},
};

export const MultiTurnConversation: Story = {
	args: {
		content: `Sure! Here are the steps to set up authentication:

### 1. Install Better Auth

\`\`\`bash
pnpm add better-auth
\`\`\`

### 2. Configure the auth handler

\`\`\`typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: prisma,
  plugins: [cookies()],
});
\`\`\`

### 3. Create the API route

Add a catch-all route at \`/api/auth/$\`:

\`\`\`typescript
export const Route = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
\`\`\`

That should get you up and running. The **cookies plugin** handles session management automatically.`,
	},
};

export const WithLists: Story = {
	args: {
		content: `Here's what I found:

**Completed:**
- [x] Database schema
- [x] Auth setup
- [x] Basic routing

**Remaining:**
- [ ] Chat UI polish
- [ ] Dashboard widgets
- [ ] Settings page

### Priority order:
1. Finish the chat interface
2. Add dashboard widgets
3. Build settings page`,
	},
};

export const ShortReply: Story = {
	args: {
		content: "Yes, that's correct! You can use `pnpm dev` to start the dev server on port 3000.",
	},
};
