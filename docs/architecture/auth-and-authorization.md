# Authentication And Authorization

This document records the current authentication and authorization behavior verified from repository code on top of commit `db0a8e0 docs: initialize Obsidian knowledge base`.

Use it together with [[roles-and-permissions]], [[multi-tenancy]], [`../security/security-guardrails.md`](../security/security-guardrails.md), and [`../auth-runbook.md`](../auth-runbook.md). Code remains the source of truth.

## Confirmed

- Authentication uses NextAuth v4 through [`../../lib/auth.ts`](../../lib/auth.ts) and [`../../app/api/auth/[...nextauth]/route.ts`](../../app/api/auth/[...nextauth]/route.ts).
- Providers are credentials and Google.
- Sessions use NextAuth JWT strategy with `maxAge: 24h`.
- `session.user` contains `id`, `email`, `role`, `orgId`, `kycStatus`, `demoEndsAt`, `googleId`, and `hasPassword`, as typed in [`../../types/next-auth.d.ts`](../../types/next-auth.d.ts).
- Credentials login reads `User` by normalized email, verifies `password` with bcrypt, and returns role/org/KYC/demo fields into the NextAuth user object.
- Google login links an existing user by email or redirects unknown verified Google accounts to the pre-registration flow.
- Public registration blocks `ADMIN` and `SUPERADMIN` but permits initial `CLIENTE`, `INVERSOR`, `VENDEDOR`, and `DESARROLLADOR` through [`../../lib/auth/registration-policy.ts`](../../lib/auth/registration-policy.ts).
- Middleware protects dashboard/onboarding pages with a session token and enforces admin subroutes for `ADMIN`/`SUPERADMIN`.
- API routes are intentionally allowed through middleware and are expected to enforce auth inside each handler.
- KYC/demo redirects live in [`../../middleware.ts`](../../middleware.ts) for non-API page requests.

## Login Flow

1. The login page calls NextAuth `signIn("credentials")`.
2. NextAuth routes the request to the credentials provider in [`../../lib/auth.ts`](../../lib/auth.ts).
3. `authorize()` fetches a user by email, rejects missing/invalid passwords, and verifies bcrypt.
4. The JWT callback stores role, org, KYC, demo, Google ID, and password presence.
5. The session callback copies those values into `session.user`.
6. Dashboard requests pass through [`../../middleware.ts`](../../middleware.ts), which requires a JWT token for non-API dashboard/onboarding paths and redirects unauthorized admin-path access to `/dashboard`.
7. Server Components commonly read the session with `getServerSession(authOptions)` and redirect by role.
8. Server Actions and API routes should use throwing guards from [`../../lib/guards.ts`](../../lib/guards.ts).

## Session Freshness

The current implementation does not re-fetch user role/org/KYC on every request. It re-fetches:

- when the JWT is first created from a `user` object;
- when `trigger === "update"`;
- when `lastDbSync` is older than `DB_SYNC_INTERVAL_S`, currently 5 minutes.

This contradicts [`../../CLAUDE.md`](../../CLAUDE.md) and [`../auth-runbook.md`](../auth-runbook.md), which describe DB re-fetch as happening on every request.

## Authorization Layers

| Layer | Mechanism | Confirmed behavior |
|---|---|---|
| Middleware | [`../../middleware.ts`](../../middleware.ts) | Requires token for dashboard/onboarding pages; checks `/dashboard/admin`; rate-limits selected paths; does not authorize API routes beyond rate limiting. |
| Page UI / Server Components | `getServerSession`, redirects, occasional page guards | Controls navigation and page rendering. This is not sufficient for mutation security. |
| Server Actions | [`../../lib/guards.ts`](../../lib/guards.ts), [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts) | Should enforce auth/role/org before mutation or sensitive reads. Coverage varies by action. |
| API routes | [`../../lib/guards.ts`](../../lib/guards.ts), [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts), `requireCronSecret` | Each handler is responsible for its own auth because middleware allows API requests through. |
| Data access | Prisma filters, `orgFilter`, ownership/context guards | Tenant isolation is implemented manually per query or helper, not by database row-level security. |

## Guard Families

[`../../lib/guards.ts`](../../lib/guards.ts) is the canonical throwing guard module for Server Actions and API routes:

- `requireAuth()`
- `requireRole(role)`
- `requireAnyRole(roles)`
- `orgFilter(user)`
- `requireProjectOwnership(projectId)`
- `requireNotificationOwnership(notificationId)`
- `requireReservaPermission(reservaId)`
- `requireCronSecret(request)`
- `requireKYC()`
- `requireOrgAccess(orgId)`
- `requireCrmRead(orgId)`
- `requireCrmWrite(orgId)`
- `handleGuardError(error)`
- `handleApiGuardError(error)`
- `withAdminGuard(handler)`

[`../../lib/auth/guards.ts`](../../lib/auth/guards.ts) is a page-level redirect-oriented guard module:

