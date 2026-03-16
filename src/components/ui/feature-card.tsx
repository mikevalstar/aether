import type { LucideIcon } from "lucide-react";

export interface FeatureCardProps {
	/** Lucide icon component */
	icon: LucideIcon;
	/** Card heading */
	title: string;
	/** Card description text */
	description: string;
	/** Tailwind text color class for the icon (e.g. "text-[var(--teal)]") */
	color?: string;
	/** Tailwind background class for the icon well and card tint (e.g. "bg-[var(--teal-subtle)]") */
	bg?: string;
	/** Tailwind border color class (e.g. "border-[var(--teal)]/20") */
	border?: string;
}

export function FeatureCard({
	icon: Icon,
	title,
	description,
	color = "text-primary",
	bg = "bg-secondary",
	border = "border-border",
}: FeatureCardProps) {
	return (
		<article className={`group relative rounded-xl border ${border} ${bg} p-7 transition-shadow hover:shadow-lg`}>
			<div className={`mb-4 inline-flex size-10 items-center justify-center rounded-lg ${bg} ${color}`}>
				<Icon className="size-5" strokeWidth={1.75} />
			</div>
			<h2 className="mb-2 text-base font-bold tracking-tight">{title}</h2>
			<p className="m-0 text-sm leading-relaxed text-muted-foreground">{description}</p>
		</article>
	);
}
