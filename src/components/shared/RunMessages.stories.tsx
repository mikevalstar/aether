import type { Meta, StoryObj } from "@storybook/react-vite";
import { RunMessages } from "./RunMessages";

const meta = {
	title: "Shared/RunMessages",
	component: RunMessages,
	parameters: {
		layout: "padded",
	},
} satisfies Meta<typeof RunMessages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	args: {
		messagesJson: "[]",
	},
};

export const SimpleTextResponse: Story = {
	args: {
		messagesJson: JSON.stringify([
			{
				role: "assistant",
				content: "The task has been completed successfully. All files were updated.",
			},
		]),
	},
};

export const WithToolCalls: Story = {
	args: {
		messagesJson: JSON.stringify([
			{
				role: "assistant",
				content: [
					{ type: "text", text: "Let me look up the current configuration." },
					{
						type: "tool-call",
						toolCallId: "call_1",
						toolName: "readFile",
						input: { path: "/config/settings.json" },
					},
				],
			},
			{
				role: "tool",
				content: [
					{
						type: "tool-result",
						toolCallId: "call_1",
						toolName: "readFile",
						output: { content: '{ "debug": true, "port": 3000 }' },
					},
				],
			},
			{
				role: "assistant",
				content: "The configuration shows debug mode is enabled on port 3000.",
			},
		]),
	},
};

export const WithSystemPrompt: Story = {
	args: {
		messagesJson: JSON.stringify([
			{
				role: "assistant",
				content: "I've reviewed the task and will begin processing.",
			},
		]),
		systemPromptJson: JSON.stringify("You are a helpful assistant that manages files and configurations."),
	},
};

export const WithAvailableTools: Story = {
	args: {
		messagesJson: JSON.stringify([
			{
				role: "assistant",
				content: "Ready to assist with the available tools.",
			},
		]),
		availableToolsJson: JSON.stringify(["readFile", "writeFile", "listDirectory", "searchFiles", "executeCommand"]),
	},
};

export const FullConversation: Story = {
	args: {
		messagesJson: JSON.stringify([
			{
				role: "assistant",
				content: [
					{ type: "text", text: "I'll check the database schema first." },
					{
						type: "tool-call",
						toolCallId: "call_1",
						toolName: "readFile",
						input: { path: "prisma/schema.prisma" },
					},
				],
			},
			{
				role: "tool",
				content: [
					{
						type: "tool-result",
						toolCallId: "call_1",
						toolName: "readFile",
						output: { content: "model User { id Int @id @default(autoincrement()) name String email String @unique }" },
					},
				],
			},
			{
				role: "assistant",
				content: [
					{ type: "text", text: "Now I'll update the migration file." },
					{
						type: "tool-call",
						toolCallId: "call_2",
						toolName: "writeFile",
						input: { path: "prisma/migrations/001_add_user.sql", content: "CREATE TABLE User ..." },
					},
				],
			},
			{
				role: "tool",
				content: [
					{
						type: "tool-result",
						toolCallId: "call_2",
						toolName: "writeFile",
						output: { success: true },
					},
				],
			},
			{
				role: "assistant",
				content: "Migration file has been created. The User table schema is ready.",
			},
		]),
		systemPromptJson: JSON.stringify("You are a database migration assistant."),
		availableToolsJson: JSON.stringify(["readFile", "writeFile", "executeCommand"]),
	},
};

export const InvalidJson: Story = {
	args: {
		messagesJson: "not valid json",
	},
};
