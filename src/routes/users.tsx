import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import { formatDate } from "#/lib/date";
import { createManagedUser, getUsersPageData, type ManagedUserRole } from "#/lib/user-management.functions";

export const Route = createFileRoute("/users")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async () => await getUsersPageData(),
	component: UsersPage,
});

function UsersPage() {
	const router = useRouter();
	const { currentUser, users } = Route.useLoaderData();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<ManagedUserRole>("user");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setSuccess("");
		setIsSubmitting(true);

		try {
			await createManagedUser({
				data: { name, email, password, role },
			});
			setName("");
			setEmail("");
			setPassword("");
			setRole("user");
			setSuccess("");
			toast.success("User added", {
				description: "Share the email and temporary password with them.",
			});
			await router.invalidate();
		} catch (submissionError) {
			setError(submissionError instanceof Error ? submissionError.message : "Failed to add user");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Invite-only Access</p>
					<h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">Users</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Accounts are created by admins here instead of public signup. If someone does not have a real inbox yet, use a
						placeholder like `name@local.test` and have them change their password after first login.
					</p>
				</div>
				<div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
					Signed in as <span className="font-semibold text-foreground">{currentUser.email}</span>
				</div>
			</section>

			<section className="mb-8 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
				<form onSubmit={handleSubmit} className="surface-card p-6">
					<h2 className="text-lg font-semibold">Add user</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						New accounts start as invite-only users with a temporary password.
					</p>

					<div className="mt-5 grid gap-4">
						<div className="grid gap-1.5">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
								placeholder="Taylor Smith"
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
								placeholder="taylor@local.test"
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="password">Temporary password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								required
								minLength={8}
								placeholder="At least 8 characters"
							/>
						</div>

						<div className="grid gap-1.5">
							<Label htmlFor="role">Role</Label>
							<Select value={role} onValueChange={(v) => setRole(v as ManagedUserRole)}>
								<SelectTrigger id="role">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="user">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{error ? (
							<div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{error}
							</div>
						) : null}

						{success ? (
							<div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
								{success}
							</div>
						) : null}

						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Adding user..." : "Add user"}
						</Button>
					</div>
				</form>

				<section className="surface-card overflow-hidden">
					<div className="border-b border-border px-6 py-4">
						<h2 className="text-lg font-semibold">Current users</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{users.length} total account{users.length === 1 ? "" : "s"}
						</p>
					</div>

					<div className="divide-y divide-border">
						{users.map((user) => (
							<article
								key={user.id}
								className="grid gap-3 px-6 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] sm:items-center"
							>
								<div>
									<p className="font-semibold">{user.name}</p>
									<p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
								</div>
								<div className="text-sm text-muted-foreground">
									<p>
										<span className="font-medium text-foreground">Role:</span> {user.role === "admin" ? "Admin" : "Member"}
									</p>
									<p className="mt-1">
										<span className="font-medium text-foreground">Password:</span>{" "}
										{user.mustChangePassword ? "Needs reset" : "Updated by user"}
									</p>
								</div>
								<div className="text-sm text-muted-foreground">
									<p>
										<span className="font-medium text-foreground">Invited by:</span> {user.invitedBy?.name ?? "Bootstrap"}
									</p>
									<p className="mt-1">
										<span className="font-medium text-foreground">Created:</span> {formatDate(user.createdAt)}
									</p>
								</div>
							</article>
						))}
					</div>
				</section>
			</section>
		</main>
	);
}
