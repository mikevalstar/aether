export interface GlowBgProps {
	/** CSS color value or var reference (e.g. "var(--teal)") */
	color: string;
	/** Tailwind size class (e.g. "size-[600px]") */
	size?: string;
	/** Tailwind position classes (e.g. "-right-40 -top-40") */
	position?: string;
}

export function GlowBg({ color, size = "size-[500px]", position = "-right-40 -top-40" }: GlowBgProps) {
	return (
		<div
			aria-hidden
			className={`pointer-events-none absolute rounded-full blur-3xl ${size} ${position}`}
			style={{ backgroundColor: `oklch(from ${color} l c h / 0.04)` }}
		/>
	);
}
