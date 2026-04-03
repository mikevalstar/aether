import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { testPushoverNotification } from "#/lib/notifications.functions";
import { updateUserPreferences } from "#/lib/preferences.functions";

const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/notifications")({
  component: NotificationsSection,
});

const PUSH_LEVEL_OPTIONS = [
  { value: "info", label: "Info — push for all notifications" },
  { value: "low", label: "Low — push for low and above" },
  { value: "medium", label: "Medium — push for medium and above" },
  { value: "high", label: "High — push for high and above" },
  { value: "critical", label: "Critical — push only for critical (default)" },
] as const;

function NotificationsSection() {
  const data = settingsRoute.useLoaderData();

  const [pushoverKey, setPushoverKey] = useState(data.preferences.pushoverUserKey || "");
  const [pushMinLevel, setPushMinLevel] = useState<string>(data.preferences.pushNotificationMinLevel || "critical");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserPreferences({
        data: {
          pushoverUserKey: pushoverKey.trim() || undefined,
          pushNotificationMinLevel: pushMinLevel as "info" | "low" | "medium" | "high" | "critical",
        },
      });
      toast.success("Notification settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!pushoverKey.trim()) {
      toast.error("Enter a Pushover user key first");
      return;
    }
    setIsTesting(true);
    try {
      const result = await testPushoverNotification({ data: { userKey: pushoverKey.trim() } });
      if (result.success) {
        toast.success("Test notification sent! Check your phone.");
      } else {
        toast.error(result.error || "Failed to send test notification");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test notification");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="surface-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Push Notifications</h2>
      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pref-pushover-key">Pushover User Key</Label>
          <Input
            id="pref-pushover-key"
            type="text"
            value={pushoverKey}
            onChange={(e) => setPushoverKey(e.target.value)}
            placeholder="Your Pushover user key"
          />
          <p className="text-xs text-muted-foreground">
            Get your user key from{" "}
            <a href="https://pushover.net" target="_blank" rel="noopener noreferrer" className="underline">
              pushover.net
            </a>
            . Leave blank to disable phone push notifications.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pref-push-min-level">Minimum Level for Push</Label>
          <Select value={pushMinLevel} onValueChange={setPushMinLevel}>
            <SelectTrigger id="pref-push-min-level" className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PUSH_LEVEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Notifications at or above this level will automatically push to your phone. Tasks and workflows can also force
            push regardless of this setting.
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" disabled={isTesting || !pushoverKey.trim()} onClick={handleTest}>
            {isTesting ? "Sending..." : "Test send"}
          </Button>
        </div>
      </div>
    </form>
  );
}
