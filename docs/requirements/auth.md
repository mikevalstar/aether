---
title: Authentication
status: in-progress
owner: self
last_updated: 2026-03-22
canonical_file: docs/requirements/auth.md
---

# Authentication

## Purpose

- Problem: Restrict dashboard, chat, usage, and account-management features to authenticated users.
- Outcome: Known users can sign in with email/password, keep a session, and admins can create and manage invite-only accounts.
- Notes: This document reflects current implementation and visible product copy, not a future auth roadmap.

## Current Reality

- Current behavior: Better Auth is configured with Prisma + SQLite, email/password sign-in is enabled, public sign-up is disabled, and sessions are read from TanStack Start request headers/cookies. The Better Auth `admin` plugin is used for role management, and `trustedOrigins` includes `https://aether-test.neural.kitchen`.
- Constraints: Authentication depends on Better Auth route handlers at `/api/auth/$`; role checks use the Better Auth `admin` plugin with `defaultRole: "user"` and `adminRoles: ["admin"]`; account lifecycle metadata also uses custom `mustChangePassword` and `invitedById` fields in Prisma.
- Non-goals: Social login, magic links, self-serve registration, password reset by email, and multi-factor auth are not implemented.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Session auth | done | Users can sign in with email/password and maintain a Better Auth session across client and server code. |
| Route protection | done | Unauthenticated users are redirected away from protected pages and blocked from protected API behavior. All protected routes use a consistent server-first `beforeLoad` redirect pattern. |
| Admin-managed access | done | Only admins can create new accounts and assign `user` or `admin` roles via the Better Auth admin plugin. |
| Password lifecycle | in-progress | Temporary-password tracking exists and users can rotate passwords, but temporary-password enforcement is advisory rather than mandatory. |
| Profile settings | done | Users can update their display name and timezone from the settings page. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Sign-in UI | done | `/login` supports email/password sign-in, pending state, inline error display, and auto-redirects authenticated users to `/dashboard`. | Inline |
| Session helpers | done | Server helpers expose `getSession` and `ensureSession` for route loaders and server functions. | Inline |
| Root-level session hydration | done | The root layout fetches session in `beforeLoad` and passes it to the Header for SSR-first rendering. | Inline |
| Protected navigation | done | Header, dashboard, chat, usage, activity, tasks, workflows, board, obsidian, logs, requirements, and settings views gate access based on session state. | Inline |
| Admin user management | done | `/users` lets admins create accounts, set roles, and view invitation metadata. | Inline |
| Password settings | in-progress | `/settings/password` supports self-service password changes and clears `mustChangePassword` after success. | Inline |
| Profile settings | done | `/settings/profile` lets users update their name and timezone preference. | Inline |
| Sign out | done | Sign out is available from the user avatar dropdown and mobile nav via `authClient.signOut()`. | Inline |

## Detail

### Sign-in and session handling

