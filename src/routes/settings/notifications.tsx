import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FieldRow } from "#/components/ui/field-row";
import { Input } from "#/components/ui/input";
import { SectionLabel } from "#/components/ui/section-label";
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
    <form onSubmit={handleSave} className="surface-card flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-1.5">
        <SectionLabel icon={Bell}>Push Notifications</SectionLabel>
        <p className="text-sm text-muted-foreground">
          Configure Pushover for phone delivery and pick the minimum level that triggers a push.
        </p>
      </header>

      <FieldRow
        label="PUSHOVER USER KEY"
        htmlFor="pref-pushover-key"
        hint={
          <a
            href="https://pushover.net"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[var(--accent)]"
          >
            pushover.net
          </a>
        }
      >
        <Input
          id="pref-pushover-key"
          type="text"
          className="font-mono text-[12.5px]"
          value={pushoverKey}
          onChange={(e) => setPushoverKey(e.target.value)}
          placeholder="Your Pushover user key"
        />
        <p className="text-xs text-muted-foreground">Leave blank to disable phone push notifications.</p>
      </FieldRow>

      <FieldRow label="MINIMUM LEVEL FOR PUSH" htmlFor="pref-push-min-level">
        <Select value={pushMinLevel} onValueChange={setPushMinLevel}>
          <SelectTrigger id="pref-push-min-level" className="w-full max-w-md font-mono text-[12.5px]">
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
          Notifications at or above this level will automatically push to your phone. Tasks and workflows can also force push
          regardless of this setting.
        </p>
      </FieldRow>

      <div className="mt-1 flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" disabled={isTesting || !pushoverKey.trim()} onClick={handleTest}>
          {isTesting ? "Sending..." : "Test send"}
        </Button>
      </div>
    </form>
  );
}
