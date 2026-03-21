import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Bell, BookOpen, Calendar, Columns3, KeyRound, MessageSquare, User } from "lucide-react";
import { getSession } from "#/lib/auth.functions";
import { getPreferencesPageData } from "#/lib/preferences.functions";

const NAV_ITEMS = [
  { to: "/settings/profile", label: "Profile", icon: User },
  { to: "/settings/chat", label: "Chat", icon: MessageSquare },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/settings/calendar", label: "Calendar", icon: Calendar },
  { to: "/settings/password", label: "Password", icon: KeyRound },
] as const;

const OBSIDIAN_NAV_ITEMS = [
  { to: "/settings/obsidian", label: "Obsidian", icon: BookOpen },
  { to: "/settings/board", label: "Board", icon: Columns3 },
] as const;

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

function SettingsLayout() {
  const data = Route.useLoaderData();
  const hasObsidian = data.obsidianFolders.length > 0;

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <section className="mb-6 max-w-4xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Account Settings</p>
        <h1 className="display-title text-3xl font-bold tracking-tight">Settings</h1>
      </section>

      {/* Mobile nav — horizontal scrollable strip */}
      <div className="mb-6 max-w-4xl md:hidden">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-teal-subtle hover:text-foreground [&.active]:bg-teal-subtle [&.active]:text-foreground"
              activeProps={{ className: "active" }}
            >
              {item.label}
            </Link>
          ))}
          {hasObsidian &&
            OBSIDIAN_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-teal-subtle hover:text-foreground [&.active]:bg-teal-subtle [&.active]:text-foreground"
                activeProps={{ className: "active" }}
              >
                {item.label}
              </Link>
            ))}
        </nav>
      </div>

      <div className="flex max-w-4xl gap-8">
        {/* Desktop sidebar nav */}
        <nav className="hidden w-48 shrink-0 md:block">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-teal-subtle hover:text-foreground [&.active]:border-teal [&.active]:bg-teal-subtle [&.active]:text-foreground"
                  activeProps={{ className: "active" }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            ))}
            {hasObsidian && (
              <>
                <li className="my-2 border-t border-border" />
                {OBSIDIAN_NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-teal-subtle hover:text-foreground [&.active]:border-teal [&.active]:bg-teal-subtle [&.active]:text-foreground"
                      activeProps={{ className: "active" }}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </>
            )}
          </ul>
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
