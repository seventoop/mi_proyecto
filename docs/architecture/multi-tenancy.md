# Multi-Tenancy

This document records the current Organization isolation model verified from repository code on top of commit `db0a8e0 docs: initialize Obsidian knowledge base`.

Use it together with [[auth-and-authorization]], [[roles-and-permissions]], [`../security/id-strategy.md`](../security/id-strategy.md), and [`../security/security-guardrails.md`](../security/security-guardrails.md).

## Confirmed Model

`Organization` is the tenant anchor in [`../../prisma/schema.prisma`](../../prisma/schema.prisma). Important tenant-linked models include:

- `User.orgId`
- `Proyecto.orgId`
- `Lead.orgId`
- `PipelineEtapa.orgId`
- `Workflow.orgId`
- `LogicToopFlow.orgId`
- `LogicToopJob.orgId`
- `LogicToopRecommendation.orgId`
- `IntegrationConfig.orgId`
- `Banner.orgId`
- `Notificacion.orgId`
- `ProyectoUsuario.orgId`

Some domain objects inherit tenant context through a parent instead of holding `orgId` directly. Examples:

- `Etapa` -> `Proyecto`
- `Manzana` -> `Etapa` -> `Proyecto`
- `Unidad` -> `Manzana` -> `Etapa` -> `Proyecto`
- `Tour360` -> `Proyecto`
- `Infraestructura` -> `Proyecto`
- `ImagenMapa` -> `Proyecto`
- `Reserva` -> `Unidad` -> `Proyecto`

## Organization Resolution

For ordinary authenticated users:

- `orgId` is read from `User.orgId`.
- NextAuth copies it into JWT/session via [`../../lib/auth.ts`](../../lib/auth.ts).
- Guards and queries read `user.orgId` from `session.user`.

For `ADMIN`/`SUPERADMIN`:

- Guards generally bypass org filters.
- Page helper [`../../lib/auth/guards.ts`](../../lib/auth/guards.ts) has `resolveAdminOrgContext(searchParamsOrgId)` for admin pages that need an explicit active organization.
- Some admin LogicToop pages accept an `orgId` search param and choose a default org if missing.

## Tenant Enforcement Patterns

### `orgFilter(user)`

[`../../lib/guards.ts`](../../lib/guards.ts) defines:

- `ADMIN`/`SUPERADMIN`: returns `{}` and sees all data.
- non-admin with `orgId`: returns `{ orgId: user.orgId }`.
- non-admin without `orgId`: returns `{ orgId: "___NO_ORG___" }` to fail closed.

### Resource-specific guards

- `requireOrgAccess(orgId)`: user must belong to the org unless admin/superadmin.
- `requireProjectOwnership(projectId)`: uses project access context, checks org boundary, then requires `EDITAR_PROYECTO`.
- `requireReservaPermission(reservaId)`: resolves project org through reservation -> unit -> project and requires same org plus seller/project-owner relation.
- `requireNotificationOwnership(notificationId)`: non-admin user must own the notification.
- `requireCrmRead(orgId)` and `requireCrmWrite(orgId)`: org-scoped CRM access rules.

### Project access context

[`../../lib/project-access/get-project-access.ts`](../../lib/project-access/get-project-access.ts) is the central relation-based project access helper.

Confirmed behavior:

- Loads `Proyecto` by ID.
- Non-admin users fail with 404 if either side lacks `orgId` or org IDs differ.
- Loads `ProyectoUsuario` relation for the user/project.
- Applies legacy owner fallback when `Proyecto.creadoPorId === user.id` and no conflicting active owner exists.
- Evaluates granular `ProjectPermission` values.

## Data Access By Surface

| Surface | Enforcement style |
|---|---|
| Dashboard pages | Middleware requires token; individual pages often use `getServerSession` and role redirects. These checks protect rendering/navigation, not APIs. |
| Server Actions | Manual guards at function start. Some actions use `orgFilter`, some use project relation guards, some are intentionally public. |
| API routes | Manual guards in each handler because middleware allows `/api/*` through. Coverage must be audited per route. |
| Prisma | No global tenant middleware or database row-level security was found. Queries must include org or ownership constraints manually. |
| Public pages/forms/webhooks | Public by design; tenant resolution is per handler, often via project/integration context or quarantine with `orgId: null`. |

## Confirmed Positive Patterns

- [`../../app/api/proyectos/[id]/route.ts`](../../app/api/proyectos/[id]/route.ts): `GET` requires auth and returns 404 for non-admin users outside the project org; mutations use `requireProjectOwnership`.
- [`../../app/api/unidades/[id]/route.ts`](../../app/api/unidades/[id]/route.ts): resolves org through unit -> project before reads/writes/deletes and fails closed for non-admins.
- [`../../app/api/crm/leads/[id]/route.ts`](../../app/api/crm/leads/[id]/route.ts): checks lead `orgId`; leads without org are admin-only.
- [`../../app/api/crm/leads/route.ts`](../../app/api/crm/leads/route.ts): list uses `orgFilter(user)`.
- [`../../app/api/workflows/route.ts`](../../app/api/workflows/route.ts): admin sees all; non-admin filters by `orgId`.
- [`../../app/api/realtime/auth/route.ts`](../../app/api/realtime/auth/route.ts): private project channels rely on `getProjectAccess`; private user channels require matching user ID.
- [`../../app/api/webhooks/meta/route.ts`](../../app/api/webhooks/meta/route.ts): resolves org through `IntegrationConfig`.
- [`../../app/api/webhooks/tiktok/route.ts`](../../app/api/webhooks/tiktok/route.ts): quarantines TikTok leads with `orgId: null` because no tenant resolution strategy is defined.

