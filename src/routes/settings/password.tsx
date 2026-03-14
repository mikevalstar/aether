import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	changeOwnPassword,
	getPasswordSettingsData,
} from "#/lib/user-management.functions";

export const Route = createFileRoute("/settings/password")({
	loader: async () => await getPasswordSettingsData(),
	component: PasswordSettingsPage,
});

function PasswordSettingsPage() {
	const settings = Route.useLoaderData();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setSuccess("");

		if (newPassword !== confirmPassword) {
			setError("New passwords do not match");
			return;
		}

		setIsSubmitting(true);

		try {
			await changeOwnPassword({
				data: {
					currentPassword,
					newPassword,
					revokeOtherSessions: true,
				},
			});
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setSuccess("Password updated.");
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Failed to change password",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-8 max-w-2xl">
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--teal)]">
					Account Settings
				</p>
				<h1 className="display-title text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
					Change password
				</h1>
				<p className="mt-2 text-sm text-[var(--ink-soft)]">
					Use this page to replace the temporary password your admin shared with
					you or rotate your current one.
				</p>
				{settings.mustChangePassword ? (
					<div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						This account is still using a temporary password. Change it now to
						finish setup.
					</div>
				) : null}
			</section>

			<form onSubmit={handleSubmit} className="surface-card max-w-2xl p-6">
				<div className="grid gap-4">
					<Field label="Current password" htmlFor="current-password">
						<input
							id="current-password"
							type="password"
							value={currentPassword}
							onChange={(event) => setCurrentPassword(event.target.value)}
							required
							className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
						/>
					</Field>

					<Field label="New password" htmlFor="new-password">
						<input
							id="new-password"
							type="password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							required
							minLength={8}
							className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
						/>
					</Field>

					<Field label="Confirm new password" htmlFor="confirm-password">
						<input
							id="confirm-password"
							type="password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							required
							minLength={8}
							className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
						/>
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
						{isSubmitting ? "Updating password..." : "Update password"}
					</button>
				</div>
			</form>
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
