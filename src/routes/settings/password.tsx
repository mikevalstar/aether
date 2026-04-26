import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertHeader } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
import { toast } from "#/components/ui/sonner";
import { changeOwnPassword, getPasswordSettingsData } from "#/lib/user-management.functions";

export const Route = createFileRoute("/settings/password")({
  loader: async () => await getPasswordSettingsData(),
  component: PasswordSection,
});

function PasswordSection() {
  const settings = Route.useLoaderData();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

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
      toast.success("Password updated");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {settings.mustChangePassword && (
        <Alert variant="warning">
          <AlertHeader label="Temporary password" />
          <AlertDescription>
            This account is still using a temporary password. Change it now to finish setup.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="surface-card flex flex-col gap-5 p-6">
        <header className="flex flex-col gap-1.5">
          <SectionLabel icon={KeyRound}>Change Password</SectionLabel>
          <p className="text-sm text-muted-foreground">Updating will sign you out of any other active sessions.</p>
        </header>

        <FieldRow label="CURRENT PASSWORD" required htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            className="font-mono text-[12.5px]"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            placeholder="••••••••"
          />
        </FieldRow>

        <FieldRow label="NEW PASSWORD" required hint={<span>min 8 chars</span>} htmlFor="new-password">
          <Input
            id="new-password"
            type="password"
            className="font-mono text-[12.5px]"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
          />
        </FieldRow>

        <FieldRow label="CONFIRM NEW PASSWORD" required htmlFor="confirm-password">
          <Input
            id="confirm-password"
            type="password"
            className="font-mono text-[12.5px]"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
          />
        </FieldRow>

        {error && (
          <Alert variant="destructive">
            <AlertHeader label="Error" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-1 w-fit">
          {isSubmitting ? "Updating password..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
