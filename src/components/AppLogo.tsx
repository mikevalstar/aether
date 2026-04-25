import { cn } from "#/lib/utils";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function AppLogo({ className, markClassName, showWordmark = false }: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src="/favicon.svg" alt="" className={cn("size-8 shrink-0 rounded-[7px]", markClassName)} aria-hidden="true" />
      {showWordmark && <span className="text-sm font-bold tracking-wide text-primary">Aether</span>}
    </span>
  );
}
