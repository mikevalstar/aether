import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isPending && session?.user) {
			void navigate({ to: "/dashboard" });
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<main className="page-wrap flex items-center justify-center px-4 py-20">
				<div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--lagoon-rim)] border-t-[var(--lagoon-deep)]" />
			</main>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			if (isSignUp) {
				const result = await authClient.signUp.email({ email, password, name });
				if (result.error) setError(result.error.message || "Sign up failed");
			} else {
				const result = await authClient.signIn.email({ email, password });
				if (result.error) setError(result.error.message || "Sign in failed");
			}
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="page-wrap flex items-center justify-center px-4 py-20">
			<div className="island-shell rise-in w-full max-w-md rounded-2xl px-8 py-10">
				<div className="mb-8 text-center">
					<span className="island-kicker mb-2 block">Aether</span>
					<h1 className="display-title text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
						{isSignUp ? "Create your account" : "Welcome back"}
					</h1>
					<p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
						{isSignUp
							? "Enter your details to get started"
							: "Sign in to access your dashboard"}
					</p>
				</div>

				<form onSubmit={handleSubmit} className="grid gap-4">
					{isSignUp && (
						<div className="grid gap-1.5">
							<label
								htmlFor="name"
								className="text-sm font-medium text-[var(--sea-ink)]"
							>
								Name
							</label>
							<input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your name"
								required
								className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-3 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none transition"
							/>
						</div>
					)}

					<div className="grid gap-1.5">
						<label
							htmlFor="email"
							className="text-sm font-medium text-[var(--sea-ink)]"
						>
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
							className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-3 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none transition"
						/>
					</div>

					<div className="grid gap-1.5">
						<label
							htmlFor="password"
							className="text-sm font-medium text-[var(--sea-ink)]"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
							minLength={8}
							className="h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-3 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:border-[var(--lagoon-deep)] focus:outline-none transition"
						/>
					</div>

					{error && (
						<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
							<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="mt-1 h-10 w-full rounded-full bg-[var(--lagoon-deep)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? (
							<span className="flex items-center justify-center gap-2">
								<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
								Please wait…
							</span>
						) : isSignUp ? (
							"Create account"
						) : (
							"Sign in"
						)}
					</button>
				</form>

				<div className="mt-6 text-center">
					<button
						type="button"
						onClick={() => {
							setIsSignUp(!isSignUp);
							setError("");
						}}
						className="text-sm text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
					>
						{isSignUp
							? "Already have an account? Sign in"
							: "Don't have an account? Sign up"}
					</button>
				</div>
			</div>
		</main>
	);
}
