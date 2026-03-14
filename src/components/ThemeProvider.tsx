import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { applyTheme, themeModeAtom } from "#/lib/theme";

export default function ThemeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mode, setMode] = useAtom(themeModeAtom);
	const initialized = useRef(false);

	useEffect(() => {
		applyTheme(mode);
	}, [mode]);

	useEffect(() => {
		if (mode !== "auto") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("auto");

		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, [mode]);

	useEffect(() => {
		if (initialized.current) return;
		initialized.current = true;

		const stored = localStorage.getItem("theme") as
			| "light"
			| "dark"
			| "auto"
			| null;
		if (stored && ["light", "dark", "auto"].includes(stored)) {
			if (stored !== mode) {
				setMode(stored);
			} else {
				applyTheme(stored);
			}
		} else {
			applyTheme(mode);
		}
	}, [mode, setMode]);

	return children;
}
