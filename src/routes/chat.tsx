import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { MessageSquarePlusIcon, Trash2Icon } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
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

	const lastUpdatedLabel = useMemo(() => {
		if (!selectedThread) return null;

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(new Date(selectedThread.updatedAt));
	}, [selectedThread]);

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
		<main className="page-wrap flex min-h-[calc(100vh-8rem)] px-4 py-8">
			<div className="grid min-h-0 w-full gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside className="flex min-h-[38rem] flex-col rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(79,184,178,0.08),rgba(255,255,255,0))] p-4 shadow-sm">
					<div className="mb-4 flex items-center justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--teal)]">
								Chat
							</p>
							<h1 className="mt-1 text-xl font-semibold text-[var(--ink)]">
								Assistant UI
							</h1>
						</div>
						<Button
							type="button"
							size="sm"
							onClick={() => {
								startTransition(() => {
									void handleCreateThread(selectedModel);
								});
							}}
							disabled={isBusy}
							className="rounded-full"
						>
							<MessageSquarePlusIcon className="size-4" />
							New
						</Button>
					</div>

					<div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
										"w-full rounded-2xl border px-4 py-3 text-left transition",
										isActive
											? "border-[var(--teal)] bg-[color-mix(in_oklab,var(--surface)_84%,var(--teal)_16%)] shadow-sm"
											: "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--teal)]/45 hover:bg-[color-mix(in_oklab,var(--surface)_90%,var(--teal)_10%)]",
									)}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold text-[var(--ink)]">
												{thread.title}
											</p>
											<p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ink-soft)]">
												{thread.preview}
											</p>
										</div>
										<span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ink-soft)]">
											{thread.model.replace("claude-", "").replaceAll("-", " ")}
										</span>
									</div>
								</button>
							);
						})}
					</div>
				</aside>

				<section className="flex min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] shadow-sm">
					<div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-5 py-4">
						<div className="min-w-0 flex-1">
							<p className="truncate text-base font-semibold text-[var(--ink)]">
								{selectedThread?.title ?? "Start a new chat"}
							</p>
							{lastUpdatedLabel ? (
								<p className="mt-1 text-xs text-[var(--ink-soft)]">
									Updated {lastUpdatedLabel}
								</p>
							) : null}
						</div>

						<div className="flex flex-wrap items-center gap-3">
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
								<SelectTrigger className="min-w-52 rounded-full bg-[var(--surface)]">
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
								variant="outline"
								size="sm"
								disabled={!selectedThread || isBusy}
								onClick={() => {
									if (!selectedThread) return;

									startTransition(() => {
										void handleDeleteThread(selectedThread);
									});
								}}
								className="rounded-full"
							>
								<Trash2Icon className="size-4" />
								Delete
							</Button>
						</div>
					</div>

					<div className="min-h-0 flex-1 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_95%,var(--teal)_5%),var(--surface))]">
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
							<div className="flex h-full items-center justify-center px-6 py-10">
								<div className="w-full max-w-2xl rounded-[1.75rem] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_92%,white_8%)] p-6 shadow-sm">
									<p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--teal)]">
										New conversation
									</p>
									<h2 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
										Ask Anthropic anything
									</h2>
									<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
										Pick a model, type your first message, and a thread will be
										created when you send it.
									</p>
									<div className="mt-5 space-y-4">
										<Textarea
											value={draftMessage}
											onChange={(event) => setDraftMessage(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Enter" && !event.shiftKey) {
													event.preventDefault();
													handleStartChat();
												}
											}}
											placeholder="Ask about your notes, sketch a plan, or start a conversation..."
											className="min-h-32 rounded-2xl bg-[var(--surface)] px-4 py-3"
										/>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<p className="text-xs text-[var(--ink-soft)]">
												Press Enter to send, Shift+Enter for a new line.
											</p>
											<Button
												type="button"
												onClick={handleStartChat}
												disabled={isBusy || draftMessage.trim().length === 0}
												className="rounded-full"
											>
												<MessageSquarePlusIcon className="size-4" />
												Start chat
											</Button>
										</div>
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
