import { atomWithStorage } from "jotai/utils";

export type ThemeMode = "light" | "dark" | "auto";

export const themeModeAtom = atomWithStorage<ThemeMode>(
	"theme",
	"auto",
	undefined,
	{
		getOnInit: true,
	},
);

export function getResolvedTheme(mode: ThemeMode): "light" | "dark" {
	if (mode === "auto") {
		if (typeof window === "undefined") return "light";
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}
	return mode;
}

export function applyTheme(mode: ThemeMode): void {
	const resolved = getResolvedTheme(mode);
	const root = document.documentElement;

	root.classList.remove("light", "dark");
	root.classList.add(resolved);

	if (mode === "auto") {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", mode);
	}

	root.style.colorScheme = resolved;
}
