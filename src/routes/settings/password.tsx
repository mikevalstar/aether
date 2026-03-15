import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "#/components/ui/sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { getSession } from "#/lib/auth.functions";
import {
	changeOwnPassword,
	getPasswordSettingsData,
} from "#/lib/user-management.functions";

export const Route = createFileRoute("/settings/password")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
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
			setSuccess("");
			toast.success("Password updated");
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
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
					Account Settings
				</p>
				<h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">
					Change password
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
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
					<div className="grid gap-1.5">
						<Label htmlFor="current-password">Current password</Label>
						<Input
							id="current-password"
							type="password"
							value={currentPassword}
							onChange={(event) => setCurrentPassword(event.target.value)}
							required
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="new-password">New password</Label>
						<Input
							id="new-password"
							type="password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							required
							minLength={8}
						/>
					</div>

					<div className="grid gap-1.5">
						<Label htmlFor="confirm-password">Confirm new password</Label>
						<Input
							id="confirm-password"
							type="password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							required
							minLength={8}
						/>
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
						{isSubmitting ? "Updating password..." : "Update password"}
					</Button>
				</div>
			</form>
		</main>
	);
}
