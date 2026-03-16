import { parse } from "error-stack-parser-es";
import type { ParsedError, StackFrame } from "./types";

const INTERNAL_PATTERNS = [/node_modules/, /__test__/, /\.test\./, /\.spec\./, /nitro/, /vite/, /@tanstack/, /\.nitro/];

const NATIVE_PATTERNS = [/^native/, /^eval$/, /^\w+$/];

export function extractError(error: unknown): {
	type: string;
	message: string;
	stack?: string;
	originalError?: Error;
} {
	if (error instanceof Error) {
		return {
			type: error.constructor.name || "Error",
			message: error.message,
			stack: error.stack,
			originalError: error,
		};
	}
	if (typeof error === "string") {
		return { type: "Error", message: error };
	}
	if (error && typeof error === "object") {
		try {
			return { type: "Error", message: JSON.stringify(error, null, 2) };
		} catch {
			return { type: "Error", message: "[Unable to stringify error]" };
		}
	}
	return { type: "Unknown", message: String(error) };
}

function cleanFilePath(filePath: string): string {
	if (!filePath) return filePath;

	// Remove full URLs like http://localhost:3000/src/...
	let cleaned = filePath.replace(/^https?:\/\/[^/]+/, "");

	// Remove leading slashes for display
	if (cleaned.startsWith("/")) {
		cleaned = cleaned.slice(1);
	}

	return cleaned;
}

export function parseStack(error: Error | undefined): StackFrame[] {
	if (!error) return [];

	try {
		const parsed = parse(error);

		return parsed.map((frame) => {
			const rawFileName = frame.fileName || "";
			const fileName = cleanFilePath(rawFileName);
			const isNative = NATIVE_PATTERNS.some((p) => p.test(rawFileName)) || false;
			const isInternal = INTERNAL_PATTERNS.some((p) => p.test(rawFileName));

			return {
				file: fileName,
				line: frame.lineNumber || 0,
				column: frame.columnNumber || 0,
				functionName: frame.functionName || "<anonymous>",
				isNative,
				isInternal,
			};
		});
	} catch {
		return fallbackParseStack(error.stack);
	}
}

function fallbackParseStack(stack: string | undefined): StackFrame[] {
	if (!stack) return [];

	const lines = stack.split("\n");
	const frames: StackFrame[] = [];

	for (const line of lines) {
		const match = line.match(/^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
		if (match) {
			const functionName = match[1] || "<anonymous>";
			const rawFile = match[2] || "";
			const file = cleanFilePath(rawFile);
			const lineNum = parseInt(match[3], 10) || 0;
			const col = parseInt(match[4], 10) || 0;

			const isNative = NATIVE_PATTERNS.some((p) => p.test(rawFile));
			const isInternal = INTERNAL_PATTERNS.some((p) => p.test(rawFile));

			frames.push({
				file,
				line: lineNum,
				column: col,
				functionName,
				isNative,
				isInternal,
			});
		}
	}

	return frames;
}

export function parseError(error: unknown, url?: string): ParsedError {
	const { type, message, stack, originalError } = extractError(error);
	const frames = parseStack(originalError);

	return {
		type,
		message,
		stack,
		frames,
		url: url || (typeof window !== "undefined" ? window.location.href : undefined),
		timestamp: new Date().toISOString(),
	};
}

export function formatErrorForCopy(parsed: ParsedError): string {
	const parts: string[] = [];

	parts.push(`${parsed.type}: ${parsed.message}`);

	if (parsed.url) {
		parts.push("");
		parts.push(`URL: ${parsed.url}`);
	}

	if (parsed.frames.length > 0) {
		parts.push("");
		parts.push("Stack trace:");
		for (const frame of parsed.frames) {
			const location = frame.file ? `${frame.file}:${frame.line}:${frame.column}` : "<native>";
			parts.push(`  at ${frame.functionName} (${location})`);
		}
	} else if (parsed.stack) {
		parts.push("");
		parts.push("Stack trace:");
		parts.push(parsed.stack);
	}

	parts.push("");
	parts.push(`Timestamp: ${parsed.timestamp}`);

	return parts.join("\n");
}
