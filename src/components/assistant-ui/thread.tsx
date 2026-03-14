import {
	ActionBarMorePrimitive,
	ActionBarPrimitive,
	AuiIf,
	BranchPickerPrimitive,
	ComposerPrimitive,
	ErrorPrimitive,
	MessagePrimitive,
	SuggestionPrimitive,
	ThreadPrimitive,
	type ToolCallMessagePartComponent,
	type ToolCallMessagePartProps,
	type ToolCallMessagePartStatus,
	useAuiState,
} from "@assistant-ui/react";
import {
	AlertCircleIcon,
	ArrowDownIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CopyIcon,
	DownloadIcon,
	LoaderIcon,
	MoreHorizontalIcon,
	PencilIcon,
	RefreshCwIcon,
	SquareIcon,
	WrenchIcon,
	XCircleIcon,
} from "lucide-react";
import {
	createContext,
	type FC,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import {
	ComposerAddAttachment,
	ComposerAttachments,
	UserMessageAttachments,
} from "#/components/assistant-ui/attachment";
import { MarkdownText } from "#/components/assistant-ui/markdown-text";
import { ToolActivitySummary } from "#/components/assistant-ui/tool-activity-summary";
import { TooltipIconButton } from "#/components/assistant-ui/tooltip-icon-button";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/components/ui/collapsible";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "#/components/ui/drawer";
import { cn } from "#/lib/utils";

const TOOL_ACTIVITY_PREFIX = "tool-activity:";

type ToolInspection = Pick<
	ToolCallMessagePartProps,
	"argsText" | "result" | "status" | "toolCallId" | "toolName"
>;

type ToolInspectorContextValue = {
	selectedTool: ToolInspection | null;
	setSelectedTool: (tool: ToolInspection | null) => void;
};

const ToolInspectorContext = createContext<ToolInspectorContextValue | null>(
	null,
);

export const Thread: FC = () => {
	const [selectedTool, setSelectedTool] = useState<ToolInspection | null>(null);

	return (
		<ToolInspectorContext.Provider value={{ selectedTool, setSelectedTool }}>
			<div className="flex h-full min-h-0 flex-col">
				<ThreadPrimitive.Root
					className="aui-root aui-thread-root @container flex h-full flex-col bg-background"
					style={{
						["--thread-max-width" as string]: "56rem",
						["--composer-radius" as string]: "24px",
						["--composer-padding" as string]: "10px",
					}}
				>
					<ThreadPrimitive.Viewport
						turnAnchor="bottom"
						className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4"
					>
						<AuiIf condition={(s) => s.thread.isEmpty}>
							<ThreadWelcome />
						</AuiIf>

						<ThreadPrimitive.Messages
							components={{
								UserMessage,
								EditComposer,
								AssistantMessage,
							}}
						/>

						<ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) bg-background pb-4 md:pb-6">
							<ThreadScrollToBottom />
							<Composer />
						</ThreadPrimitive.ViewportFooter>
					</ThreadPrimitive.Viewport>
				</ThreadPrimitive.Root>
				<ToolInspectorDrawer />
			</div>
		</ToolInspectorContext.Provider>
	);
};

const ThreadScrollToBottom: FC = () => {
	return (
		<ThreadPrimitive.ScrollToBottom asChild>
			<TooltipIconButton
				tooltip="Scroll to bottom"
				variant="outline"
				className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:border-border dark:bg-background dark:hover:bg-accent"
			>
				<ArrowDownIcon />
			</TooltipIconButton>
		</ThreadPrimitive.ScrollToBottom>
	);
};

const ThreadWelcome: FC = () => {
	return (
		<div className="aui-thread-welcome-root mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
			<div className="aui-thread-welcome-center flex w-full grow flex-col items-center justify-center">
				<div className="aui-thread-welcome-message flex size-full flex-col justify-center px-4">
					<h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-semibold text-2xl duration-200">
						Hello there!
					</h1>
					<p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-xl delay-75 duration-200">
						How can I help you today?
					</p>
				</div>
			</div>
			<ThreadSuggestions />
		</div>
	);
};

const ThreadSuggestions: FC = () => {
	return (
		<div className="aui-thread-welcome-suggestions grid w-full @md:grid-cols-2 gap-2 pb-4">
			<ThreadPrimitive.Suggestions
				components={{
					Suggestion: ThreadSuggestionItem,
				}}
			/>
		</div>
	);
};

