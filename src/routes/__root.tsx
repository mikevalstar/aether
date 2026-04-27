import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  createRootRoute,
  type ErrorComponentProps,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import CommandPalette from "../components/CommandPalette";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ThemeProvider from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { getSession } from "../lib/auth.functions";
import { ErrorBoundary, ErrorDisplay } from "../lib/error-display";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
  beforeLoad: async () => {
    const session = await getSession();
    return { session };
  },
  component: RootComponent,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "theme-color",
        content: "#7cb0ff",
      },
      {
        title: "Aether",
      },
      {
        httpEquiv: "X-Frame-Options",
        content: "DENY",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo192.png",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function NotFoundComponent() {
  return (
    <div className="page-wrap py-12">
      <div className="surface-card p-8 text-center">
        <h1 className="text-4xl font-display font-bold text-primary mb-2">404</h1>
        <p className="text-muted-foreground mb-6">This page doesn't exist.</p>
        <Link to="/" className="text-primary hover:underline text-sm font-medium">
          Go home
        </Link>
      </div>
    </div>
  );
}

function RootErrorComponent({ error }: ErrorComponentProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: intentional — router context may be unavailable during HMR error recovery
    router = useRouter();
  } catch {
    // Router context may be unavailable during HMR reloads
  }

  return (
    <div className="page-wrap py-12">
      <div className="surface-card overflow-hidden">
        <ErrorDisplay error={error} onRetry={() => (router ? router.invalidate() : window.location.reload())} />
      </div>
    </div>
  );
}

function RootComponent() {
  const { session } = Route.useRouteContext();
  const { pathname } = useLocation();

  // Routes that own their own chrome (full-bleed marketing/auth surfaces).
  // `/` is only chromeless when signed-out — the marketing landing page;
  // signed-in users get the normal header.
  const hideHeader = pathname === "/login" || (pathname === "/" && !session?.user);

  return (
    <>
      {!hideHeader && <Header serverSession={session} />}
      <ErrorBoundary>
        <div id="main-content">
          <Outlet />
        </div>
      </ErrorBoundary>
      <Footer />
      <CommandPalette />
      <Toaster />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[oklch(0.65_0.15_255_/_0.28)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <TooltipProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </TooltipProvider>
        {import.meta.env.VITE_DEV_TOOLS === "true" && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
