import { useAtom } from "jotai";
import { Monitor, Moon, Sun } from "lucide-react";
import { themeModeAtom } from "#/lib/theme";

export default function ThemeToggle() {
	const [mode, setMode] = useAtom(themeModeAtom);

	function toggleMode() {
		const next = mode === "light" ? "dark" : mode === "dark" ? "auto" : "light";
		setMode(next);
	}

	const label =
		mode === "auto"
			? "Theme: system"
			: `Theme: ${mode}`;

	const Icon = mode === "auto" ? Monitor : mode === "dark" ? Moon : Sun;

	return (
		<button
			type="button"
			onClick={toggleMode}
			aria-label={label}
			title={label}
			className="flex items-center justify-center rounded-md p-2 text-[var(--ink-soft)] transition hover:bg-[var(--chip-bg)] hover:text-[var(--ink)]"
		>
			<Icon className="size-4" />
		</button>
	);
}
