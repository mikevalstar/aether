import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlarmClock,
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronDown,
  CircuitBoard,
  Eye,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLogo } from "#/components/AppLogo";
import CommandKButton from "#/components/CommandKButton";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "#/components/ui/sheet";
import { authClient } from "#/lib/auth-client";
import { plugins } from "#/plugins";
import { getEnabledPluginIds } from "#/plugins/plugins.functions";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
  auth: boolean;
}

const primaryLinks: NavLink[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
  { to: "/chat", label: "Chat", icon: MessageSquare, auth: true },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, auth: true },
  { to: "/workflows", label: "Workflows", icon: GitBranch, auth: true },
  { to: "/triggers", label: "Triggers", icon: Zap, auth: true },
  { to: "/o", label: "Obsidian", icon: BookOpen, auth: true },
];

const systemLinks: NavLink[] = [
  { to: "/activity", label: "Activity", icon: Activity, auth: true },
  { to: "/usage", label: "Usage", icon: BarChart3, auth: true },
  { to: "/scheduled-notifications", label: "Scheduled", icon: AlarmClock, auth: true },
  { to: "/logs", label: "Logs", icon: ScrollText, auth: true },
  { to: "/chat-debug", label: "Chat Debug", icon: CircuitBoard, auth: true },
  { to: "/requirements", label: "Requirements", icon: FileText, auth: true },
];

const publicLinks: NavLink[] = [{ to: "/", label: "Home", icon: LayoutDashboard, auth: false }];

interface HeaderProps {
  serverSession?: {
    user: { name: string | null; email: string; image?: string | null; role?: string | null };
    session?: { impersonatedBy?: string | null };
  } | null;
}

