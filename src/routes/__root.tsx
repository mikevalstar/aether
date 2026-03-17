import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute, type ErrorComponentProps, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import CommandPalette from "../components/CommandPalette";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ThemeProvider from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { ErrorBoundary, ErrorDisplay } from "../lib/error-display";
import { getSession } from "../lib/auth.functions";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	errorComponent: RootErrorComponent,
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
				content: "width=device-width, initial-scale=1",
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
		],
	}),
	shellComponent: RootDocument,
});

function RootErrorComponent({ error }: ErrorComponentProps) {
	const router = useRouter();

	return (
		<div className="page-wrap py-12">
			<div className="surface-card overflow-hidden">
				<ErrorDisplay error={error} onRetry={() => router.invalidate()} />
			</div>
		</div>
	);
}

function RootComponent() {
	const { session } = Route.useRouteContext();

	return (
		<>
			<Header serverSession={session} />
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
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[oklch(0.55_0.15_180_/_0.24)]">
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
				>
					Skip to content
				</a>
				<TooltipProvider>
					<ThemeProvider>
						{children}
					</ThemeProvider>
				</TooltipProvider>
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
				<Scripts />
			</body>
		</html>
	);
}
