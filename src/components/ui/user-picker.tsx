import { createServerFn } from "@tanstack/react-start";
import { CheckIcon, ChevronsUpDown, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "#/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { prisma } from "#/db";
import { ensureSession } from "#/lib/auth.functions";
import { cn } from "#/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────

export type PickerUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

type UserPickerProps = {
  /** Current value: array of email addresses, or ["all"] */
  value: string[];
  /** Called with updated array of emails or ["all"] */
  onChange: (value: string[]) => void;
  /** Placeholder text when nothing selected */
  placeholder?: string;
  className?: string;
};

// ─── Server function ────────────────────────────────────────────────────

export const listPickerUsers = createServerFn({ method: "GET" }).handler(async (): Promise<PickerUser[]> => {
  await ensureSession();

  const users = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  return users;
});

// ─── Component ──────────────────────────────────────────────────────────

export function UserPicker({ value, onChange, placeholder = "Select users...", className }: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<PickerUser[]>([]);
  const [loaded, setLoaded] = useState(false);

  const isAll = value.length === 1 && value[0] === "all";
  const selectedEmails = isAll ? [] : value;

  // Load users on first open
  useEffect(() => {
    if (open && !loaded) {
      listPickerUsers().then((u) => {
        setUsers(u);
        setLoaded(true);
      });
    }
  }, [open, loaded]);

  const toggleAll = useCallback(() => {
    if (isAll) {
      onChange([]);
    } else {
      onChange(["all"]);
    }
  }, [isAll, onChange]);

  const toggleUser = useCallback(
    (email: string) => {
      if (isAll) {
        // Switching from "all" to specific — select everyone except this one
        const allExcept = users.filter((u) => u.email !== email).map((u) => u.email);
        onChange(allExcept);
        return;
      }

      if (selectedEmails.includes(email)) {
        onChange(selectedEmails.filter((e) => e !== email));
      } else {
        const next = [...selectedEmails, email];
        // If all users are now selected, switch to "all"
        if (users.length > 0 && next.length === users.length) {
          onChange(["all"]);
        } else {
          onChange(next);
        }
      }
    },
    [isAll, selectedEmails, users, onChange],
  );

  const displayLabel = useMemo(() => {
    if (isAll) return "All users";
    if (selectedEmails.length === 0) return null;
    if (selectedEmails.length === 1) {
      const user = users.find((u) => u.email === selectedEmails[0]);
      return user?.name ?? selectedEmails[0];
    }
    return `${selectedEmails.length} users`;
  }, [isAll, selectedEmails, users]);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal text-sm",
            !displayLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>

            <CommandGroup>
              <CommandItem onSelect={toggleAll} className="gap-2">
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    isAll ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]",
                  )}
                >
                  {isAll && <CheckIcon className="size-3 text-white" />}
                </div>
                <Users className="size-4 text-[var(--ink-soft)]" />
                <span className="font-medium">All users</span>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Users">
              {users.map((user) => {
                const isSelected = isAll || selectedEmails.includes(user.email);
                return (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    onSelect={() => toggleUser(user.email)}
                    className="gap-2"
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded border",
                        isSelected ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]",
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3 text-white" />}
                    </div>
                    {user.image ? (
                      <img src={user.image} alt="" className="size-5 rounded-full" />
                    ) : (
                      <div className="flex size-5 items-center justify-center rounded-full bg-[var(--teal-subtle)] text-[8px] font-bold text-[var(--teal)]">
                        {initials(user.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{user.name}</p>
                      <p className="truncate text-[11px] text-[var(--ink-soft)]">{user.email}</p>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