- Requirement: The system must authenticate with Better Auth email/password and expose the resulting session consistently on both the client and server.
- Notes: `src/lib/auth.ts` enables `emailAndPassword` with `disableSignUp: true` and includes the `admin()` and `tanstackStartCookies()` plugins; `src/lib/auth-client.ts` uses the Better Auth React client with `adminClient()` plugin; `src/lib/auth.functions.ts` wraps `auth.api.getSession()` and throws `Unauthorized` from `ensureSession()` when no session exists. The root layout (`src/routes/__root.tsx`) fetches the session in `beforeLoad` and passes it to the Header as `serverSession` for SSR hydration; the client session (`authClient.useSession()`) takes over once available.
- Dependencies: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth.functions.ts`, `src/routes/api/auth/$.ts`, `src/routes/__root.tsx`.
- Follow-up: Decide whether to add richer unauthorized handling than generic thrown errors in server functions.

### Protected pages and APIs

- Requirement: Protected UI routes and server handlers must reject anonymous access before exposing user data or chat state.
- Notes: All protected routes now use a consistent server-first pattern: `beforeLoad` calls `getSession()` and throws `redirect({ to: "/login" })` when no session exists. This applies to `/dashboard`, `/chat`, `/usage`, `/activity`, `/tasks`, `/workflows`, `/board`, `/o` (Obsidian), `/logs`, `/requirements`, and `/settings` (which protects all nested settings routes including password and profile). `/api/chat` returns `401` when no session is present and scopes threads to `session.user.id`. `/users` also redirects to login when unauthenticated, with admin enforcement in the loader.
- Dependencies: `src/routes/chat.tsx`, `src/routes/usage.tsx`, `src/routes/dashboard.tsx`, `src/routes/activity.tsx`, `src/routes/tasks/`, `src/routes/workflows/`, `src/routes/board.tsx`, `src/routes/o/`, `src/routes/logs.tsx`, `src/routes/requirements/`, `src/routes/settings/route.tsx`, `src/routes/users.tsx`, `src/routes/api/chat.ts`.

### Invite-only account creation and roles

- Requirement: New accounts must be created by an authenticated admin rather than public sign-up, and user role must drive access to admin surfaces.
- Notes: Admin access is enforced in `requireAdminUser()` by checking Prisma's `User.role`; `createManagedUser()` validates inputs, calls `auth.api.createUser()`, marks the created account `emailVerified: true`, sets `mustChangePassword: true`, and stores `invitedById`; admin-only navigation to `/users` is exposed in the Header user dropdown menu and mobile nav (both gated by `session.user.role === "admin"`). Success feedback uses a toast notification.
- Dependencies: `src/lib/user-management.functions.ts`, `src/routes/users.tsx`, `src/components/Header.tsx`, `prisma/schema.prisma`.
- Follow-up: Decide whether non-admin users should be blocked from even seeing admin route URLs via route-level redirects instead of error-only loaders.

### Password change flow

- Requirement: Users must be able to replace temporary credentials and rotate their own passwords without admin involvement.
- Notes: `/settings/password` collects current and new password values, always revokes other sessions on change, and clears `mustChangePassword` after success; the UI warns when a temporary password is still active, but there is no enforced redirect that blocks access until password change is complete. Success feedback uses a toast notification. The settings layout (`/settings/route.tsx`) protects all settings routes with a server-first `beforeLoad` redirect.
- Dependencies: `src/routes/settings/password.tsx`, `src/routes/settings/route.tsx`, `src/lib/user-management.functions.ts`, `prisma/schema.prisma`.
- Follow-up: Decide whether `mustChangePassword` should hard-gate dashboard/chat access after first login.

### Profile settings

- Requirement: Users must be able to update their display name and timezone preference.
- Notes: `/settings/profile` shows the user's name (editable), email (read-only, displayed as disabled), and timezone (selectable from `Intl.supportedValuesOf("timeZone")`). The `User` model includes a `preferences` JSON field (`String @default("{}")`) for storing user preferences like timezone. Updates use `updateUserProfile` and `updateUserPreferences` server functions from `src/lib/preferences.functions.ts`.
- Dependencies: `src/routes/settings/profile.tsx`, `src/lib/preferences.functions.ts`, `prisma/schema.prisma`.

## Open Questions

- Should `mustChangePassword` become an enforced redirect at sign-in instead of a warning banner on the password settings page?
- How should the first bootstrap admin account be created and documented outside the normal admin-only user creation flow?
- Is automatically setting `emailVerified: true` for admin-created accounts a deliberate product rule or just a temporary convenience?
- Do you want password recovery/reset requirements documented now, or should they stay out of scope?

## Change Log

- 2026-03-22: Updated to reflect current state: documented Better Auth admin plugin usage, consistent server-first `beforeLoad` route protection across all protected routes, root-level session hydration for SSR, profile settings sub-feature, sign out sub-feature, expanded list of protected routes, preferences field on User model, toast notifications for success feedback, and trustedOrigins configuration.
- 2026-03-14: Created the initial auth requirements doc from the current implementation and added the requirements index.
