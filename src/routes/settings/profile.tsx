import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { updateUserPreferences, updateUserProfile } from "#/lib/preferences.functions";

const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSection,
});

function ProfileSection() {
  const data = settingsRoute.useLoaderData();
  const router = useRouter();

  const [name, setName] = useState(data.name);
  const [timezone, setTimezone] = useState(data.preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile({ data: { name } });
      await updateUserPreferences({ data: { timezone } });
      toast.success("Profile updated");
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="surface-card flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1.5">
        <SectionLabel icon={User}>Profile</SectionLabel>
        <p className="text-sm text-muted-foreground">Your name, email, and timezone.</p>
      </header>

      <FieldRow label="NAME" required htmlFor="pref-name">
        <Input
          id="pref-name"
          type="text"
          className="font-mono text-[12.5px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FieldRow>

      <FieldRow label="EMAIL" hint={<span>read-only</span>} htmlFor="pref-email">
        <Input id="pref-email" type="email" className="font-mono text-[12.5px] opacity-60" value={data.email} disabled />
      </FieldRow>

      <FieldRow label="TIMEZONE" hint={<span>used for AI + calendar</span>} htmlFor="pref-timezone">
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="pref-timezone" className="w-full font-mono text-[12.5px]">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {Intl.supportedValuesOf("timeZone").map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <Button type="submit" disabled={isSaving} className="mt-1 w-fit">
        {isSaving ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