const ThreadSuggestionItem: FC = () => {
	return (
		<div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 @md:nth-[n+3]:block nth-[n+3]:hidden animate-in fill-mode-both duration-200">
			<SuggestionPrimitive.Trigger send asChild>
				<Button
					variant="ghost"
					className="aui-thread-welcome-suggestion h-auto w-full @md:flex-col flex-wrap items-start justify-start gap-1 rounded-3xl border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
				>
					<SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium" />
					<SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground empty:hidden" />
				</Button>
			</SuggestionPrimitive.Trigger>
		</div>
	);
};

const Composer: FC = () => {
	return (
		<ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
			<ComposerPrimitive.AttachmentDropzone asChild>
				<div
					data-slot="composer-shell"
					className="flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-background p-(--composer-padding) transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50"
				>
					<ComposerAttachments />
					<ComposerPrimitive.Input
						placeholder="Send a message..."
						className="aui-composer-input max-h-32 min-h-10 w-full resize-none bg-transparent px-1.75 py-1 text-sm outline-none placeholder:text-muted-foreground/80"
						rows={1}
						autoFocus
						aria-label="Message input"
					/>
					<ComposerAction />
				</div>
			</ComposerPrimitive.AttachmentDropzone>
		</ComposerPrimitive.Root>
	);
};

const ComposerAction: FC = () => {
	return (
		<div className="aui-composer-action-wrapper relative flex items-center justify-between">
			<ComposerAddAttachment />
			<AuiIf condition={(s) => !s.thread.isRunning}>
				<ComposerPrimitive.Send asChild>
					<TooltipIconButton
						tooltip="Send message"
						side="bottom"
						type="button"
						variant="default"
						size="icon"
						className="aui-composer-send size-8 rounded-full"
						aria-label="Send message"
					>
						<ArrowUpIcon className="aui-composer-send-icon size-4" />
					</TooltipIconButton>
				</ComposerPrimitive.Send>
			</AuiIf>
			<AuiIf condition={(s) => s.thread.isRunning}>
				<ComposerPrimitive.Cancel asChild>
					<Button
						type="button"
						variant="default"
						size="icon"
						className="aui-composer-cancel size-8 rounded-full"
						aria-label="Stop generating"
					>
						<SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
					</Button>
				</ComposerPrimitive.Cancel>
			</AuiIf>
		</div>
	);
};

const MessageError: FC = () => {
	return (
		<MessagePrimitive.Error>
			<ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
				<ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
			</ErrorPrimitive.Root>
		</MessagePrimitive.Error>
	);
};

const AssistantMessage: FC = () => {
	return (
		<MessagePrimitive.Root
			className="aui-assistant-message-root fade-in slide-in-from-bottom-1 relative mx-auto w-full max-w-(--thread-max-width) animate-in py-3 duration-150"
			data-role="assistant"
		>
			<div className="aui-assistant-message-content wrap-break-word px-2 text-foreground leading-relaxed">
				<AssistantMessageParts />
				<MessageError />
			</div>

			<div className="aui-assistant-message-footer mt-1 ml-2 flex min-h-6 items-center">
				<BranchPicker />
				<AssistantActionBar />
			</div>
		</MessagePrimitive.Root>
	);
};

const AssistantMessageParts: FC = () => {
	return (
		<MessagePrimitive.Unstable_PartsGrouped
			groupingFunction={groupConsecutiveToolParts}
			components={{
				Text: MarkdownText,
				Group: InspectorToolActivity,
				tools: { Override: InspectorToolRow },
			}}
		/>
	);
};

