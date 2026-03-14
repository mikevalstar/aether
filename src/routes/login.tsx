import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
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
				<Spinner />
			</main>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) setError(result.error.message || "Sign in failed");
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="page-wrap flex items-center justify-center px-4 py-20">
			<div className="surface-card w-full max-w-sm px-8 py-10">
				<div className="mb-8">
					<h1 className="display-title text-xl font-bold tracking-tight">
						Welcome back
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Sign in to your dashboard. New accounts are created by an admin.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-1.5">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
							minLength={8}
						/>
					</div>

					{error && (
						<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					<Button type="submit" disabled={loading} className="mt-1 w-full">
						{loading ? (
							<span className="flex items-center justify-center gap-2">
								<Spinner size="sm" className="border-white/40 border-t-white" />
								Please wait…
							</span>
						) : (
							"Sign in"
						)}
					</Button>
				</form>

				<p className="mt-6 text-center text-sm text-muted-foreground">
					Need access? Ask an admin to create your account.
				</p>
			</div>
		</main>
	);
}
