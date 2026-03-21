import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { toast } from "#/components/ui/sonner";
import { testPushoverNotification } from "#/lib/notifications.functions";
import { updateUserPreferences } from "#/lib/preferences.functions";

const settingsRoute = getRouteApi("/settings");

export const Route = createFileRoute("/settings/notifications")({
  component: NotificationsSection,
});

function NotificationsSection() {
  const data = settingsRoute.useLoaderData();

  const [pushoverKey, setPushoverKey] = useState(data.preferences.pushoverUserKey || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserPreferences({
        data: { pushoverUserKey: pushoverKey.trim() || undefined },
      });
      toast.success("Pushover settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Pushover settings");
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
