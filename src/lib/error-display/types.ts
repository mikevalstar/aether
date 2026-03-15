export type IDEType = "vscode" | "cursor" | "zed" | "windsurf";

export interface IDEResolver {
	id: IDEType;
	label: string;
	deepLinkPrefix: string;
}

export interface StackFrame {
	file: string;
	line: number;
	column: number;
	functionName: string;
	isNative: boolean;
	isInternal: boolean;
	source?: string;
}

export interface ParsedError {
	type: string;
	message: string;
	stack?: string;
	frames: StackFrame[];
	url?: string;
	timestamp: string;
}

export interface ErrorDisplayProps {
	error: unknown;
	defaultExpanded?: boolean;
	onRetry?: () => void;
	onDismiss?: () => void;
	showURL?: boolean;
	projectRoot?: string;
}

export interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{
		error: Error;
		resetErrorBoundary: () => void;
	}>;
	onRetry?: () => void;
}

export interface StackFrameRowProps {
	frame: StackFrame;
	index: number;
	isExpanded: boolean;
	isUserCode: boolean;
	projectRoot?: string;
	onToggle: () => void;
	onOpenInIDE: (file: string, line: number, column: number) => void;
}

export interface StackTraceProps {
	frames: StackFrame[];
	projectRoot?: string;
	defaultExpanded?: boolean;
}

export interface CodeFrameProps {
	filePath: string;
	line: number;
	column?: number;
	sourceCode?: string;
	contextLines?: number;
}

export interface ErrorHeaderProps {
	type: string;
	message: string;
	url?: string;
	onCopy: () => void;
	onRetry?: () => void;
	onDismiss?: () => void;
	copied: boolean;
}
