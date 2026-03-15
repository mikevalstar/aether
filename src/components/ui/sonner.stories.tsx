import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Toaster, toast } from "./sonner";

const meta = {
	title: "Design System/Feedback/Toast",
	component: Toaster,
	decorators: [
		(Story) => (
			<div className="min-h-[400px]">
				<Story />
				<Toaster />
			</div>
		),
	],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTypes: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="flex flex-wrap gap-3">
				<Button onClick={() => toast.success("File saved")}>
					Success (8s)
				</Button>
				<Button
					variant="destructive"
					onClick={() =>
						toast.error("Save failed", {
							description: "Could not write to disk",
						})
					}
				>
					Error (persistent)
				</Button>
				<Button
					variant="outline"
					onClick={() => toast.warning("Unsaved changes")}
				>
					Warning (15s)
				</Button>
				<Button
					variant="secondary"
					onClick={() =>
						toast.info("Tip: Press Cmd+S to save", {
							description: "Keyboard shortcuts speed up your workflow",
						})
					}
				>
					Info (8s)
				</Button>
				<Button variant="ghost" onClick={() => toast.loading("Uploading...")}>
					Loading
				</Button>
			</div>
			<p className="text-xs text-[var(--ink-soft)]">
				Errors stay until dismissed. Warnings last 15s. Everything else
				auto-dismisses after 8s. All toasts have a close button.
			</p>
		</div>
	),
};

export const Success: Story = {
	render: () => (
		<Button onClick={() => toast.success("Password updated")}>
			Show success toast
		</Button>
	),
};

export const ErrorWithDescription: Story = {
	render: () => (
		<Button
			variant="destructive"
			onClick={() =>
				toast.error("Revert failed", {
					description: "Could not revert the change",
				})
			}
		>
			Show error toast
		</Button>
	),
};

export const WithAction: Story = {
	render: () => (
		<Button
			variant="outline"
			onClick={() =>
				toast("Thread deleted", {
					action: {
						label: "Undo",
						onClick: () => toast.success("Restored"),
					},
				})
			}
		>
			Toast with action
		</Button>
	),
};

export const WithDescription: Story = {
	render: () => (
		<Button
			variant="secondary"
			onClick={() =>
				toast.success("User added", {
					description: "Share the email and temporary password with them.",
				})
			}
		>
			Toast with description
		</Button>
	),
};

export const PromiseToast: Story = {
	render: () => (
		<Button
			onClick={() =>
				toast.promise(
					new globalThis.Promise((resolve) => setTimeout(resolve, 2000)),
					{
						loading: "Saving...",
						success: "Saved!",
						error: "Failed to save",
					},
				)
			}
		>
			Promise toast
		</Button>
	),
};
