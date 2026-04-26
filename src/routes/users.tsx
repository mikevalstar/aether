import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { EyeIcon, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/PageHeader";
import { Alert, AlertDescription, AlertHeader } from "#/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { getSession } from "#/lib/auth.functions";
import { authClient } from "#/lib/auth-client";
import { formatDate } from "#/lib/date";
import {
  createManagedUser,
  getUsersPageData,
  type ManagedUserRole,
  removeManagedUser,
} from "#/lib/user-management.functions";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await createManagedUser({
        data: { name, email, password, role },
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
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
    <PageHeader
      icon={Users}
      label="Invite-only Access"
      title="Users"
      description="Accounts are created by admins here instead of public signup. If someone does not have a real inbox yet, use a placeholder like name@local.test and have them change their password after first login."
      actions={
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-[11px] tracking-wide text-[var(--ink-dim)]">
          SIGNED IN AS <span className="font-semibold text-[var(--ink)]">{currentUser.email}</span>
        </div>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="surface-card flex flex-col gap-4 p-6">
          <header className="flex flex-col gap-1.5">
            <SectionLabel icon={UserPlus}>ADD USER</SectionLabel>
            <p className="text-sm text-muted-foreground">
              New accounts start as invite-only users with a temporary password.
            </p>
          </header>

          <FieldRow label="NAME" required>
            <Input
              id="name"
              type="text"
              className="font-mono text-[12.5px]"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Taylor Smith"
            />
          </FieldRow>

          <FieldRow label="EMAIL" required>
            <Input
              id="email"
              type="email"
              className="font-mono text-[12.5px]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="taylor@local.test"
            />
          </FieldRow>

          <FieldRow label="TEMPORARY PASSWORD" required hint={<span>min 8 chars</span>}>
            <Input
              id="password"
              type="password"
              className="font-mono text-[12.5px]"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </FieldRow>

          <FieldRow label="ROLE">
            <Select value={role} onValueChange={(v) => setRole(v as ManagedUserRole)}>
              <SelectTrigger id="role" className="w-full font-mono text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          {error && (
            <Alert variant="destructive">
              <AlertHeader label="Error" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
            {isSubmitting ? "Adding user..." : "Add user"}
          </Button>
        </form>

        <section className="surface-card overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
            <div className="flex flex-col gap-1.5">
              <SectionLabel icon={Users}>CURRENT USERS</SectionLabel>
              <p className="text-sm text-muted-foreground">
                {users.length} total account{users.length === 1 ? "" : "s"}
              </p>
            </div>
          </header>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Invited by</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">{user.role === "admin" ? "Admin" : "Member"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.mustChangePassword ? "Needs reset" : "Updated by user"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.invitedBy?.name ?? "Bootstrap"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {user.id !== currentUser.id && <ImpersonateButton userId={user.id} userName={user.name} />}
                      {user.id !== currentUser.id && <RemoveUserButton userId={user.id} userName={user.name} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </section>
    </PageHeader>
  );
}

function FieldRow({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] font-semibold tracking-[0.15em] text-[var(--ink-soft)]">{label}</span>
        {required && <span className="font-mono text-[11px] leading-none text-[var(--destructive)]">*</span>}
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

function ImpersonateButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);

  const handleImpersonate = async () => {
    setIsImpersonating(true);
    try {
      const { error } = await authClient.admin.impersonateUser({ userId });
      if (error) {
        toast.error("Failed to impersonate", {
          description: error.message ?? "Something went wrong",
        });
        return;
      }
      toast.success(`Now impersonating ${userName}`);
      await router.invalidate();
      await router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("Failed to impersonate", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsImpersonating(false);
    }
  };

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-[var(--accent)] hover:text-[var(--accent-hover)]">
              <EyeIcon className="size-4" />
              <span className="sr-only">Impersonate {userName}</span>
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Impersonate</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Impersonate {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be logged in as {userName} and see the app from their perspective. You can stop impersonating at any
            time from the banner at the top of the page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleImpersonate} disabled={isImpersonating}>
            {isImpersonating ? "Switching..." : "Impersonate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RemoveUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeManagedUser({ data: { userId } });
      toast.success("User removed", {
        description: `${userName} has been removed.`,
      });
      await router.invalidate();
    } catch (err) {
      toast.error("Failed to remove user", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
              <span className="sr-only">Remove {userName}</span>
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Remove</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this user account, their sessions, and associated data. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? "Removing..." : "Remove user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
