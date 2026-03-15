import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredIDE, IDE_OPTIONS, setStoredIDE } from "./ide-links";
import type { IDEType } from "./types";

export function IDESelector() {
	const [currentIDE, setCurrentIDE] = useState<IDEType>("vscode");
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		setCurrentIDE(getStoredIDE());
	}, []);

	const handleChange = (ide: IDEType) => {
		setCurrentIDE(ide);
		setStoredIDE(ide);
		setIsOpen(false);
	};

	const currentOption =
		IDE_OPTIONS.find((opt) => opt.id === currentIDE) ?? IDE_OPTIONS[0];

	return (
		<div style={selectorStyles.container}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				style={selectorStyles.trigger}
				title="Select IDE"
			>
				<span style={selectorStyles.label}>{currentOption.label}</span>
				<ChevronDown size={12} style={{ opacity: 0.6 }} />
			</button>

			{isOpen && (
				<>
					<button
						type="button"
						style={selectorStyles.backdrop}
						onClick={() => setIsOpen(false)}
						aria-label="Close menu"
					/>
					<div style={selectorStyles.dropdown}>
						{IDE_OPTIONS.map((option) => (
							<button
								key={option.id}
								type="button"
								onClick={() => handleChange(option.id)}
								style={{
									...selectorStyles.option,
									...(option.id === currentIDE
										? selectorStyles.optionActive
										: {}),
								}}
							>
								{option.label}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}

const selectorStyles = {
	container: {
		position: "relative" as const,
	},
	trigger: {
		display: "flex",
		alignItems: "center",
		gap: 4,
		background: "var(--surface)",
		border: "1px solid var(--line)",
		borderRadius: 4,
		padding: "4px 8px",
		fontSize: 11,
		fontFamily: "var(--font-sans)",
		color: "var(--ink-soft)",
		cursor: "pointer",
		transition: "background 0.15s",
	},
	label: {
		maxWidth: 70,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap" as const,
	},
	backdrop: {
		position: "fixed" as const,
		inset: 0,
		zIndex: 40,
		background: "transparent",
		border: "none",
		padding: 0,
		cursor: "default",
	},
	dropdown: {
		position: "absolute" as const,
		top: "100%",
		right: 0,
		marginTop: 4,
		background: "var(--muted)",
		border: "1px solid var(--line)",
		borderRadius: 6,
		padding: "4px 0",
		minWidth: 120,
		boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
		zIndex: 50,
	},
	option: {
		display: "block",
		width: "100%",
		padding: "6px 12px",
		fontSize: 12,
		fontFamily: "var(--font-sans)",
		color: "var(--ink-soft)",
		background: "transparent",
		border: "none",
		cursor: "pointer",
		textAlign: "left" as const,
		transition: "background 0.1s, color 0.1s",
	},
	optionActive: {
		color: "var(--ink)",
		background: "var(--accent)",
	},
};
