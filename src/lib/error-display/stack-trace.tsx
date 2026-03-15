import { Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { StackFrameRow } from "./stack-frame";
import type { StackFrame, StackTraceProps } from "./types";

export function StackTrace({
	frames,
	projectRoot,
	defaultExpanded = true,
}: StackTraceProps) {
	const [expandedFrames, setExpandedFrames] = useState<Set<number>>(new Set());

	useEffect(() => {
		if (defaultExpanded) {
			const userCodeIndices = frames
				.map((f, i) => (!f.isInternal && !f.isNative ? i : -1))
				.filter((i) => i >= 0);
			setExpandedFrames(new Set(userCodeIndices.slice(0, 2)));
		}
	}, [frames, defaultExpanded]);

	const toggleFrame = (index: number) => {
		setExpandedFrames((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	const { userFrames, internalFrames } = frames.reduce<{
		userFrames: { frame: StackFrame; originalIndex: number }[];
		internalFrames: { frame: StackFrame; originalIndex: number }[];
	}>(
		(acc, frame, index) => {
			if (frame.isInternal || frame.isNative) {
				acc.internalFrames.push({ frame, originalIndex: index });
			} else {
				acc.userFrames.push({ frame, originalIndex: index });
			}
			return acc;
		},
		{ userFrames: [], internalFrames: [] },
	);

	const [showInternal, setShowInternal] = useState(false);

	return (
		<div style={stackStyles.container}>
			<div style={stackStyles.header}>
				<Layers size={13} style={{ color: "var(--ink-dim)" }} />
				<span style={stackStyles.title}>Stack Trace</span>
				<span style={stackStyles.count}>{frames.length} frames</span>
			</div>

			<div style={stackStyles.frames}>
				{userFrames.map(({ frame, originalIndex }) => (
					<StackFrameRow
						key={originalIndex}
						frame={frame}
						index={originalIndex}
						isExpanded={expandedFrames.has(originalIndex)}
						isUserCode={true}
						projectRoot={projectRoot}
						onToggle={() => toggleFrame(originalIndex)}
						onOpenInIDE={() => {}}
					/>
				))}

				{internalFrames.length > 0 && (
					<div style={stackStyles.internalSection}>
						<button
							type="button"
							onClick={() => setShowInternal(!showInternal)}
							style={stackStyles.internalToggle}
						>
							{showInternal ? "Hide" : "Show"} {internalFrames.length} internal
							frames
						</button>

						{showInternal && (
							<div style={stackStyles.internalFrames}>
								{internalFrames.map(({ frame, originalIndex }) => (
									<StackFrameRow
										key={originalIndex}
										frame={frame}
										index={originalIndex}
										isExpanded={expandedFrames.has(originalIndex)}
										isUserCode={false}
										projectRoot={projectRoot}
										onToggle={() => toggleFrame(originalIndex)}
										onOpenInIDE={() => {}}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

const stackStyles = {
	container: {
		flex: 1,
		overflow: "auto",
		background: "var(--surface)",
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: 8,
		padding: "10px 14px",
		borderBottom: "1px solid var(--line)",
		background: "var(--muted)",
		position: "sticky" as const,
		top: 0,
		zIndex: 10,
	},
	title: {
		fontSize: 12,
		fontWeight: 500,
		color: "var(--ink-soft)",
	},
	count: {
		fontSize: 10,
		color: "var(--ink-dim)",
		marginLeft: "auto",
	},
	frames: {
		overflow: "auto",
	},
	internalSection: {
		borderTop: "1px solid var(--line)",
	},
	internalToggle: {
		display: "block",
		width: "100%",
		padding: "10px 14px",
		fontSize: 11,
		fontFamily: "var(--font-sans)",
		color: "var(--ink-dim)",
		background: "transparent",
		border: "none",
		cursor: "pointer",
		textAlign: "left" as const,
		transition: "color 0.15s",
	},
	internalFrames: {
		background: "var(--bg)",
	},
};