const AssistantActionBar: FC = () => {
	return (
		<ActionBarPrimitive.Root
			hideWhenRunning
			autohide="not-last"
			className="aui-assistant-action-bar-root col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground"
		>
			<ActionBarPrimitive.Copy asChild>
				<TooltipIconButton tooltip="Copy">
					<AuiIf condition={(s) => s.message.isCopied}>
						<CheckIcon />
					</AuiIf>
					<AuiIf condition={(s) => !s.message.isCopied}>
						<CopyIcon />
					</AuiIf>
				</TooltipIconButton>
			</ActionBarPrimitive.Copy>
			<ActionBarPrimitive.Reload asChild>
				<TooltipIconButton tooltip="Refresh">
					<RefreshCwIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.Reload>
			<ActionBarMorePrimitive.Root>
				<ActionBarMorePrimitive.Trigger asChild>
					<TooltipIconButton
						tooltip="More"
						className="data-[state=open]:bg-accent"
					>
						<MoreHorizontalIcon />
					</TooltipIconButton>
				</ActionBarMorePrimitive.Trigger>
				<ActionBarMorePrimitive.Content
					side="bottom"
					align="start"
					className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
				>
					<ActionBarPrimitive.ExportMarkdown asChild>
						<ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
							<DownloadIcon className="size-4" />
							Export as Markdown
						</ActionBarMorePrimitive.Item>
					</ActionBarPrimitive.ExportMarkdown>
				</ActionBarMorePrimitive.Content>
			</ActionBarMorePrimitive.Root>
		</ActionBarPrimitive.Root>
	);
};

const UserMessage: FC = () => {
	return (
		<MessagePrimitive.Root
			className="aui-user-message-root fade-in slide-in-from-bottom-1 mx-auto grid w-full max-w-(--thread-max-width) animate-in auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 duration-150 [&:where(>*)]:col-start-2"
			data-role="user"
		>
			<UserMessageAttachments />

			<div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
				<div className="aui-user-message-content wrap-break-word rounded-2xl bg-muted px-4 py-2.5 text-foreground">
					<MessagePrimitive.Parts />
				</div>
				<div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
					<UserActionBar />
				</div>
			</div>

			<BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
		</MessagePrimitive.Root>
	);
};

const UserActionBar: FC = () => {
	return (
		<ActionBarPrimitive.Root
			hideWhenRunning
			autohide="not-last"
			className="aui-user-action-bar-root flex flex-col items-end"
		>
			<ActionBarPrimitive.Edit asChild>
				<TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
					<PencilIcon />
				</TooltipIconButton>
			</ActionBarPrimitive.Edit>
		</ActionBarPrimitive.Root>
	);
};

const EditComposer: FC = () => {
	return (
		<MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
			<ComposerPrimitive.Root className="aui-edit-composer-root ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
				<ComposerPrimitive.Input
					className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
					autoFocus
				/>
				<div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
					<ComposerPrimitive.Cancel asChild>
						<Button variant="ghost" size="sm">
							Cancel
						</Button>
					</ComposerPrimitive.Cancel>
					<ComposerPrimitive.Send asChild>
						<Button size="sm">Update</Button>
					</ComposerPrimitive.Send>
				</div>
			</ComposerPrimitive.Root>
		</MessagePrimitive.Root>
	);
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
	className,
	...rest
}) => {
	return (
		<BranchPickerPrimitive.Root
			hideWhenSingleBranch
			className={cn(
				"aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
				className,
			)}
			{...rest}
		>
			<BranchPickerPrimitive.Previous asChild>
				<TooltipIconButton tooltip="Previous">
					<ChevronLeftIcon />
				</TooltipIconButton>
			</BranchPickerPrimitive.Previous>
			<span className="aui-branch-picker-state font-medium">
				<BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
			</span>
			<BranchPickerPrimitive.Next asChild>
				<TooltipIconButton tooltip="Next">
					<ChevronRightIcon />
				</TooltipIconButton>
			</BranchPickerPrimitive.Next>
		</BranchPickerPrimitive.Root>
	);
};

