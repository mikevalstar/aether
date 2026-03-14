import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	createManagedUser,
	getUsersPageData,
	type ManagedUserRole,
} from "#/lib/user-management.functions";

export const Route = createFileRoute("/users")({
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
			setSuccess(
				"User added. Share the email and temporary password with them.",
			);
			await router.invalidate();
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Failed to add user",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--teal)]">
						Invite-only Access
					</p>
					<h1 className="display-title text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
						Users
					</h1>
					<p className="mt-2 max-w-2xl text-sm text-[var(--ink-soft)]">
						Accounts are created by admins here instead of public signup. If
						someone does not have a real inbox yet, use a placeholder like
						`name@local.test` and have them change their password after first
						login.
					</p>
				</div>
				<div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink-soft)]">
					Signed in as{" "}
					<span className="font-semibold text-[var(--ink)]">
						{currentUser.email}
					</span>
				</div>
			</section>

			<section className="mb-8 grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
				<form onSubmit={handleSubmit} className="surface-card p-6">
					<h2 className="text-lg font-semibold text-[var(--ink)]">Add user</h2>
					<p className="mt-1 text-sm text-[var(--ink-soft)]">
						New accounts start as invite-only users with a temporary password.
					</p>

					<div className="mt-5 grid gap-4">
						<Field label="Name" htmlFor="name">
							<input
								id="name"
								type="text"
								value={name}
								onChange={(event) => setName(event.target.value)}
								required
								placeholder="Taylor Smith"
								className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
							/>
						</Field>

						<Field label="Email" htmlFor="email">
							<input
								id="email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
								placeholder="taylor@local.test"
								className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
							/>
						</Field>

						<Field label="Temporary password" htmlFor="password">
							<input
								id="password"
								type="password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								required
								minLength={8}
								placeholder="At least 8 characters"
								className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
							/>
						</Field>

						<Field label="Role" htmlFor="role">
							<select
								id="role"
								value={role}
								onChange={(event) =>
									setRole(event.target.value as ManagedUserRole)
								}
								className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
							>
								<option value="user">Member</option>
								<option value="admin">Admin</option>
							</select>
						</Field>

						{error ? (
							<div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</div>
						) : null}

						{success ? (
							<div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
								{success}
							</div>
						) : null}

						<button
							type="submit"
							disabled={isSubmitting}
							className="h-10 rounded-md bg-[var(--teal)] px-4 text-sm font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isSubmitting ? "Adding user..." : "Add user"}
						</button>
					</div>
				</form>

				<section className="surface-card overflow-hidden">
					<div className="border-b border-[var(--line)] px-6 py-4">
						<h2 className="text-lg font-semibold text-[var(--ink)]">
							Current users
						</h2>
						<p className="mt-1 text-sm text-[var(--ink-soft)]">
							{users.length} total account{users.length === 1 ? "" : "s"}
						</p>
					</div>

					<div className="divide-y divide-[var(--line)]">
						{users.map((user) => (
							<article
								key={user.id}
								className="grid gap-3 px-6 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] sm:items-center"
							>
								<div>
									<p className="font-semibold text-[var(--ink)]">{user.name}</p>
									<p className="mt-1 text-sm text-[var(--ink-soft)]">
										{user.email}
									</p>
								</div>
								<div className="text-sm text-[var(--ink-soft)]">
									<p>
										<span className="font-medium text-[var(--ink)]">Role:</span>{" "}
										{user.role === "admin" ? "Admin" : "Member"}
									</p>
									<p className="mt-1">
										<span className="font-medium text-[var(--ink)]">
											Password:
										</span>{" "}
										{user.mustChangePassword
											? "Needs reset"
											: "Updated by user"}
									</p>
								</div>
								<div className="text-sm text-[var(--ink-soft)]">
									<p>
										<span className="font-medium text-[var(--ink)]">
											Invited by:
										</span>{" "}
										{user.invitedBy?.name ?? "Bootstrap"}
									</p>
									<p className="mt-1">
										<span className="font-medium text-[var(--ink)]">
											Created:
										</span>{" "}
										{new Date(user.createdAt).toLocaleDateString()}
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

function Field(props: {
	label: string;
	htmlFor: string;
	children: React.ReactNode;
}) {
	return (
		<label htmlFor={props.htmlFor} className="grid gap-1.5 text-sm">
			<span className="font-medium text-[var(--ink)]">{props.label}</span>
			{props.children}
		</label>
	);
}
