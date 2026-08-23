# Authorization Risk Review

This review documents the focused security audit performed after commit `35385c5 docs: document auth roles and multi-tenancy`.

Scope:

- [`../../app/api/proyectos/[id]/etapas/route.ts`](../../app/api/proyectos/[id]/etapas/route.ts)
- [`../../app/api/debug`](../../app/api/debug)
- [`../../lib/actions/ai-lead-scoring.ts`](../../lib/actions/ai-lead-scoring.ts)
- [`../../lib/actions/noticias.ts`](../../lib/actions/noticias.ts)

No functional code was modified. No secrets were inspected or exposed.

## Severity Summary

| ID | Finding | Severity | Status |
|---|---|---|---|
| A | Unguarded project stages API allows unauthenticated reads and creates | `CRITICA` | `FIX IMPLEMENTADO / PENDIENTE DE PUSH` |
| B | Debug API routes are deployable and protected only by query-string token | `ALTA` | `FIX IMPLEMENTADO / PENDIENTE DE COMMIT` |
| C | Workflow/AI lead scoring can process arbitrary `entityId` without lead org validation | `ALTA` | `CONFIRMADO` |
| D | Unguarded news mutations exist but no current caller was found | `MEDIA` | `CONDICIONAL` |

## A. Project Stages API

### Finding

[`../../app/api/proyectos/[id]/etapas/route.ts`](../../app/api/proyectos/[id]/etapas/route.ts) exposes `GET` and `POST` without authentication, role checks, project ownership checks, or Organization filtering.

Status: `FIX IMPLEMENTADO / PENDIENTE DE PUSH`

Severity: `CRITICA`

### Local Fix Applied

- Fixed in [`../../app/api/proyectos/[id]/etapas/route.ts`](../../app/api/proyectos/[id]/etapas/route.ts).
- `GET` and `POST` now validate `params.id` with `idSchema`.
- Both handlers call `requireProjectOwnership(params.id)` before any sensitive Prisma read/write.
- Guard errors are returned through `handleApiGuardError`.
- `POST` validates request body with a route-local schema compatible with the existing API contract (`nombre`, optional `estado`).
- Focused route tests were added in [`../../__tests__/api/proyectos-etapas-route.test.ts`](../../__tests__/api/proyectos-etapas-route.test.ts) for unauthenticated access, valid project access, cross-org/no-access rejection, and ADMIN/SUPERADMIN allowed paths.

### Evidence

- Methods exposed:
  - `GET /api/proyectos/[id]/etapas`
  - `POST /api/proyectos/[id]/etapas`
- The route imports only `NextResponse` and Prisma.
- `GET` runs `prisma.etapa.findMany({ where: { proyectoId: params.id }, include: { manzanas: { include: { _count: { select: { unidades: true } } } } } })`.
- `POST` reads request JSON, finds the max `orden` for `params.id`, and creates `Etapa` with `proyectoId: params.id`.
- There is no `requireAuth`, `requireAnyRole`, `requireProjectOwnership`, `requireOrgAccess`, `orgFilter`, or `handleApiGuardError`.
- [`../../middleware.ts`](../../middleware.ts) explicitly returns `true` for all `/api/*` paths in the NextAuth `authorized` callback, so API auth is expected to happen inside each handler.
- `projectId` is obtained from the dynamic URL segment `params.id`.
- Prisma applies no org filter in this route. `Etapa` itself does not have `orgId`; tenant context would need to be resolved through `Proyecto`.
- No frontend caller of this exact route was found. Current dashboard stage UI uses guarded Server Actions from [`../../lib/actions/etapas.ts`](../../lib/actions/etapas.ts).
- No matching tests were found under `__tests__`.
- No routing or deployment condition was found that excludes this `app/api` route from production.

### Surface Affected

- Any deployed environment serving the Next.js `app/api` routes.
- Any project whose ID is known or guessed.

### Preconditions

- Attacker can send HTTP requests to the deployed app.
- For read: attacker has a project ID.
- For create: attacker has a project ID and can send JSON with at least a stage name.

