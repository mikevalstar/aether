import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, LogIn } from "lucide-react";
import { AppLogo } from "#/components/AppLogo";
import ThemeToggle from "#/components/ThemeToggle";
import { Button } from "#/components/ui/button";
import { SectionLabel } from "#/components/ui/section-label";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const { data: session } = authClient.useSession();

  return (
    <main className="auth-grid-bg relative grid min-h-dvh place-items-center bg-background px-5 py-12 text-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="absolute top-5 left-5 flex items-center gap-2.5 md:top-7 md:left-7">
        <AppLogo markClassName="size-7" />
        <span className="text-[15px] font-semibold tracking-tight">aether</span>
      </div>

      <div className="flex w-full max-w-[640px] flex-col items-center gap-7 text-center">
        <SectionLabel>◆ PRIVATE INSTANCE</SectionLabel>

        <h1 className="display-title border-l-[3px] border-[var(--accent)] pl-5 text-left text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
          A quiet console for the work you actually do.
        </h1>

        <p className="max-w-[480px] text-left text-[14px] leading-relaxed text-[var(--ink-dim)] sm:text-[15px]">
          Your vault, your agents, your schedule — wired together. Aether brings notes, tasks, and AI into one focused space
          so you can think clearly and act deliberately.
        </p>

        <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-4">
          {session?.user ? (
            <Button asChild size="lg" className="gap-2 pr-5">
              <Link to="/dashboard" className="no-underline">
                Go to Dashboard
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="gap-2 pr-5">
              <Link to="/login" className="no-underline">
                Sign in
                <LogIn className="size-4" />
              </Link>
            </Button>
          )}
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-[var(--ink-faint)]">
            <Lock className="size-3" />
            INVITE-ONLY
          </span>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-wider text-[var(--ink-faint)]">
        NEED ACCESS? ASK AN ADMIN
      </div>
    </main>
  );
}
