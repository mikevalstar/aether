import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarFeedManager } from "#/components/calendar/CalendarFeedManager";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import { toast } from "#/components/ui/sonner";
import { getSession } from "#/lib/auth.functions";
import { type FeedSyncResult, syncCalendarFeedsNow } from "#/lib/calendar/calendar.functions";
import type { CalendarFeed } from "#/lib/calendar/types";
import { testPushoverNotification } from "#/lib/notifications.functions";
import { getPreferencesPageData, updateUserPreferences, updateUserProfile } from "#/lib/preferences.functions";

const NO_TEMPLATES_FOLDER = "__bundled__";

export const Route = createFileRoute("/settings/preferences")({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async () => await getPreferencesPageData(),
	component: PreferencesPage,
});

function PreferencesPage() {
	const data = Route.useLoaderData();
	const router = useRouter();

	const [name, setName] = useState(data.name);
	const [isSavingProfile, setIsSavingProfile] = useState(false);

	const [templatesFolder, setTemplatesFolder] = useState(data.preferences.obsidianTemplatesFolder || NO_TEMPLATES_FOLDER);
	const [isSavingPrefs, setIsSavingPrefs] = useState(false);

	const [pushoverKey, setPushoverKey] = useState(data.preferences.pushoverUserKey || "");
	const [isSavingPushover, setIsSavingPushover] = useState(false);
	const [isTesting, setIsTesting] = useState(false);

	const [calendarFeeds, setCalendarFeeds] = useState<CalendarFeed[]>(data.preferences.calendarFeeds || []);
	const [isSavingCalendar, setIsSavingCalendar] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncResults, setSyncResults] = useState<FeedSyncResult[] | null>(null);

	const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSavingProfile(true);

		try {
			await updateUserProfile({ data: { name } });
			toast.success("Profile updated");
			router.invalidate();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleSavePreferences = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSavingPrefs(true);

		try {
			await updateUserPreferences({
				data: {
					obsidianTemplatesFolder: templatesFolder === NO_TEMPLATES_FOLDER ? undefined : templatesFolder,
				},
			});
			toast.success("Preferences saved");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save preferences");
		} finally {
			setIsSavingPrefs(false);
		}
	};

	const handleSavePushover = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSavingPushover(true);

		try {
			await updateUserPreferences({
				data: { pushoverUserKey: pushoverKey.trim() || undefined },
			});
			toast.success("Pushover settings saved");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to save Pushover settings");
		} finally {
			setIsSavingPushover(false);
		}
	};

	const handleTestPushover = async () => {
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
		<main className="page-wrap px-4 pb-12 pt-10">
			<section className="mb-8 max-w-2xl">
				<p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Account Settings</p>
				<h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">Preferences</h1>
				<p className="mt-2 text-sm text-muted-foreground">Manage your profile and application settings.</p>
			</section>

			<form onSubmit={handleSaveProfile} className="surface-card mb-6 max-w-2xl p-6">
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

					<Button type="submit" disabled={isSavingProfile}>
						{isSavingProfile ? "Saving..." : "Save profile"}
					</Button>
				</div>
			</form>

			{data.obsidianFolders.length > 0 && (
				<form onSubmit={handleSavePreferences} className="surface-card max-w-2xl p-6">
					<h2 className="mb-4 text-lg font-semibold">Obsidian</h2>
					<div className="grid gap-4">
						<div className="grid gap-1.5">
							<Label>Templates folder</Label>
							<Select value={templatesFolder} onValueChange={setTemplatesFolder}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose a folder" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_TEMPLATES_FOLDER}>Bundled templates (default)</SelectItem>
									{data.obsidianFolders
										.filter((f) => f !== "")
										.map((f) => (
											<SelectItem key={f} value={f}>
												{f}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Choose a folder in your Obsidian vault to use as the template source when creating new files.
							</p>
						</div>

						<Button type="submit" disabled={isSavingPrefs}>
							{isSavingPrefs ? "Saving..." : "Save preferences"}
						</Button>
					</div>
				</form>
			)}
			<form onSubmit={handleSavePushover} className="surface-card mt-6 max-w-2xl p-6">
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
						<Button type="submit" disabled={isSavingPushover}>
							{isSavingPushover ? "Saving..." : "Save"}
						</Button>
						<Button type="button" variant="outline" disabled={isTesting || !pushoverKey.trim()} onClick={handleTestPushover}>
							{isTesting ? "Sending..." : "Test send"}
						</Button>
					</div>
				</div>
			</form>

			<form
				onSubmit={async (e) => {
					e.preventDefault();
					setIsSavingCalendar(true);
					try {
						const invalidFeed = calendarFeeds.find((f) => !f.name.trim() || !f.url.trim());
						if (invalidFeed) {
							toast.error("Each calendar feed needs a name and URL");
							setIsSavingCalendar(false);
							return;
						}
						await updateUserPreferences({ data: { calendarFeeds } });
						toast.success("Calendar feeds saved");
						router.invalidate();
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Failed to save calendar feeds");
					} finally {
						setIsSavingCalendar(false);
					}
				}}
				className="surface-card mt-6 max-w-2xl p-6"
			>
				<h2 className="mb-1 text-lg font-semibold">Calendar Feeds</h2>
				<p className="mb-4 text-xs text-muted-foreground">
					Add iCal feed URLs to sync your calendars. Events will be available on the dashboard and to the AI.
				</p>

				<CalendarFeedManager feeds={calendarFeeds} onChange={setCalendarFeeds} />

				<div className="mt-4 flex gap-2">
					<Button type="submit" disabled={isSavingCalendar}>
						{isSavingCalendar ? "Saving..." : "Save calendar feeds"}
					</Button>
					{calendarFeeds.length > 0 && (
						<Button
							type="button"
							variant="outline"
							disabled={isSyncing}
							onClick={async () => {
								setIsSyncing(true);
								setSyncResults(null);
								try {
									const results = await syncCalendarFeedsNow();
									setSyncResults(results);
									const failed = results.filter((r) => !r.success);
									if (failed.length === 0) {
										toast.success(`Synced ${results.length} feed(s) successfully`);
									} else {
										toast.error(`${failed.length} feed(s) failed to sync`);
									}
								} catch (err) {
									toast.error(err instanceof Error ? err.message : "Sync failed");
								} finally {
									setIsSyncing(false);
								}
							}}
						>
							{isSyncing ? "Syncing..." : "Sync now"}
						</Button>
					)}
				</div>

				{syncResults && syncResults.length > 0 && (
					<div className="mt-3 rounded-md border border-border p-3">
						<p className="mb-2 text-xs font-medium text-muted-foreground">Sync results</p>
						<div className="grid gap-1.5">
							{syncResults.map((r) => (
								<div key={r.feedId} className="flex items-start gap-2 text-xs">
									<span className={r.success ? "text-green-600" : "text-destructive"}>{r.success ? "OK" : "ERR"}</span>
									<span className="font-medium">{r.feedName}</span>
									{r.success && <span className="text-muted-foreground">{r.eventCount} events</span>}
									{r.error && <span className="text-destructive">{r.error}</span>}
								</div>
							))}
						</div>
					</div>
				)}
			</form>
		</main>
	);
}
