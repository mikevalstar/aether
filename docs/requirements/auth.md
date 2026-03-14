# Authentication

- Status: in-progress
- Owner: self
- Last updated: 2026-03-14
- Canonical file: `docs/requirements/auth.md`

## Purpose

- Problem: Restrict dashboard, chat, usage, and account-management features to authenticated users.
- Outcome: Known users can sign in with email/password, keep a session, and admins can create and manage invite-only accounts.
- Notes: This document reflects current implementation and visible product copy, not a future auth roadmap.

## Current Reality

- Current behavior: Better Auth is configured with Prisma + SQLite, email/password sign-in is enabled, public sign-up is disabled, and sessions are read from TanStack Start request headers/cookies.
- Constraints: Authentication depends on Better Auth route handlers at `/api/auth/$`; role checks rely on the `role` field in `User`; account lifecycle metadata also uses custom `mustChangePassword` and `invitedById` fields in Prisma.
- Non-goals: Social login, magic links, self-serve registration, password reset by email, and multi-factor auth are not implemented.

## Major Requirements

| Area | Status | Requirement |
| --- | --- | --- |
| Session auth | done | Users can sign in with email/password and maintain a Better Auth session across client and server code. |
| Route protection | done | Unauthenticated users are redirected away from protected pages and blocked from protected API behavior. |
| Admin-managed access | done | Only admins can create new accounts and assign `user` or `admin` roles. |
| Password lifecycle | in-progress | Temporary-password tracking exists and users can rotate passwords, but temporary-password enforcement is advisory rather than mandatory. |

## Sub-features

| Sub-feature | Status | Summary | Detail |
| --- | --- | --- | --- |
| Sign-in UI | done | `/login` supports email/password sign-in, pending state, and inline error display. | Inline |
| Session helpers | done | Server helpers expose `getSession` and `ensureSession` for route loaders and server functions. | Inline |
| Protected navigation | done | Header, home page, dashboard, chat, and usage views change behavior based on session state. | Inline |
| Admin user management | done | `/users` lets admins create accounts, set roles, and view invitation metadata. | Inline |
| Password settings | in-progress | `/settings/password` supports self-service password changes and clears `mustChangePassword` after success. | Inline |

## Detail

### Sign-in and session handling

- Requirement: The system must authenticate with Better Auth email/password and expose the resulting session consistently on both the client and server.
- Notes: `src/lib/auth.ts` enables `emailAndPassword` with `disableSignUp: true`; `src/lib/auth-client.ts` uses the Better Auth React client; `src/lib/auth.functions.ts` wraps `auth.api.getSession()` and throws `Unauthorized` from `ensureSession()` when no session exists.
- Dependencies: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/auth.functions.ts`, `src/routes/api/auth/$.ts`.
- Follow-up: Decide whether to add richer unauthorized handling than generic thrown errors in server functions.

### Protected pages and APIs

- Requirement: Protected UI routes and server handlers must reject anonymous access before exposing user data or chat state.
- Notes: `/chat` and `/usage` gate access in loaders with redirects to `/login`; `/dashboard` redirects client-side when the session hook resolves to no user; `/api/chat` returns `401` when no session is present and scopes threads to `session.user.id`.
- Dependencies: `src/routes/chat.tsx`, `src/routes/usage.tsx`, `src/routes/dashboard.tsx`, `src/routes/api/chat.ts`.
- Follow-up: Align protection style across routes so all protected pages use a consistent server-first gate.

### Invite-only account creation and roles

- Requirement: New accounts must be created by an authenticated admin rather than public sign-up, and user role must drive access to admin surfaces.
- Notes: Admin access is enforced in `requireAdminUser()` by checking Prisma's `User.role`; `createManagedUser()` validates inputs, calls `auth.api.createUser()`, marks the created account `emailVerified: true`, sets `mustChangePassword: true`, and stores `invitedById`; admin-only navigation to `/users` is exposed in the dashboard and header.
- Dependencies: `src/lib/user-management.functions.ts`, `src/routes/users.tsx`, `src/routes/dashboard.tsx`, `src/components/Header.tsx`, `prisma/schema.prisma`.
- Follow-up: Decide whether non-admin users should be blocked from even seeing admin route URLs via route-level redirects instead of error-only loaders.

### Password change flow

- Requirement: Users must be able to replace temporary credentials and rotate their own passwords without admin involvement.
- Notes: `/settings/password` collects current and new password values, always revokes other sessions on change, and clears `mustChangePassword` after success; the UI warns when a temporary password is still active, but there is no enforced redirect that blocks access until password change is complete.
- Dependencies: `src/routes/settings/password.tsx`, `src/lib/user-management.functions.ts`, `prisma/schema.prisma`.
- Follow-up: Decide whether `mustChangePassword` should hard-gate dashboard/chat access after first login.

## Open Questions

- Should `mustChangePassword` become an enforced redirect at sign-in instead of a warning banner on the password settings page?
- How should the first bootstrap admin account be created and documented outside the normal admin-only user creation flow?
- Is automatically setting `emailVerified: true` for admin-created accounts a deliberate product rule or just a temporary convenience?
- Do you want password recovery/reset requirements documented now, or should they stay out of scope?

## Change Log

- 2026-03-14: Created the initial auth requirements doc from the current implementation and added the requirements index.