## Cross-Tenant / IDOR Risk Areas

### Unguarded project-stage API

- Location: [`../../app/api/proyectos/[id]/etapas/route.ts`](../../app/api/proyectos/[id]/etapas/route.ts)
- Observed behavior: unauthenticated `GET` lists stages/manzanas/counts by project ID; unauthenticated `POST` creates an `Etapa`.
- Risk: IDOR and unauthenticated cross-tenant mutation.
- Evidence: no import from `lib/guards`, no `requireAuth`, no `requireProjectOwnership`, no project org check.
- Possible impact: project structure can be enumerated or modified across tenants.
- Preliminary recommendation: require at least project visibility validation on `GET` and `requireProjectOwnership` or a specific project permission on `POST`.

### Debug endpoints are outside tenant model

- Location: [`../../app/api/debug/db-users/route.ts`](../../app/api/debug/db-users/route.ts), [`../../app/api/debug/oauth-links/route.ts`](../../app/api/debug/oauth-links/route.ts), [`../../app/api/debug/db-counts/route.ts`](../../app/api/debug/db-counts/route.ts)
- Observed behavior: token-based diagnostics read across all tenants.
- Risk: intended operational bypass may expose cross-tenant metadata if token leaks or route is deployed broadly.
- Evidence: no org filter; protection is `DEBUG_DB_TOKEN` query parameter.
- Possible impact: cross-tenant user/count/auth-provider metadata disclosure.
- Preliminary recommendation: restrict to non-production or add admin auth and non-query secret handling.

### Server Action with global lead/project read

- Location: [`../../lib/actions/ai-lead-scoring.ts`](../../lib/actions/ai-lead-scoring.ts)
- Observed behavior: `aiLeadScoring(leadId)` reads a lead by ID and then reads all projects without an org filter.
- Risk: if callable from a path without established tenant context, AI prompts can mix cross-tenant project data.
- Evidence: function has no guard and calls `prisma.proyecto.findMany({ select: ... })` without `where`.
- Possible impact: tenant data leakage into AI context or recommendations.
- Preliminary recommendation: keep it as an internal helper only if all callers already scope tenant context; otherwise pass/derive `orgId` and filter projects.

### Unused or legacy news mutations without guards

- Location: [`../../lib/actions/noticias.ts`](../../lib/actions/noticias.ts)
- Observed behavior: public reads are used by public blog pages; create/update/delete mutations do not call auth/role guards.
- Risk: if these Server Actions are imported by a client or page later, mutations would depend only on action reachability.
- Evidence: `createNoticia`, `updateNoticia`, and `deleteNoticia` call Prisma directly without `requireAnyRole`; current admin blog page uses guarded [`../../lib/actions/blog.ts`](../../lib/actions/blog.ts), not `noticias.ts`.
- Possible impact: unauthorized content mutation if wired into UI/API.
- Preliminary recommendation: either guard mutations now or mark them explicitly internal/deprecated.

## Confirmed IDOR Defenses

- Non-admin project/detail reads return 404 on org mismatch rather than 403.
- `getProjectAccess` fails closed when either the user or project lacks org context.
- Lead detail/update treats `orgId: null` as admin-only.
- Unit update checks both the current unit's project org and target `manzanaId`/`responsableId` org to prevent cross-tenant reassignment.
- Reservation permission resolves tenant through the project attached to the reserved unit.

## Documentation Drift

[`../security/id-strategy.md`](../security/id-strategy.md) says `orgFilter(user)` is applied to all queries including `findUnique` and `findMany`. Current code shows this is an architectural rule, not a universal implementation fact. Some handlers use custom checks after `findUnique`; at least one route has no guard at all.

## Evidence

- [`../../prisma/schema.prisma`](../../prisma/schema.prisma): tenant-linked models and relation structure.
- [`../../lib/guards.ts`](../../lib/guards.ts): `orgFilter`, org/project/reservation/notification/CRM guards.
- [`../../lib/project-access/get-project-access.ts`](../../lib/project-access/get-project-access.ts): project relation and org boundary enforcement.
- [`../../app/api/proyectos/[id]/route.ts`](../../app/api/proyectos/[id]/route.ts): positive project route pattern.
- [`../../app/api/unidades/[id]/route.ts`](../../app/api/unidades/[id]/route.ts): nested tenant validation.
- [`../../app/api/crm/leads/[id]/route.ts`](../../app/api/crm/leads/[id]/route.ts): lead org check.
- [`../../middleware.ts`](../../middleware.ts): API routes are allowed through middleware for handler-level auth.

## To Verify

- Full list of legacy rows with `orgId: null` in tenant-sensitive tables.
- Whether public project-stage reads are required and, if so, what fields should be exposed.
- Whether all automation/workflow callers of AI lead scoring are already tenant-scoped.
- Whether debug routes are excluded from production or protected by deployment policy.
- Whether a Prisma middleware or database-level row-level security exists outside this repository; none was found in code.
