import { Bot, ChevronRight, FileText, Settings, Wrench } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";

type ResponseMessageContent =
	| { type: "text"; text: string }
	| {
			type: "tool-call";
			toolCallId: string;
			toolName: string;
			input: unknown;
			[k: string]: unknown;
	  }
	| {
			type: "tool-result";
			toolCallId: string;
			toolName: string;
			output: unknown;
			[k: string]: unknown;
	  };

type ResponseMessage = {
	role: string;
	content: string | ResponseMessageContent[];
};

export function parseMessages(json: string): ResponseMessage[] {
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function truncateJson(value: unknown, maxLength = 500): string {
	const str = JSON.stringify(value, null, 2);
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength)}…`;
}

function ToolCallBlock({ toolName, input }: { toolName: string; input: unknown }) {
	return (
		<Collapsible>
			<CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1">
				<Wrench className="size-3" />
				<span className="font-mono">{toolName}</span>
				<ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
					{truncateJson(input)}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}

function ToolResultBlock({ toolName, output }: { toolName: string; output: unknown }) {
	return (
		<Collapsible>
			<CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-foreground py-1">
				<ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
				<span className="font-mono">{toolName}</span>
				<span className="text-muted-foreground">result</span>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto max-h-48 overflow-y-auto">
					{truncateJson(output, 1000)}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}

type RunMessagesProps = {
	messagesJson: string;
	systemPromptJson?: string | null;
	availableToolsJson?: string | null;
};

function SystemPromptBlock({ json }: { json: string }) {
	try {
		const prompt = JSON.parse(json);
		const text = typeof prompt === "string" ? prompt : JSON.stringify(prompt, null, 2);
		return (
			<Collapsible>
				<CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1">
					<FileText className="size-3" />
					<span>System Prompt</span>
					<ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
				</CollapsibleTrigger>
				<CollapsibleContent>
					<pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
						{text}
					</pre>
				</CollapsibleContent>
			</Collapsible>
		);
	} catch {
		return null;
	}
}

function AvailableToolsBlock({ json }: { json: string }) {
	try {
		const tools = JSON.parse(json);
		if (!Array.isArray(tools) || tools.length === 0) return null;
		return (
			<Collapsible>
				<CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground py-1">
					<Settings className="size-3" />
					<span>Available Tools ({tools.length})</span>
					<ChevronRight className="size-3 transition-transform [[data-state=open]>&]:rotate-90" />
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="mt-1 flex flex-wrap gap-1">
						{tools.map((tool: string) => (
							<span key={tool} className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
								{tool}
							</span>
						))}
					</div>
				</CollapsibleContent>
			</Collapsible>
		);
	} catch {
		return null;
	}
}

export function RunMessages({ messagesJson, systemPromptJson, availableToolsJson }: RunMessagesProps) {
	const messages = parseMessages(messagesJson);

	if (messages.length === 0 && !systemPromptJson && !availableToolsJson) {
		return <p className="text-muted-foreground italic text-sm">No messages recorded</p>;
	}

	return (
		<div className="text-sm space-y-3">
			{(systemPromptJson || availableToolsJson) && (
				<div className="space-y-1 border-b border-border pb-2 mb-2">
					{systemPromptJson && <SystemPromptBlock json={systemPromptJson} />}
					{availableToolsJson && <AvailableToolsBlock json={availableToolsJson} />}
				</div>
			)}
			{messages.map((msg, msgIdx) => {
				const msgKey = `${msg.role}-${msgIdx}`;

				if (msg.role === "assistant") {
					const content =
						typeof msg.content === "string"
							? [{ type: "text" as const, text: msg.content }]
							: Array.isArray(msg.content)
								? msg.content
								: [];

					const hasContent = content.length > 0;
					if (!hasContent) return null;

					return (
						<div key={msgKey} className="space-y-1">
							<div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
								<Bot className="size-3" />
								<span>Assistant</span>
							</div>
							{content.map((block) => {
								if (block.type === "text") {
									return (
										<div key={`${msgKey}-text`} className="whitespace-pre-wrap text-sm">
											{block.text}
										</div>
									);
								}
								if (block.type === "tool-call") {
									return <ToolCallBlock key={block.toolCallId} toolName={block.toolName} input={block.input} />;
								}
								return null;
							})}
						</div>
					);
				}

				if (msg.role === "tool") {
					const content = Array.isArray(msg.content) ? msg.content : [];
					if (content.length === 0) return null;

					return (
						<div key={msgKey} className="space-y-1 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800">
							{content.map((block) => {
								if (block.type === "tool-result") {
									return (
										<ToolResultBlock key={block.toolCallId} toolName={block.toolName ?? "tool"} output={block.output} />
									);
								}
								return null;
							})}
						</div>
					);
				}

				return null;
			})}
		</div>
	);
}
