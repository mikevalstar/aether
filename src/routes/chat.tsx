import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import {
	GripVerticalIcon,
	MessageSquarePlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { z } from "zod";
import { ChatWorkspace } from "#/components/chat/ChatWorkspace";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { getSession } from "#/lib/auth.functions";
import {
	CHAT_MODELS,
	type ChatThreadSummary,
	DEFAULT_CHAT_MODEL,
} from "#/lib/chat";
import {
	createChatThread,
	deleteChatThread,
	getChatPageData,
	updateChatThreadModel,
} from "#/lib/chat.functions";
import { cn } from "#/lib/utils";

const chatSearchSchema = z.object({
	threadId: z.string().optional(),
});

const PENDING_MESSAGE_KEY = "aether:pending-chat-message";
const SIDEBAR_WIDTH_KEY = "aether:chat-sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 460;

export const Route = createFileRoute("/chat")({
	validateSearch: chatSearchSchema,
	beforeLoad: async () => {
		const session = await getSession();

		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loaderDeps: ({ search }) => ({ threadId: search.threadId }),
	loader: async ({ deps }) => {
		return await getChatPageData({ data: { threadId: deps.threadId } });
	},
	component: ChatPage,
});

function ChatPage() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
	const [pendingDeleteThread, setPendingDeleteThread] =
		useState<ChatThreadSummary | null>(null);
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const [isMutating, startTransition] = useTransition();
	const [draftModel, setDraftModel] = useState(DEFAULT_CHAT_MODEL);
	const [draftMessage, setDraftMessage] = useState("");
	const [initialMessage, setInitialMessage] = useState<string | undefined>();

	const refreshPage = useCallback(async () => {
		await router.invalidate();
	}, [router]);
	const selectedThread = data.selectedThread;

	const handleCreateThread = useCallback(
		async (model: string, firstMessage?: string) => {
			const createdThread = await createChatThread({ data: { model } });

			if (typeof window !== "undefined") {
				const key = `${PENDING_MESSAGE_KEY}:${createdThread.id}`;
				if (firstMessage?.trim()) {
					window.sessionStorage.setItem(key, firstMessage.trim());
				} else {
					window.sessionStorage.removeItem(key);
				}
			}

			setPendingThreadId(createdThread.id);
			await navigate({ search: { threadId: createdThread.id } });
			await router.invalidate();
			setPendingThreadId(null);
		},
		[navigate, router],
	);

	const handleDeleteThread = useCallback(
		async (thread: ChatThreadSummary) => {
			await deleteChatThread({ data: { threadId: thread.id } });

			const nextThread =
				selectedThread?.id === thread.id
					? data.threads.find(
							(item: ChatThreadSummary) => item.id !== thread.id,
						)
					: selectedThread;
			await navigate({
				search: nextThread ? { threadId: nextThread.id } : {},
			});
			await router.invalidate();
		},
		[data.threads, navigate, router, selectedThread],
	);

	const selectedModel = selectedThread?.model ?? DEFAULT_CHAT_MODEL;
	const isBusy = isMutating || pendingThreadId !== null;
	const emptyStateModel = selectedThread?.model ?? draftModel;
	const selectedUsageTotals = {
		inputTokens: selectedThread?.totalInputTokens ?? 0,
		outputTokens: selectedThread?.totalOutputTokens ?? 0,
		estimatedCostUsd: selectedThread?.totalEstimatedCostUsd ?? 0,
	};
	const selectedCostLabel =
		selectedUsageTotals.estimatedCostUsd > 0 &&
		selectedUsageTotals.estimatedCostUsd < 0.0001
			? "<$0.0001"
			: `$${selectedUsageTotals.estimatedCostUsd.toFixed(4)}`;

	useEffect(() => {
		if (typeof window === "undefined") return;

		const storedWidth = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
		if (!storedWidth) return;

		const parsedWidth = Number.parseInt(storedWidth, 10);
		if (Number.isNaN(parsedWidth)) return;

		setSidebarWidth(
			Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsedWidth)),
		);
	}, []);

	useEffect(() => {
		if (!search.threadId && data.selectedThreadId) {
			void navigate({
				replace: true,
				search: { threadId: data.selectedThreadId },
			});
		}
	}, [data.selectedThreadId, navigate, search.threadId]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!selectedThread?.id) {
			setInitialMessage(undefined);
			return;
		}

		const key = `${PENDING_MESSAGE_KEY}:${selectedThread.id}`;
		const pendingMessage = window.sessionStorage.getItem(key) ?? undefined;

		if (pendingMessage) {
			window.sessionStorage.removeItem(key);
		}

		setInitialMessage(pendingMessage);
	}, [selectedThread?.id]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
	}, [sidebarWidth]);

	const handleResizeStart = useCallback(() => {
		if (typeof window === "undefined") return;

		const handlePointerMove = (event: PointerEvent) => {
			const containerRect = containerRef.current?.getBoundingClientRect();
			if (!containerRect) return;

			const nextWidth = Math.round(containerRect.right - event.clientX);
			setSidebarWidth(
				Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, nextWidth)),
			);
		};

		const handlePointerUp = () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp, { once: true });
	}, []);

	function handleRequestDelete(thread: ChatThreadSummary) {
		setPendingDeleteThread(thread);
	}

	function handleConfirmDelete() {
		if (!pendingDeleteThread) return;

		startTransition(() => {
			void handleDeleteThread(pendingDeleteThread).then(() => {
				setPendingDeleteThread(null);
			});
		});
	}

	function handleStartChat() {
		const message = draftMessage.trim();
		if (!message) return;

		startTransition(() => {
			void handleCreateThread(emptyStateModel, message).then(() => {
				setDraftMessage("");
			});
		});
	}

	return (
		<main className="page-wrap flex h-[calc(100vh-8rem)] px-4 py-8">
			<div
				ref={containerRef}
				className="flex min-h-0 w-full flex-col gap-4 lg:flex-row"
			>
				<section className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] lg:flex-1">
					<div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-4 py-3">
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-[var(--ink)]">
								{selectedThread?.title ?? "New chat"}
							</p>
						</div>

						<div className="grid min-w-[240px] grid-cols-3 gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-right">
							<div>
								<p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
									Input
								</p>
								<p className="text-sm font-medium text-[var(--ink)]">
									{selectedUsageTotals.inputTokens.toLocaleString()}
								</p>
							</div>
							<div>
								<p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
									Output
								</p>
								<p className="text-sm font-medium text-[var(--ink)]">
									{selectedUsageTotals.outputTokens.toLocaleString()}
								</p>
							</div>
							<div>
								<p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
									Cost
								</p>
								<p className="text-sm font-medium text-[var(--ink)]">
									{selectedCostLabel}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Select
								value={selectedThread ? selectedModel : emptyStateModel}
								onValueChange={(value) => {
									if (!selectedThread) {
										setDraftModel(value as (typeof CHAT_MODELS)[number]["id"]);
										return;
									}

									startTransition(() => {
										void updateChatThreadModel({
											data: { threadId: selectedThread.id, model: value },
										}).then(refreshPage);
									});
								}}
								disabled={isBusy}
							>
								<SelectTrigger className="min-w-48">
									<SelectValue placeholder="Choose model" />
								</SelectTrigger>
								<SelectContent>
									{CHAT_MODELS.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											<div className="flex items-center gap-2">
												<span>{model.label}</span>
												<span className="text-xs text-muted-foreground">
													{model.description}
												</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Button
								type="button"
								variant="ghost"
								size="sm"
								disabled={!selectedThread || isBusy}
								onClick={() => {
									if (!selectedThread) return;
									handleRequestDelete(selectedThread);
								}}
							>
								<Trash2Icon className="size-4" />
							</Button>
						</div>
					</div>

					<div className="min-h-0 flex-1">
						{selectedThread ? (
							<ChatWorkspace
								key={`${selectedThread.id}:${selectedModel}`}
								threadId={selectedThread.id}
								model={selectedModel}
								messagesJson={data.messagesJson}
								initialMessage={initialMessage}
								onFinish={() => {
									void refreshPage();
								}}
							/>
						) : (
							<div className="flex h-full items-center justify-center px-6">
								<div className="w-full max-w-lg space-y-4">
									<div className="text-center">
										<h2 className="text-lg font-semibold text-[var(--ink)]">
											Start a conversation
										</h2>
										<p className="mt-1 text-sm text-[var(--ink-soft)]">
											Type a message to begin.
										</p>
									</div>
									<Textarea
										value={draftMessage}
										onChange={(event) => setDraftMessage(event.target.value)}
										onKeyDown={(event) => {
											if (event.key === "Enter" && !event.shiftKey) {
												event.preventDefault();
												handleStartChat();
											}
										}}
										placeholder="Ask something..."
										className="min-h-28 rounded-lg bg-[var(--bg)] px-3 py-2.5"
									/>
									<div className="flex items-center justify-between gap-3">
										<p className="text-xs text-[var(--ink-soft)]">
											Enter to send, Shift+Enter for new line
										</p>
										<Button
											type="button"
											size="sm"
											onClick={handleStartChat}
											disabled={isBusy || draftMessage.trim().length === 0}
										>
											Send
										</Button>
									</div>
								</div>
							</div>
						)}
					</div>
				</section>

				<div className="order-2 hidden w-3 items-stretch justify-center lg:flex">
					<button
						type="button"
						className="group flex w-full cursor-col-resize items-center justify-center rounded-lg border border-transparent text-[var(--ink-soft)] transition hover:border-[var(--line)] hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:border-[var(--line)] focus-visible:bg-[var(--surface)] focus-visible:outline-none"
						onPointerDown={(event) => {
							event.preventDefault();
							handleResizeStart();
						}}
						onDoubleClick={() => {
							setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
						}}
						aria-label="Resize thread sidebar"
					>
						<GripVerticalIcon className="size-4 transition group-hover:scale-110" />
					</button>
				</div>

				<aside
					className="order-3 flex min-h-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:shrink-0"
					style={{ width: `${sidebarWidth}px` }}
				>
					<div className="mb-4 flex items-center justify-between gap-3">
						<h1 className="text-base font-semibold text-[var(--ink)]">
							Threads
						</h1>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => {
								startTransition(() => {
									void handleCreateThread(DEFAULT_CHAT_MODEL);
								});
							}}
							disabled={isBusy}
						>
							<MessageSquarePlusIcon className="size-4" />
							New
						</Button>
					</div>

					<div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
						{data.threads.map((thread: ChatThreadSummary) => {
							const isActive = thread.id === selectedThread?.id;

							return (
								<div key={thread.id} className="group relative">
									<button
										type="button"
										onClick={() => {
											void navigate({ search: { threadId: thread.id } });
										}}
										className={cn(
											"w-full rounded-lg px-3 py-2.5 pr-11 text-left transition",
											isActive
												? "bg-[var(--accent)] text-[var(--ink)]"
												: "text-[var(--ink-soft)] hover:bg-[var(--accent)] hover:text-[var(--ink)]",
										)}
									>
										<p className="truncate text-sm font-medium">
											{thread.title}
										</p>
										<p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">
											{thread.preview}
										</p>
									</button>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className={cn(
											"absolute top-2.5 right-2 text-[var(--ink-soft)] opacity-0 transition hover:text-[var(--ink)]",
											isActive && "opacity-100",
											"group-hover:opacity-100",
										)}
										disabled={isBusy}
										onClick={(event) => {
											event.stopPropagation();
											handleRequestDelete(thread);
										}}
										aria-label={`Delete ${thread.title}`}
									>
										<Trash2Icon className="size-3.5" />
									</Button>
								</div>
							);
						})}
					</div>
				</aside>
			</div>

			<Dialog
				open={pendingDeleteThread !== null}
				onOpenChange={(open) => {
					if (!open && !isBusy) {
						setPendingDeleteThread(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete thread?</DialogTitle>
						<DialogDescription>
							{pendingDeleteThread
								? `This will permanently remove "${pendingDeleteThread.title}" and its messages.`
								: "This will permanently remove the selected thread and its messages."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPendingDeleteThread(null)}
							disabled={isBusy}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleConfirmDelete}
							disabled={isBusy || !pendingDeleteThread}
						>
							Delete thread
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
