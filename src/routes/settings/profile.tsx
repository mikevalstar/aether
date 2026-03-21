import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
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
    <form onSubmit={handleSave} className="surface-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pref-name">Name</Label>
          <Input id="pref-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pref-email">Email</Label>
          <Input id="pref-email" type="email" value={data.email} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pref-timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="pref-timezone" className="w-full">
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
          <p className="text-xs text-muted-foreground">Used for calendar events and time-related AI responses.</p>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
