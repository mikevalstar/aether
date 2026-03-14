import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { MessageSquarePlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { z } from "zod";
import { ChatWorkspace } from "#/components/chat/ChatWorkspace";
import { Button } from "#/components/ui/button";
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
	const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
	const [isMutating, startTransition] = useTransition();
	const [draftModel, setDraftModel] = useState(DEFAULT_CHAT_MODEL);
	const [draftMessage, setDraftMessage] = useState("");
	const [initialMessage, setInitialMessage] = useState<string | undefined>();

	const refreshPage = useCallback(async () => {
		await router.invalidate();
	}, [router]);

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

			const nextThread = data.threads.find(
				(item: ChatThreadSummary) => item.id !== thread.id,
			);
			await navigate({
				search: nextThread ? { threadId: nextThread.id } : {},
			});
			await router.invalidate();
		},
		[data.threads, navigate, router],
	);

	const selectedThread = data.selectedThread;
	const selectedModel = selectedThread?.model ?? DEFAULT_CHAT_MODEL;
	const isBusy = isMutating || pendingThreadId !== null;
	const emptyStateModel = selectedThread?.model ?? draftModel;

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
		<main className="mx-auto flex h-[calc(100vh-8rem)] w-[min(1400px,calc(100%-2rem))] px-4 py-8">
			<div className="grid min-h-0 w-full gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
				<aside className="order-2 flex min-h-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
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
									void handleCreateThread(selectedModel);
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
								<button
									key={thread.id}
									type="button"
									onClick={() => {
										void navigate({ search: { threadId: thread.id } });
									}}
									className={cn(
										"w-full rounded-lg px-3 py-2.5 text-left transition",
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
							);
						})}
					</div>
				</aside>

				<section className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
					<div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-4 py-3">
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-[var(--ink)]">
								{selectedThread?.title ?? "New chat"}
							</p>
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

									startTransition(() => {
										void handleDeleteThread(selectedThread);
									});
								}}
							>
								<Trash2Icon className="size-4" />
							</Button>
						</div>
					</div>

					<div className="min-h-0 flex-1">
						{selectedThread ? (
							<ChatWorkspace
								key={selectedThread.id}
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
			</div>
		</main>
	);
}