const InspectorToolActivity: FC<{
	groupKey: string | undefined;
	indices: number[];
	children?: ReactNode;
}> = ({ groupKey, indices, children }) => {
	const parts = useToolParts(indices);
	const isToolGroup = isToolActivityGroup(groupKey) && parts.length > 0;

	if (!isToolGroup) return <>{children}</>;

	const summary = summarizeToolGroup(parts);

	return (
		<Collapsible className="my-2">
			<CollapsibleTrigger className="group/tool-activity-trigger w-full rounded-xl border border-border/60 bg-muted/20 px-3 data-[state=open]:bg-muted/35">
				<ToolActivitySummary
					total={summary.total}
					runningCount={summary.runningCount}
					errorCount={summary.errorCount}
					status={summary.statusType}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="pl-3 pb-2">
				<div className="mt-1 flex flex-col gap-1.5 border-l border-border/60 pl-3">
					{children}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
};

const InspectorToolRow: ToolCallMessagePartComponent = (tool) => {
	const inspector = useToolInspector();
	const statusMeta = getToolStatusMeta(tool.status);
	const isSelected = inspector.selectedTool?.toolCallId === tool.toolCallId;

	return (
		<button
			type="button"
			onClick={() =>
				inspector.setSelectedTool(isSelected ? null : toInspection(tool))
			}
			className={cn(
				"flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors",
				isSelected
					? "border-foreground/25 bg-accent/60"
					: "border-border/60 bg-background hover:bg-muted/40",
			)}
		>
			<ToolStatusGlyph status={statusMeta.type} />
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium text-sm text-foreground">
					{tool.toolName}
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{summarizeTool(tool)}
				</div>
			</div>
			<div className="flex items-center gap-2">
				<StatusBadge statusType={statusMeta.type} />
				<span className="hidden text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase sm:inline">
					{isSelected ? "Close" : "Inspect"}
				</span>
			</div>
		</button>
	);
};

const ToolInspectorDrawer: FC = () => {
	const { selectedTool, setSelectedTool } = useToolInspector();
	const statusMeta = getToolStatusMeta(selectedTool?.status);
	const output = selectedTool ? getOutputText(selectedTool) : "";

	return (
		<Drawer
			open={selectedTool !== null}
			direction="right"
			onOpenChange={(open) => {
				if (!open) setSelectedTool(null);
			}}
		>
			<DrawerContent className="w-full max-w-none data-[vaul-drawer-direction=right]:w-screen sm:data-[vaul-drawer-direction=right]:w-[min(94vw,56rem)] lg:data-[vaul-drawer-direction=right]:w-[min(80vw,72rem)]">
				<DrawerHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-5">
					<DrawerTitle className="flex items-center gap-3 text-lg tracking-tight">
						<span className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground">
							<WrenchIcon className="size-4" />
						</span>
						Tool inspection
					</DrawerTitle>
					<DrawerDescription>
						{selectedTool
							? "Raw tool payloads, status metadata, and the final output."
							: "Select a tool call in the transcript to inspect its args and result."}
					</DrawerDescription>
				</DrawerHeader>

				{!selectedTool ? (
					<div className="flex flex-1 items-center justify-center px-5 py-10 text-center sm:px-6">
						<div className="max-w-xs">
							<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
								<WrenchIcon className="size-5" />
							</div>
							<h3 className="mt-4 font-medium text-foreground">
								No tool selected
							</h3>
							<p className="mt-2 text-sm text-muted-foreground">
								Choose a tool call from the conversation to inspect the raw
								payload.
							</p>
						</div>
					</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						<div className="border-b border-border/70 px-4 py-4 sm:px-5">
							<div className="flex items-center gap-3">
								<ToolStatusGlyph status={statusMeta.type} />
								<div className="min-w-0 flex-1">
									<div className="truncate font-medium text-sm text-foreground">
										{selectedTool.toolName}
									</div>
									<div className="truncate text-xs text-muted-foreground">
										{summarizeInspection(selectedTool)}
									</div>
								</div>
								<StatusBadge statusType={statusMeta.type} />
							</div>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
							<div className="flex flex-col gap-4">
								<div className="grid gap-4 xl:grid-cols-2">
									<ToolPayloadCard
										title="Input"
										value={selectedTool.argsText}
									/>
									<ToolPayloadCard
										title={
											selectedTool.status?.type === "incomplete"
												? "Error"
												: "Output"
										}
										value={output}
									/>
								</div>
								<div className="rounded-2xl border border-border/70 bg-background p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<h3 className="font-medium text-sm text-foreground">
											Meta
										</h3>
									</div>
									<dl className="grid gap-3 text-sm sm:grid-cols-2">
										<div>
											<dt className="font-medium text-foreground">
												Tool call ID
											</dt>
											<dd className="mt-1 break-all font-mono text-xs text-muted-foreground">
												{selectedTool.toolCallId}
											</dd>
										</div>
										<div>
											<dt className="font-medium text-foreground">Status</dt>
											<dd className="mt-1 text-muted-foreground">
												{statusMeta.label}
											</dd>
										</div>
										<div>
											<dt className="font-medium text-foreground">Args size</dt>
											<dd className="mt-1 text-muted-foreground">
												{selectedTool.argsText.length} chars
											</dd>
										</div>
										<div>
											<dt className="font-medium text-foreground">
												Output size
											</dt>
											<dd className="mt-1 text-muted-foreground">
												{output.length} chars
											</dd>
										</div>
									</dl>
								</div>
							</div>
						</div>
					</div>
				)}
			</DrawerContent>
		</Drawer>
	);
};

function ToolPayloadCard({ title, value }: { title: string; value: string }) {
	const formatted = formatIfJson(value);

	return (
		<div className="rounded-2xl border border-border/70 bg-background p-4">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h3 className="font-medium text-sm text-foreground">{title}</h3>
				<Badge variant="outline" className="text-[11px] text-muted-foreground">
					{value.length} chars
				</Badge>
			</div>
			<pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground">
				{formatted || "No payload."}
			</pre>
		</div>
	);
}

function ToolStatusGlyph({ status }: { status: ToolStatusType }) {
	const Icon =
		status === "running"
			? LoaderIcon
			: status === "complete"
				? CheckIcon
				: status === "requires-action"
					? AlertCircleIcon
					: XCircleIcon;

	return (
		<span
			className={cn(
				"inline-flex size-7 shrink-0 items-center justify-center rounded-full border",
				status === "complete" &&
					"border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
				status === "running" &&
					"border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
				status === "requires-action" &&
					"border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
				status === "incomplete" &&
					"border-destructive/20 bg-destructive/10 text-destructive",
			)}
		>
			<Icon
				className={cn("size-3.5", status === "running" && "animate-spin")}
			/>
		</span>
	);
}

function StatusBadge({ statusType }: { statusType: ToolStatusType }) {
	const meta = getToolStatusMeta({
		type: statusType,
	} as ToolCallMessagePartStatus);

	return (
		<Badge
			variant="outline"
			className={cn(
				"shrink-0 text-[11px] font-medium",
				statusType === "complete" &&
					"border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
				(statusType === "running" || statusType === "requires-action") &&
					"border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
				statusType === "incomplete" &&
					"border-destructive/25 bg-destructive/10 text-destructive",
			)}
		>
			{meta.label}
		</Badge>
	);
}

function useToolInspector() {
	const context = useContext(ToolInspectorContext);
	if (!context) {
		throw new Error("ToolInspectorContext is not available");
	}
	return context;
}

function useToolParts(indices: number[]) {
	const parts = useAuiState((s) => s.message.parts);

	return useMemo(
		() =>
			indices
				.map((index) => parts[index])
				.filter(
					(part): part is ToolCallMessagePartProps =>
						part?.type === "tool-call",
				),
		[indices, parts],
	);
}

function groupConsecutiveToolParts(parts: readonly { type: string }[]) {
	const groups: Array<{ groupKey: string | undefined; indices: number[] }> = [];
	let toolGroupIndex = 0;

	for (let index = 0; index < parts.length; index += 1) {
		const part = parts[index];
		if (part?.type !== "tool-call") {
			groups.push({ groupKey: undefined, indices: [index] });
			continue;
		}

		const currentGroup = groups.at(-1);
		if (currentGroup?.groupKey?.startsWith(TOOL_ACTIVITY_PREFIX)) {
			currentGroup.indices.push(index);
			continue;
		}

		groups.push({
			groupKey: `${TOOL_ACTIVITY_PREFIX}${toolGroupIndex}`,
			indices: [index],
		});
		toolGroupIndex += 1;
	}

	return groups;
}

function isToolActivityGroup(groupKey: string | undefined) {
	return groupKey?.startsWith(TOOL_ACTIVITY_PREFIX) ?? false;
}

type ToolStatusType = "complete" | "incomplete" | "requires-action" | "running";

function getToolStatusMeta(status?: ToolCallMessagePartStatus) {
	if (!status || status.type === "complete") {
		return { label: "Done", type: "complete" as ToolStatusType };
	}

	if (status.type === "running") {
		return { label: "Running", type: "running" as ToolStatusType };
	}

	if (status.type === "requires-action") {
		return { label: "Needs input", type: "requires-action" as ToolStatusType };
	}

	if (status.reason === "cancelled") {
		return { label: "Cancelled", type: "incomplete" as ToolStatusType };
	}

	return { label: "Error", type: "incomplete" as ToolStatusType };
}

function summarizeToolGroup(parts: ToolCallMessagePartProps[]) {
	const runningCount = parts.filter(
		(part) => part.status?.type === "running",
	).length;
	const actionCount = parts.filter(
		(part) => part.status?.type === "requires-action",
	).length;
	const errorCount = parts.filter(
		(part) =>
			part.status?.type === "incomplete" && part.status.reason !== "cancelled",
	).length;

	const statusType: ToolStatusType =
		runningCount > 0
			? "running"
			: errorCount > 0
				? "incomplete"
				: actionCount > 0
					? "requires-action"
					: "complete";

	return {
		total: parts.length,
		runningCount,
		actionCount,
		errorCount,
		statusType,
	};
}

function summarizeTool(
	tool: Pick<ToolCallMessagePartProps, "argsText" | "result" | "status">,
) {
	const argsSummary = summarizeArgs(tool.argsText);
	const outputSummary = summarizeOutput(tool.result, tool.status);
	return `${argsSummary} • ${outputSummary}`;
}

function summarizeInspection(tool: ToolInspection) {
	return `${summarizeArgs(tool.argsText)} • ${summarizeOutput(tool.result, tool.status)}`;
}

function summarizeArgs(argsText: string) {
	try {
		const parsed = JSON.parse(argsText) as unknown;
		if (Array.isArray(parsed)) {
			return `${parsed.length} arg items`;
		}
		if (parsed && typeof parsed === "object") {
			const keys = Object.keys(parsed as Record<string, unknown>);
			if (keys.length === 0) return "No args";
			return keys.length <= 3
				? keys.join(", ")
				: `${keys.slice(0, 3).join(", ")} +${keys.length - 3}`;
		}
	} catch {
		// Fall through to plain-text summary.
	}

	return truncate(oneLine(argsText), 48) || "No args";
}

function summarizeOutput(result: unknown, status?: ToolCallMessagePartStatus) {
	if (status?.type === "running") {
		return "Waiting for result";
	}

	if (status?.type === "requires-action") {
		return "Awaiting user action";
	}

	if (status?.type === "incomplete") {
		return status.reason === "cancelled" ? "Call cancelled" : "Error returned";
	}

	if (result === undefined) {
		return "No result";
	}

	if (Array.isArray(result)) {
		return `${result.length} rows`;
	}

	if (typeof result === "string") {
		return truncate(oneLine(result), 48);
	}

	if (result && typeof result === "object") {
		return `${Object.keys(result as Record<string, unknown>).length} fields`;
	}

	return String(result);
}

function getOutputText(tool: Pick<ToolInspection, "result" | "status">) {
	if (tool.status?.type === "incomplete") {
		const error = tool.status.error;
		if (typeof error === "string") return error;
		if (error !== undefined) return JSON.stringify(error, null, 2);
		return tool.status.reason === "cancelled"
			? "Tool call was cancelled."
			: "Tool call failed without an error payload.";
	}

	if (tool.status?.type === "requires-action") {
		return "Tool call requires additional user action.";
	}

	if (tool.status?.type === "running") {
		return "Tool call is still running.";
	}

	if (tool.result === undefined) {
		return "No result payload.";
	}

	if (typeof tool.result === "string") {
		return tool.result;
	}

	return JSON.stringify(tool.result, null, 2);
}

function toInspection(tool: ToolCallMessagePartProps): ToolInspection {
	return {
		argsText: tool.argsText,
		result: tool.result,
		status: tool.status,
		toolCallId: tool.toolCallId,
		toolName: tool.toolName,
	};
}

function formatIfJson(text: string): string {
	if (!text) return text;
	const trimmed = text.trim();
	if (
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]"))
	) {
		try {
			return JSON.stringify(JSON.parse(trimmed), null, 2);
		} catch {
			return text;
		}
	}
	return text;
}

function oneLine(value: string) {
	return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}...`;
}
