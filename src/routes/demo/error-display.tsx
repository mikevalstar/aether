import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorBoundary, ErrorDisplay } from "#/lib/error-display";

export const Route = createFileRoute("/demo/error-display")({
	component: ErrorDisplayDemo,
});

function createRealError(): Error {
	try {
		const obj: Record<string, unknown> = {};
		// @ts-expect-error intentional to generate a real stack trace
		obj.deep.nested.property.access();
	} catch (e) {
		return e as Error;
	}
	return new Error("fallback");
}

function BuggyComponent(): React.ReactNode {
	throw new Error("This component always crashes! Caught by ErrorBoundary.");
}

function ErrorDisplayDemo() {
	const [showBoundary, setShowBoundary] = useState(false);

	return (
		<div className="page-wrap py-8">
			<div className="mb-6">
				<Link to="/dashboard" className="text-sm text-ink-soft hover:text-ink">
					&larr; Back to Dashboard
				</Link>
				<h1 className="display-title text-2xl font-bold mt-2 mb-1">Error Display Demo</h1>
				<p className="text-sm text-ink-soft">
					Preview of the error display components — parsed stack traces, IDE links, copy-to-clipboard, and ErrorBoundary.
				</p>
			</div>

			<div className="space-y-8">
				{/* Real TypeError with stack */}
				<section>
					<h2 className="text-sm font-semibold mb-2 text-ink-soft uppercase tracking-wide">TypeError — Real Stack Trace</h2>
					<div className="surface-card overflow-hidden">
						<ErrorDisplay
							error={createRealError()}
							defaultExpanded={true}
							onRetry={() => alert("Retrying...")}
							onDismiss={() => alert("Dismissed!")}
						/>
					</div>
				</section>

				{/* Simple error */}
				<section>
					<h2 className="text-sm font-semibold mb-2 text-ink-soft uppercase tracking-wide">Simple Error Message</h2>
					<div className="surface-card overflow-hidden">
						<ErrorDisplay error={new Error("Something went wrong while processing your request.")} defaultExpanded={true} />
					</div>
				</section>

				{/* Network error */}
				<section>
					<h2 className="text-sm font-semibold mb-2 text-ink-soft uppercase tracking-wide">Network Error with URL</h2>
					<div className="surface-card overflow-hidden">
						<ErrorDisplay
							error={(() => {
								const e = new Error("Failed to fetch data from API — connection refused.");
								e.name = "NetworkError";
								return e;
							})()}
							defaultExpanded={true}
							showURL={true}
						/>
					</div>
				</section>

				{/* String error */}
				<section>
					<h2 className="text-sm font-semibold mb-2 text-ink-soft uppercase tracking-wide">String Error</h2>
					<div className="surface-card overflow-hidden">
						<ErrorDisplay error="An unexpected string error occurred" defaultExpanded={true} />
					</div>
				</section>

				{/* Object error */}
				<section>
					<h2 className="text-sm font-semibold mb-2 text-ink-soft uppercase tracking-wide">Object Error</h2>
					<div className="surface-card overflow-hidden">
						<ErrorDisplay
							error={{
								code: "ERR_INVALID_STATE",
								detail: "Session expired",
								statusCode: 401,
							}}
							defaultExpanded={true}
						/>
					</div>
				</section>

				{/* ErrorBoundary demo */}
				<section>
					<h2 className="text-sm font-semibold mb-2 text-ink-soft uppercase tracking-wide">ErrorBoundary</h2>
					<p className="text-sm text-ink-soft mb-3">
						Click to render a component that throws — the ErrorBoundary catches it and shows the ErrorDisplay.
					</p>
					{showBoundary ? (
						<div className="surface-card overflow-hidden">
							<ErrorBoundary onRetry={() => setShowBoundary(false)}>
								<BuggyComponent />
							</ErrorBoundary>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setShowBoundary(true)}
							className="px-4 py-2 text-sm font-medium rounded-md bg-destructive/10 text-destructive-foreground hover:bg-destructive/20 border border-destructive/20 transition-colors"
						>
							Trigger ErrorBoundary
						</button>
					)}
				</section>
			</div>
		</div>
	);
}