- `getSession()`
- `requireAuth()`
- `requireRole(allowedRoles)`
- `requireOrgAccess(orgId)`
- `withAdminGuard(handler)`
- `resolveAdminOrgContext(searchParamsOrgId)`

The file itself states that it is for Server Components/page contexts, while [`../../lib/guards.ts`](../../lib/guards.ts) is for API routes and Server Actions.

## Evidence

- [`../../lib/auth.ts`](../../lib/auth.ts): NextAuth providers, callbacks, JWT/session contents.
- [`../../types/next-auth.d.ts`](../../types/next-auth.d.ts): typed session/JWT fields.
- [`../../middleware.ts`](../../middleware.ts): dashboard/admin/API/rate-limit/KYC behavior.
- [`../../app/api/auth/register/route.ts`](../../app/api/auth/register/route.ts): public credentials registration.
- [`../../app/api/auth/google-register/route.ts`](../../app/api/auth/google-register/route.ts): Google pre-registration completion.
- [`../../lib/auth/registration-policy.ts`](../../lib/auth/registration-policy.ts): public role allow/block policy.
- [`../../lib/guards.ts`](../../lib/guards.ts): canonical API/action guards.
- [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts): configurable permission matrix.

## Risks And Inconsistencies

### API route without auth guard

- Location: [`../../app/api/proyectos/[id]/etapas/route.ts`](../../app/api/proyectos/[id]/etapas/route.ts)
- Observed behavior: `GET` reads project stages by `proyectoId`; `POST` creates a stage. Neither handler calls `requireAuth`, role guards, project ownership, or an org check.
- Risk: unauthenticated read/write and potential cross-tenant mutation if the route is reachable.
- Evidence: route imports only `NextResponse` and Prisma and directly calls `prisma.etapa.findMany`, `findFirst`, and `create`.
- Possible impact: project structure may be exposed or modified by anyone who knows or guesses a project ID.
- Preliminary recommendation: protect `GET` according to intended visibility and require `requireProjectOwnership(params.id)` or an equivalent project permission guard for `POST`.

### Debug endpoints protected only by query token

- Location: [`../../app/api/debug/db-users/route.ts`](../../app/api/debug/db-users/route.ts), [`../../app/api/debug/oauth-links/route.ts`](../../app/api/debug/oauth-links/route.ts), [`../../app/api/debug/db-counts/route.ts`](../../app/api/debug/db-counts/route.ts)
- Observed behavior: routes require `?token=<DEBUG_DB_TOKEN>` and no NextAuth role. They return user emails and account-linking metadata in two cases.
- Risk: query-string tokens can leak through browser history, logs, referrers, or copied URLs.
- Evidence: each route reads `req.nextUrl.searchParams.get("token")` and compares it to `process.env.DEBUG_DB_TOKEN`.
- Possible impact: exposure of user inventory and auth-provider linkage metadata if the debug token leaks.
- Preliminary recommendation: remove from production deployment or require admin auth plus a non-query secret mechanism.

### UI/page protection is not server mutation protection

- Location: dashboard pages under [`../../app/(dashboard)`](../../app/(dashboard)) and API/actions generally.
- Observed behavior: many pages use `getServerSession` and redirect; API routes are explicitly allowed through middleware and rely on route-level guards.
- Risk: a route or Server Action with missing guards can remain reachable even when the UI hides it.
- Evidence: middleware `authorized` callback returns `true` for all `/api/` paths, while [`../../app/api/proyectos/[id]/etapas/route.ts`](../../app/api/proyectos/[id]/etapas/route.ts) has no handler-level guard.
- Possible impact: direct API calls can bypass UI-only checks.
- Preliminary recommendation: treat UI checks as navigation only; require server-side guards on every sensitive API route and Server Action.

### Documentation drift

- Location: [`../../CLAUDE.md`](../../CLAUDE.md), [`../auth-runbook.md`](../auth-runbook.md)
- Observed behavior: both describe JWT DB re-fetch as happening on every request, but code re-syncs every 5 minutes unless the session update trigger fires.
- Risk: operators may expect role/org changes to apply instantly.
- Evidence: `DB_SYNC_INTERVAL_S = 5 * 60` in [`../../lib/auth.ts`](../../lib/auth.ts).
- Possible impact: role/org/KYC changes can remain stale in active JWT sessions for up to roughly 5 minutes.
- Preliminary recommendation: update operational docs or intentionally change session refresh semantics after review.

## To Verify

- Whether `DEBUG_DB_TOKEN` routes are deployed to production or blocked at routing/platform level.
- Full Server Action coverage outside the sampled auth/CRM/project/reservation paths.
- Whether all direct callers of `aiLeadScoring(leadId)` already establish tenant context before invocation.
- Whether there are intentionally public reads for project stages that should be split from the current unauthenticated `POST` route.
