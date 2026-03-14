import { MenuIcon, Trash2Icon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { CHAT_MODELS, type ChatModel } from "#/lib/chat";

export interface ChatHeaderProps {
	title: string;
	model: ChatModel;
	inputTokens?: number;
	outputTokens?: number;
	costLabel?: string;
	showStats?: boolean;
	disabled?: boolean;
	showMobileMenu?: boolean;
	onMobileMenuClick?: () => void;
	onModelChange?: (model: string) => void;
	onDelete?: () => void;
}

export function ChatHeader({
	title,
	model,
	inputTokens = 0,
	outputTokens = 0,
	costLabel = "$0.0000",
	showStats = false,
	disabled = false,
	showMobileMenu = false,
	onMobileMenuClick,
	onModelChange,
	onDelete,
}: ChatHeaderProps) {
	return (
		<div className="border-b-2 border-[var(--teal)] px-4 py-3">
			<div className="flex items-center gap-3">
				{showMobileMenu && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onMobileMenuClick}
						aria-label="Open threads"
					>
						<MenuIcon className="size-5" />
					</Button>
				)}

				<div className="min-w-0 flex-1">
					<h1 className="truncate text-base font-bold tracking-tight text-[var(--ink)]">
						{title}
					</h1>
				</div>

				<div className="flex items-center gap-2">
					<Select
						value={model}
						onValueChange={(value) => onModelChange?.(value)}
						disabled={disabled}
					>
						<SelectTrigger className="min-w-40 border-[var(--teal)]/30 bg-[var(--teal-subtle)] font-semibold text-[var(--teal)] hover:bg-[var(--teal-subtle)]">
							<SelectValue placeholder="Choose model" />
						</SelectTrigger>
						<SelectContent>
							{CHAT_MODELS.map((m) => (
								<SelectItem key={m.id} value={m.id}>
									<div className="flex items-center gap-2">
										<span className="font-medium">{m.label}</span>
										<Badge variant="secondary" className="text-[10px]">
											{m.description}
										</Badge>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						disabled={!onDelete || disabled}
						className="text-[var(--ink-soft)] hover:text-destructive"
						onClick={onDelete}
					>
						<Trash2Icon className="size-4" />
					</Button>
				</div>
			</div>

			{showStats && (
				<div className="mt-2 flex items-center gap-3 text-xs text-[var(--ink-soft)]">
					<span>
						<span className="font-medium text-[var(--ink)]">
							{inputTokens.toLocaleString()}
						</span>{" "}
						input tokens
					</span>
					<span className="text-[var(--line)]">/</span>
					<span>
						<span className="font-medium text-[var(--ink)]">
							{outputTokens.toLocaleString()}
						</span>{" "}
						output tokens
					</span>
					<span className="text-[var(--line)]">/</span>
					<span className="font-medium text-[var(--teal)]">{costLabel}</span>
				</div>
			)}
		</div>
	);
}
