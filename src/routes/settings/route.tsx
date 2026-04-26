import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Bell, BookOpen, Calendar, KeyRound, MessageSquare, Puzzle, Settings as SettingsIcon, User } from "lucide-react";
import { GlowBg } from "#/components/ui/glow-bg";
import { SectionLabel } from "#/components/ui/section-label";
import { getSession } from "#/lib/auth.functions";
import { getPreferencesPageData } from "#/lib/preferences.functions";

const NAV_ITEMS = [
  { to: "/settings/profile", label: "Profile", icon: User },
  { to: "/settings/chat", label: "Chat", icon: MessageSquare },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/settings/calendar", label: "Calendar", icon: Calendar },
  { to: "/settings/password", label: "Password", icon: KeyRound },
] as const;

const OBSIDIAN_NAV_ITEMS = [{ to: "/settings/obsidian", label: "Obsidian", icon: BookOpen }] as const;

const PLUGIN_NAV_ITEMS = [{ to: "/settings/plugins", label: "Plugins", icon: Puzzle }] as const;

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async () => await getPreferencesPageData(),
  component: SettingsLayout,
});

const navLinkClass =
  "group flex items-center gap-2 border-l-2 border-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-dim)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] [&.active]:border-[var(--accent)] [&.active]:bg-[var(--surface)] [&.active]:text-[var(--ink)]";

const mobileNavLinkClass =
  "shrink-0 rounded-sm border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)] [&.active]:border-[var(--accent)] [&.active]:text-[var(--accent)]";

function SettingsLayout() {
  const data = Route.useLoaderData();
  const hasObsidian = data.obsidianFolders.length > 0;

  return (
    <main className="relative overflow-hidden">
      <GlowBg color="var(--accent)" size="size-[420px]" position="-right-48 -top-48" />

      <div className="page-wrap relative px-4 pb-10 pt-6 sm:pt-8">
        <section className="mb-6 border-b border-border-strong pb-5">
          <div className="relative pl-4">
            <span aria-hidden className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-(--accent)" />
            <SectionLabel icon={SettingsIcon}>Account Settings</SectionLabel>
            <h1 className="display-title mt-2 mb-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Profile, chat, notifications, integrations, and plugin configuration.
            </p>
          </div>
        </section>

        {/* Mobile nav — horizontal scrollable strip */}
        <div className="mb-6 md:hidden">
          <nav className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className={mobileNavLinkClass} activeProps={{ className: "active" }}>
                {item.label}
              </Link>
            ))}
            {hasObsidian &&
              OBSIDIAN_NAV_ITEMS.map((item) => (
                <Link key={item.to} to={item.to} className={mobileNavLinkClass} activeProps={{ className: "active" }}>
                  {item.label}
                </Link>
              ))}
            {PLUGIN_NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className={mobileNavLinkClass} activeProps={{ className: "active" }}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar nav */}
          <nav className="hidden w-52 shrink-0 md:block">
            <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-faint)]">
              General
            </p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={navLinkClass} activeProps={{ className: "active" }}>
                    <item.icon className="size-3.5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {hasObsidian && (
              <>
                <p className="mt-5 mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-faint)]">
                  Vault
                </p>
                <ul className="space-y-0.5">
                  {OBSIDIAN_NAV_ITEMS.map((item) => (
                    <li key={item.to}>
                      <Link to={item.to} className={navLinkClass} activeProps={{ className: "active" }}>
                        <item.icon className="size-3.5" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="mt-5 mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-faint)]">
              Extensions
            </p>
            <ul className="space-y-0.5">
              {PLUGIN_NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={navLinkClass} activeProps={{ className: "active" }}>
                    <item.icon className="size-3.5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content area */}
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}
