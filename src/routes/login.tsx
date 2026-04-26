import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppLogo } from "#/components/AppLogo";
import ThemeToggle from "#/components/ThemeToggle";
import { Alert, AlertDescription, AlertHeader } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isPending && session?.user) {
      void navigate({ to: "/dashboard" });
    }
  }, [session, isPending, navigate]);

  // ⌘↩ / Ctrl+↩ submits the form from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) setError(result.error.message || "Sign in failed");
    } catch (err) {
      console.error("Login failed:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-dvh grid-cols-1 bg-background text-foreground md:grid-cols-[minmax(320px,0.85fr)_1.15fr]">
      {/* Brand panel */}
      <aside className="auth-grid-bg relative flex flex-col justify-between gap-8 border-b border-[var(--line)] bg-[var(--top-bar-bg)] px-7 py-7 md:border-r md:border-b-0 md:px-10 md:py-9">
        <div className="flex items-center gap-2.5">
          <AppLogo markClassName="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">aether</span>
        </div>

        <div className="flex max-w-sm flex-col gap-3">
          <SectionLabel>◆ PRIVATE INSTANCE</SectionLabel>
          <h2 className="display-title border-l-[3px] border-[var(--accent)] pl-4 text-[26px] leading-[1.1] font-semibold tracking-tight">
            A quiet console for the work you actually do.
          </h2>
          <p className="ml-[17px] max-w-[340px] text-[13.5px] leading-snug text-[var(--ink-dim)]">
            Your vault, your agents, your schedule — wired together. Sign in to pick up where you left off.
          </p>
        </div>

        <div aria-hidden />
      </aside>

      {/* Form column */}
      <section className="relative grid place-items-center px-5 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[440px] rounded-md border border-[var(--line)] bg-[var(--surface)] px-7 pt-7 pb-5 shadow-[0_1px_0_color-mix(in_oklch,var(--ink)_4%,transparent)]">
          <header className="mb-6 flex flex-col gap-2.5">
            <SectionLabel icon={KeyRound}>SIGN IN</SectionLabel>
            <div className="border-l-[3px] border-[var(--accent)] pl-3.5">
              <h1 className="display-title text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">
                Welcome back
              </h1>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Sign in to your dashboard. New accounts are created by an admin.
              </p>
            </div>
          </header>

          {isPending ? (
            <div className="grid place-items-center py-16">
              <Spinner />
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldRow label="EMAIL" hint={<span>required</span>}>
                <Input
                  id="email"
                  type="email"
                  className="font-mono text-[12.5px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </FieldRow>

              <FieldRow
                label="PASSWORD"
                hint={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-[var(--ink-dim)] hover:text-[var(--accent)]"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="size-3" /> HIDE
                      </>
                    ) : (
                      <>
                        <Eye className="size-3" /> SHOW
                      </>
                    )}
                  </button>
                }
              >
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="font-mono text-[12.5px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={8}
                />
              </FieldRow>

              {error && (
                <Alert variant="destructive">
                  <AlertHeader label="Error" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full">
                {loading ? (
                  <>
                    <Spinner size="sm" className="border-current/30 border-t-current" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    Sign in
                    <LogIn />
                  </>
                )}
              </Button>

              <div className="mt-1 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3.5 font-mono text-[10px] tracking-wider text-[var(--ink-faint)]">
                <span>⌘↩ TO SUBMIT</span>
                <span>NEED ACCESS? ASK AN ADMIN</span>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-[var(--ink-soft)]">{label}</span>
        <span
          className="h-px flex-1 self-center border-t border-dashed border-[var(--line-strong)] opacity-70"
          aria-hidden
        />
        {hint && <span className="font-mono text-[10px] tracking-wider text-[var(--ink-faint)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