### Impact

- Unauthenticated project structure disclosure: stages, manzanas, and unit counts.
- Unauthenticated data mutation: creation of stages under any project ID.
- Cross-tenant mutation is possible because neither user identity nor project org is checked.

### Recommendation

- If the route is not needed, remove it or disable the `POST` handler.
- If public `GET` is intended, split read and write behavior and return only public-safe fields after verifying project visibility.
- Protect `POST` with `requireProjectOwnership(params.id)` or a more precise project permission.
- Add route tests proving unauthenticated requests fail and cross-org users cannot read/write private stages.

### Tests Missing

- `GET` unauthenticated returns 401/403 or public-safe result only.
- `POST` unauthenticated is rejected.
- Authenticated user from another org cannot create a stage.
- Project owner/admin can create a stage.
- Public project visibility rules, if any, are explicitly covered.

## B. Debug API Routes

### Finding

Three debug routes exist under [`../../app/api/debug`](../../app/api/debug). They are not conditioned by `NODE_ENV`; they are protected only by `DEBUG_DB_TOKEN` supplied as `?token=...`.

Status: `FIX IMPLEMENTADO / PENDIENTE DE COMMIT`

Severity: `ALTA`

### Local Fix Applied

- Fixed in [`../../app/api/debug/db-users/route.ts`](../../app/api/debug/db-users/route.ts), [`../../app/api/debug/oauth-links/route.ts`](../../app/api/debug/oauth-links/route.ts), and [`../../app/api/debug/db-counts/route.ts`](../../app/api/debug/db-counts/route.ts).
- Added shared helper [`../../app/api/debug/_utils.ts`](../../app/api/debug/_utils.ts).
- In `NODE_ENV === "production"`, all three endpoints now return `404` before any Prisma query.
- In local/development use, `DEBUG_DB_TOKEN` is accepted only through the `x-debug-db-token` header; `?token=` no longer authenticates.
- Header comparison uses a timing-safe comparison. If `DEBUG_DB_TOKEN` is missing, requests are blocked.
- `db-users` no longer returns user emails, per-user password metadata, per-user Google metadata, or account creation timestamps; it returns aggregate user counts by role and account-link counts.
- `oauth-links` no longer returns emails or provider-account metadata; it returns only the count of Google-linked users.
- `db-counts` no longer returns database host/provider metadata.
- Focused tests were added in [`../../__tests__/api/debug-routes.test.ts`](../../__tests__/api/debug-routes.test.ts) for production 404, missing/invalid header rejection, query-token rejection, successful development access by header, consistent behavior across the three routes, and response minimization.

### Inventory

| Route | Data returned | Protection | Query token | `NODE_ENV` gated | Sensitive exposure |
|---|---|---|---|---|---|
| `/api/debug/db-users` | Count and list of user emails, roles, account creation dates, password presence, Google-link presence | Compares `req.nextUrl.searchParams.get("token")` with `process.env.DEBUG_DB_TOKEN`; returns 503 if env var missing | yes | no | User emails, roles, account/provider state metadata |
| `/api/debug/oauth-links` | Count and list of Google-linked user emails and Google provider account presence | Same `DEBUG_DB_TOKEN` query-param check | yes | no | User emails and Google account-linking metadata |
| `/api/debug/db-counts` | DB host/provider label, timestamp, counts for users, projects, images, units, banners, leads, public-project/banner counts | Same `DEBUG_DB_TOKEN` query-param check | yes | no | Deployment/database host metadata and cross-tenant aggregate business counts |

### Evidence

- Files found:
  - [`../../app/api/debug/db-users/route.ts`](../../app/api/debug/db-users/route.ts)
  - [`../../app/api/debug/oauth-links/route.ts`](../../app/api/debug/oauth-links/route.ts)
  - [`../../app/api/debug/db-counts/route.ts`](../../app/api/debug/db-counts/route.ts)