export default function Header({ serverSession }: HeaderProps) {
  const { data: clientSession } = authClient.useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatHeaderExpanded, setChatHeaderExpanded] = useState(false);
  const routerState = useRouterState();

  // Close mobile menu / chat overlay on navigation
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on pathname change
  useEffect(() => {
    setMobileOpen(false);
    setChatHeaderExpanded(false);
  }, [routerState.location.pathname]);

  const chatNavRef = useRef<HTMLDivElement>(null);
  const chatToggleRef = useRef<HTMLButtonElement>(null);

  // Close chat overlay when tapping anywhere outside the nav panel or toggle button
  useEffect(() => {
    if (!chatHeaderExpanded) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (chatNavRef.current?.contains(target)) return;
      if (chatToggleRef.current?.contains(target)) return;
      setChatHeaderExpanded(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [chatHeaderExpanded]);

  const router = useRouter();

  // Prefer client session (reactive) once available, fall back to server session for SSR
  const session = clientSession ?? serverSession;
  const isAuthed = !!session?.user;
  const isImpersonating = !!session?.session?.impersonatedBy;
  const routerPath = routerState.location.pathname;
  const isChatRoute = routerPath.startsWith("/chat");

  // Check if any system link is currently active
  const systemIsActive = systemLinks.some((link) => routerPath.startsWith(link.to));

  // Fetch enabled plugin IDs
  const [enabledPluginIds, setEnabledPluginIds] = useState<string[]>([]);
  useEffect(() => {
    if (!isAuthed) return;
    getEnabledPluginIds()
      .then(setEnabledPluginIds)
      .catch(() => setEnabledPluginIds([]));
  }, [isAuthed]);

  // Build plugin page links from enabled plugins that define pages
  const pluginPageLinks = useMemo(() => {
    return plugins
      .filter((p) => p.client?.pages?.length && enabledPluginIds.includes(p.meta.id))
      .flatMap((p) =>
        (p.client?.pages ?? []).map((page) => ({
          to: `/p/${p.meta.id}${(p.client?.pages?.length ?? 0) > 1 ? `/${page.id}` : ""}`,
          label: page.label,
          icon: page.icon ?? p.meta.icon,
          pluginId: p.meta.id,
        })),
      );
  }, [enabledPluginIds]);

  const pluginsIsActive = pluginPageLinks.some((link) => routerPath.startsWith(link.to));

  // When logged in: show primary + system links. When not: show public links only.
  const visiblePrimary = isAuthed ? primaryLinks : publicLinks;

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--top-bar-bg)] pt-[env(safe-area-inset-top)] ${isChatRoute ? "border-b-0 lg:border-b lg:border-[var(--line-strong)]" : "border-b border-[var(--line-strong)]"}`}
      data-chat-route={isChatRoute || undefined}
    >
      {/* Impersonation banner */}
      {isImpersonating && <ImpersonationBanner userName={session?.user.name} router={router} />}

      {/* Mobile chat: collapsed accent bar */}
      {isChatRoute && (
        <button
          ref={chatToggleRef}
          type="button"
          className="flex w-full items-center justify-center gap-2 py-1.5 lg:hidden"
          onClick={() => setChatHeaderExpanded((v) => !v)}
          aria-label="Show navigation"
        >
          <AppLogo markClassName="size-6 rounded-md" />
          <ChevronDown
            className={`size-3 text-[var(--accent)] transition-transform duration-150 ${chatHeaderExpanded ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {/* Mobile chat: expanded overlay nav */}
      {isChatRoute && chatHeaderExpanded && (
        <div
          ref={chatNavRef}
          className="absolute left-0 right-0 top-full z-[70] overflow-hidden border-b border-[var(--accent)]/20 bg-[var(--header-bg)] shadow-xl backdrop-blur-md lg:hidden animate-in slide-in-from-top-2 fade-in duration-200"
        >
          {/* Primary nav grid */}
          <div className="grid grid-cols-3 gap-1 px-3 pt-3 pb-2">
            {visiblePrimary.map((link, i) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 no-underline transition-colors hover:bg-[var(--accent-subtle)] active:scale-95"
                activeProps={{
                  className:
                    "group flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 no-underline bg-[var(--accent-subtle)] active:scale-95",
                }}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/15 group-[[class*=bg-\\[var]]:bg-[var(--accent)]/15">
                  <link.icon className="size-5" />
                </div>
                <span className="text-[11px] font-semibold text-[var(--ink-soft)] group-hover:text-[var(--ink)]">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Plugins section */}
          {isAuthed && pluginPageLinks.length > 0 && (
            <>
              <div className="mx-4 border-t border-[var(--line)]/60" />
              <div className="px-3 pt-2 pb-3">
                <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-dim)]">Plugins</p>
                <div className="flex flex-wrap gap-1">
                  {pluginPageLinks.map((link, i) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] no-underline transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--ink)]"
                      activeProps={{
                        className:
                          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)] no-underline",
                      }}
                      style={{ animationDelay: `${(visiblePrimary.length + i) * 30}ms` }}
                    >
                      <link.icon className="size-3.5" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* System section */}
          {isAuthed && (
            <>
              <div className="mx-4 border-t border-[var(--line)]/60" />
              <div className="px-3 pt-2 pb-3">
                <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-dim)]">System</p>
                <div className="flex flex-wrap gap-1">
                  {systemLinks.map((link, i) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] no-underline transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--ink)]"
                      activeProps={{
                        className:
                          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[var(--accent-subtle)] text-[var(--accent)] no-underline",
                      }}
                      style={{ animationDelay: `${(visiblePrimary.length + pluginPageLinks.length + i) * 30}ms` }}
                    >
                      <link.icon className="size-3.5" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer: theme + sign out */}
          <div className="flex items-center justify-between border-t border-[var(--line)]/60 px-4 py-2">
            <ThemeToggle />
            {isAuthed && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void authClient.signOut()}
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full nav bar: always visible on desktop, hidden on mobile for chat route.
          Layout matches the redesign artifact: fixed 48px height, brand on the
          left, UPPERCASE pill nav, status indicators on the right, then the
          theme toggle / ⌘K pill / square avatar. */}
      <nav className={`flex h-12 items-center gap-3 px-5 ${isChatRoute ? "hidden lg:flex" : "flex"}`}>
        {/* Brand — links to dashboard when authed, home when not */}
        <Link
          to={isAuthed ? "/dashboard" : "/"}
          className="rounded-[9px] no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Aether home"
        >
          <AppLogo markClassName="size-7 rounded-md" />
        </Link>

        {/* Desktop nav pills */}
        <div className="ml-3 hidden items-center gap-0.5 md:flex">
          {visiblePrimary.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="nav-link"
              activeProps={{ className: "nav-link is-active" }}
            >
              {link.label}
            </Link>
          ))}

          {/* Plugins dropdown — only when authed and plugins have pages */}
          {isAuthed && pluginPageLinks.length > 0 && (
            <NavDropdown label="Plugins" active={pluginsIsActive} links={pluginPageLinks} />
          )}

          {/* System dropdown — only when authed */}
          {isAuthed && <NavDropdown label="System" active={systemIsActive} links={systemLinks} />}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthed && <CommandKButton />}
          {isAuthed && <NotificationBell />}
          {isAuthed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="User menu"
                  className="grid size-7 place-items-center rounded-[var(--radius-xs)] bg-[var(--accent)] text-[10px] font-bold uppercase tracking-wide text-[var(--accent-foreground)] outline-none transition-colors hover:bg-[var(--accent-hover)] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {session.user.image ? (
                    <Avatar size="sm" className="size-7 rounded-[var(--radius-xs)]">
                      <AvatarImage src={session.user.image} alt={session.user.name ?? ""} className="rounded-[var(--radius-xs)]" />
                      <AvatarFallback className="rounded-[var(--radius-xs)] bg-[var(--accent)] text-[10px] text-[var(--accent-foreground)]">
                        {getInitials(session.user.name, session.user.email)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    getInitials(session.user.name, session.user.email)
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium text-foreground">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void navigate({ to: "/settings/profile" })}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                {session.user.role === "admin" && (
                  <DropdownMenuItem onSelect={() => void navigate({ to: "/users" })}>
                    <Users className="mr-2 size-4" />
                    Users
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void authClient.signOut()}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/login" className="no-underline">
                Sign in
              </Link>
            </Button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </nav>

      {/* Mobile nav sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>
              <AppLogo />
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col py-2">
            {visiblePrimary.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
                activeProps={{
                  className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
                }}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            ))}

            {isAuthed && pluginPageLinks.length > 0 && (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Plugins</p>
                {pluginPageLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
                    activeProps={{
                      className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
                    }}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                ))}
              </>
            )}

            {isAuthed && (
              <>
                <div className="my-2 border-t border-border" />
                <p className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">System</p>
                {systemLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
                    activeProps={{
                      className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
                    }}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                ))}
                <div className="my-2 border-t border-border" />
                <Link
                  to="/settings/profile"
                  className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
                  activeProps={{
                    className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
                  }}
                >
                  <Settings className="size-4" />
                  Settings
                </Link>
                {session.user.role === "admin" && (
                  <Link
                    to="/users"
                    className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2"
                    activeProps={{
                      className: "nav-link-mobile is-active px-4 py-2.5 text-sm font-medium flex items-center gap-2",
                    }}
                  >
                    <Users className="size-4" />
                    Users
                  </Link>
                )}
                <button
                  type="button"
                  className="nav-link-mobile px-4 py-2.5 text-sm font-medium flex items-center gap-2 text-left w-full"
                  onClick={() => void authClient.signOut()}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function NavDropdown({
  label,
  active,
  links,
}: {
  label: string;
  active: boolean;
  links: { to: string; label: string; icon: LucideIcon }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`nav-link ${active ? "is-active" : ""}`}>
          {label}
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-52 rounded-[var(--radius-sm)] border-[var(--line-strong)] bg-[var(--surface)] p-1 shadow-lg"
      >
        <div className="px-2 pt-1.5 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--ink-dim)]">
          {label}
        </div>
        {links.map((link) => (
          <DropdownMenuItem
            key={link.to}
            asChild
            className="rounded-[var(--radius-xs)] px-2 py-1.5 text-[12.5px] font-medium text-[var(--ink-soft)] focus:bg-[var(--accent-subtle)] focus:text-[var(--accent)]"
          >
            <Link to={link.to} className="flex items-center gap-2 no-underline">
              <span className="grid size-5 place-items-center rounded-[var(--radius-xs)] bg-[var(--accent-subtle)] text-[var(--accent)]">
                <link.icon className="size-3.5" />
              </span>
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ImpersonationBanner({
  userName,
  router,
}: {
  userName: string | null | undefined;
  router: ReturnType<typeof useRouter>;
}) {
  const [isStopping, setIsStopping] = useState(false);

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      await router.invalidate();
      await router.navigate({ to: "/users" });
    } catch {
      setIsStopping(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-xs font-medium text-amber-950">
      <Eye className="size-3.5" />
      <span>
        Impersonating <strong>{userName ?? "user"}</strong>
      </span>
      <button
        type="button"
        onClick={handleStop}
        disabled={isStopping}
        className="rounded bg-amber-950/20 px-2 py-0.5 font-semibold transition-colors hover:bg-amber-950/30 disabled:opacity-50"
      >
        {isStopping ? "Stopping..." : "Stop impersonating"}
      </button>
    </div>
  );
}
