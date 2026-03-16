import type { LucideIcon } from "lucide-react";

export interface SectionLabelProps {
	/** Lucide icon shown before the label */
	icon?: LucideIcon;
	/** Label text */
	children: React.ReactNode;
	/** Tailwind text color class (defaults to coral) */
	color?: string;
}

export function SectionLabel({ icon: Icon, children, color = "text-[var(--coral)]" }: SectionLabelProps) {
	return (
		<div className={`flex items-center gap-2 ${color}`}>
			{Icon && <Icon className="size-4" />}
			<p className="text-xs font-semibold uppercase tracking-widest">{children}</p>
		</div>
	);
}