- Each route reads `const token = req.nextUrl.searchParams.get("token") ?? ""`.
- Each route compares it to `process.env.DEBUG_DB_TOKEN`.
- No route checks `process.env.NODE_ENV`.
- No route calls NextAuth guards or admin permission guards.
- No tests were found under `__tests__`.

### Surface Affected

- Any environment where these routes are deployed and `DEBUG_DB_TOKEN` is set.
- Because the routes live under `app/api`, they are deployable by default unless blocked outside code.

### Preconditions

- `DEBUG_DB_TOKEN` is configured in the environment.
- Attacker obtains or observes the token, or an operator opens/shares/logs a URL containing it.

### Impact

- Query-string secrets can appear in browser history, server/proxy/CDN logs, analytics, monitoring traces, support screenshots, referrer headers, and copied URLs.
- User inventory and account-linking metadata can leak across tenants.
- Aggregate business counts and database host/provider metadata can leak.

### Recommendation

- Remove debug routes from production or gate them with an explicit non-production check.
- Replace query-string token usage with authenticated admin access and, if still needed, a header secret.
- Avoid returning user emails or provider-linking metadata from diagnostics unless there is a strict operational need.
- Add tests proving production requests are denied.

### Tests Missing

- Route returns 404/403 in production even if `DEBUG_DB_TOKEN` exists.
- Missing token returns 403.
- Invalid token returns 403.
- Valid operational access requires admin auth or approved header path.
- Response schemas do not expose emails/provider metadata unless explicitly allowed.

## C. AI Lead Scoring And Workflow Entity Scope

### Finding

[`../../lib/actions/ai-lead-scoring.ts`](../../lib/actions/ai-lead-scoring.ts) reads a lead by arbitrary ID and reads all projects without org scoping. A confirmed caller path, `POST /api/workflows/[id]/run`, validates access to the workflow but does not validate that `body.entityId` belongs to the same Organization before calling `runWorkflow(...)`.

Status: `CONFIRMADO`

Severity: `ALTA`

### Evidence

- Direct callers found:
  - [`../../lib/crm-pipeline.ts`](../../lib/crm-pipeline.ts)
  - [`../../lib/workflow-engine.ts`](../../lib/workflow-engine.ts)
- Indirect entry points include:
  - guarded CRM lead creation via [`../../app/api/crm/leads/route.ts`](../../app/api/crm/leads/route.ts)
  - public lead capture via [`../../app/api/leads/public/route.ts`](../../app/api/leads/public/route.ts), which quarantines unresolved public leads
  - Meta/TikTok/public/project landing lead intake paths through `executeLeadReception`
  - manual workflow runs via [`../../app/api/workflows/[id]/run/route.ts`](../../app/api/workflows/[id]/run/route.ts)
- `executeLeadReception` requires or resolves `orgId` before creating a normal lead, and triggers AI scoring with the newly created lead ID. That path is tenant-aware.
- `runWorkflow(workflowId, trigger, entityId)` does not accept an org context and does not verify the entity belongs to `workflow.orgId`.
- `POST /api/workflows/[id]/run`:
  - requires `ADMIN`, `SUPERADMIN`, or `DESARROLLADOR`;
  - verifies non-admin users can only run workflows from their own org;
  - reads `entityId` from request body;
  - passes `entityId` directly into `runWorkflow`.
- `runWorkflow` node behavior:
  - `AI_ACTION` calls `aiLeadScoring(entityId)`;
  - `UPDATE_LEAD` runs `prisma.lead.update({ where: { id: entityId }, data: cfg.fields })`;
  - `CONDITION` reads `prisma.lead.findUnique({ where: { id: entityId } })`;
  - `WEBHOOK` sends `entityData` from `prisma.lead.findUnique({ where: { id: entityId } })`.
- `aiLeadScoring`:
  - reads `prisma.lead.findUnique({ where: { id: leadId } })`;
  - reads `prisma.proyecto.findMany({ select: ... })` without a `where` filter;
  - includes all selected projects in the model prompt;
  - updates the lead by ID.
- No matching tests were found under `__tests__`.

### Surface Affected

- Manual workflow execution API.
- Workflow nodes that operate on leads by `entityId`.
- AI prompt context containing project data.

### Preconditions

- Attacker is authenticated as `DESARROLLADOR`, or is `ADMIN`/`SUPERADMIN`.
- Attacker can create or use a workflow in their org containing `AI_ACTION`, `UPDATE_LEAD`, `CONDITION`, or `WEBHOOK`.
- Attacker knows or guesses a lead ID from another Organization for cross-tenant entity access.

### Impact

- With `AI_ACTION`, a user can cause AI scoring to read and update a lead by ID without tenant validation.
- The AI prompt includes all projects globally, not only the lead's org or public projects.
- With `UPDATE_LEAD`, the workflow engine can update arbitrary lead fields by ID if the workflow node config allows it.
- With `WEBHOOK`, lead data for an arbitrary ID can be sent to a configured URL.

### Recommendation

- Make `runWorkflow` tenant-aware by loading the workflow org and validating every entity before node execution.
- For lead entities, require `lead.orgId === workflow.orgId` for non-admin runs.
- Scope `aiLeadScoring` project recommendations by `lead.orgId` or an explicit allowed project set.
- Treat workflow node configs as privileged and validate allowed fields for `UPDATE_LEAD`.
- Add tests for manual workflow execution with same-org and cross-org lead IDs.

### Tests Missing

- Non-admin developer cannot run own-org workflow against another-org lead ID.
- `AI_ACTION` only reads/projects scoped to the lead org.
- `UPDATE_LEAD` cannot update another-org lead.
- `WEBHOOK` cannot exfiltrate another-org lead data.
- Pipeline-created leads still score successfully in same-org context.

## D. News Actions

### Finding

[`../../lib/actions/noticias.ts`](../../lib/actions/noticias.ts) is currently used for public read paths, while its create/update/delete Server Actions have no auth guard. No current imports/callers of those mutation functions were found.

Status: `CONDICIONAL`

Severity: `MEDIA`

### Evidence

- Current imports/callers found:
  - [`../../app/(public)/blog/page.tsx`](../../app/(public)/blog/page.tsx) imports and calls `getNoticias`.
  - [`../../app/(public)/blog/[slug]/page.tsx`](../../app/(public)/blog/[slug]/page.tsx) imports and calls `getNoticiaBySlug`.
- No callers were found for:
  - `createNoticia`
  - `updateNoticia`
  - `deleteNoticia`
- Mutations call Prisma directly:
  - `createNoticia` -> `prisma.noticia.create`
  - `updateNoticia` -> `prisma.noticia.update`
  - `deleteNoticia` -> `prisma.noticia.delete`
- The file has no import from [`../../lib/guards.ts`](../../lib/guards.ts) or [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts).
- The active admin blog UI uses guarded actions from [`../../lib/actions/blog.ts`](../../lib/actions/blog.ts), not `noticias.ts`.
- `Noticia` is a separate Prisma model from `BlogPost`.
- No matching tests were found under `__tests__`.

### Surface Affected

- Currently confirmed: public blog read pages.
- Conditional: any future or hidden client/server import of `createNoticia`, `updateNoticia`, or `deleteNoticia`.

### Preconditions

- A mutation function from `noticias.ts` must be reachable from a Client Component, route, or form/action binding.
- Attacker can invoke that Server Action.

### Impact

- If reachable, unauthorized users could create, modify, or delete `Noticia` records.
- Because current callers are read-only, exploitation was not proven from the current UI/routing surface.

### Recommendation

- If `Noticia` is still an active content model, add `requireAnyRole(["ADMIN", "SUPERADMIN"])` or a dedicated content-management permission to mutation functions.
- If legacy/dead, remove mutations or mark the module as read-only/public.
- Add tests proving mutations require admin-level authorization.

### Tests Missing

- Public blog reads remain available.
- Unauthenticated users cannot create/update/delete `Noticia`.
- Non-admin authenticated users cannot create/update/delete `Noticia`.
- Admin/superadmin can manage `Noticia`, if the model remains active.
