# Roles And Permissions

This document maps the roles and permission systems currently visible in code on top of commit `db0a8e0 docs: initialize Obsidian knowledge base`.

Use it together with [[auth-and-authorization]], [[multi-tenancy]], and [`../security/security-guardrails.md`](../security/security-guardrails.md).

## Confirmed Roles

Roles are stored as free-form strings in `User.rol`; Prisma does not define a role enum.

Confirmed role constants in [`../../lib/constants/roles.ts`](../../lib/constants/roles.ts):

- `SUPERADMIN`
- `ADMIN`
- `DESARROLLADOR`
- `VENDEDOR`
- `INVERSOR`
- `CLIENTE`

[`../../lib/guards.ts`](../../lib/guards.ts) also defines a local `ROLES.USER = "USER"` constant, but this role is not present in the canonical constants file or the permission matrix. Treat `USER` as unconfirmed/legacy until proven by data or active code paths.

## Role Semantics Confirmed In Code

| Role | Confirmed behavior |
|---|---|
| `SUPERADMIN` | Bypasses `requireRole`, `requireAnyRole`, `orgFilter`, project ownership, org access, reservation permission, notification ownership, and KYC checks. Required for editing role-permission overrides. |
| `ADMIN` | Bypasses tenant/org filters in guards and is accepted by most admin route/action checks. Does not automatically pass `requireRole("SUPERADMIN")`. |
| `DESARROLLADOR` | Can access many developer/project/workflow actions when included in `requireAnyRole`; project writes often still require project ownership or project relation permissions. |
| `VENDEDOR` | Can access selected sales/developer flows and CRM/reservation/unit operations when included in role checks and/or project relation checks. |
| `INVERSOR` | Investor/client portfolio role. Server-side access is mostly through `requireAuth` and per-user data filters. |
| `CLIENTE` | Buyer/client role. Similar to investor in dashboard redirects and portfolio/property access, with less investment access. |

## Public Registration Policy

[`../../lib/auth/registration-policy.ts`](../../lib/auth/registration-policy.ts) is the current source for public role assignment:

- blocked: `ADMIN`, `SUPERADMIN`;
- allowed: `CLIENTE`, `INVERSOR`, `VENDEDOR`, `DESARROLLADOR`;
- default: `CLIENTE`.

Both credentials registration and Google pre-registration use this policy.

## Configurable Permission Matrix

[`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts) defines additional permissions beyond the role string:

- `users.manage`
- `role_requests.manage`
- `risks.view`
- `crm.admin`
- `platform.config.manage`

Default permissions:

| Permission | SUPERADMIN | ADMIN | DESARROLLADOR | VENDEDOR | INVERSOR | CLIENTE |
|---|---:|---:|---:|---:|---:|---:|
| `users.manage` | yes | yes | no | no | no | no |
| `role_requests.manage` | yes | yes | no | no | no | no |
| `risks.view` | yes | yes | no | no | no | no |
| `crm.admin` | yes | yes | no | no | no | no |
| `platform.config.manage` | yes | no | no | no | no | no |

Overrides are stored in `SystemConfig` under the key `ROLE_PERMISSION_OVERRIDES`. `requirePermission(permission)` reads the effective matrix at runtime and is used by selected admin APIs/actions.

Confirmed permission-protected areas:

- [`../../app/api/admin/role-permissions/route.ts`](../../app/api/admin/role-permissions/route.ts): `SUPERADMIN` only, intentionally not permission-driven.
- [`../../app/api/admin/config/route.ts`](../../app/api/admin/config/route.ts): `platform.config.manage`.
- [`../../app/api/admin/crm/leads/route.ts`](../../app/api/admin/crm/leads/route.ts): `crm.admin`.
- [`../../app/api/role-change-requests/route.ts`](../../app/api/role-change-requests/route.ts) and [`../../app/api/role-change-requests/[requestId]/route.ts`](../../app/api/role-change-requests/[requestId]/route.ts): `role_requests.manage`.
- [`../../lib/actions/user-actions.ts`](../../lib/actions/user-actions.ts): `users.manage`.
- Some admin pages use `roleHasPermission(...)` for UI/page access checks.

## Project-Level Permissions

Project access is not determined only by `User.rol`. [`../../prisma/schema.prisma`](../../prisma/schema.prisma) defines `ProyectoUsuario` relations with:

- `tipoRelacion`
- `estadoRelacion`
- `permisoEditarProyecto`
- `permisoSubirDocumentacion`
- `permisoVerLeadsGlobales`
- `permisoVerMetricasGlobales`
- mandate fields for commercializer relations.

Confirmed `TipoRelacionProyecto` values:

- `OWNER`
- `VENDEDOR_ASIGNADO`
- `COMERCIALIZADOR_EXCLUSIVO`
- `COMERCIALIZADOR_NO_EXCLUSIVO`
- `COLABORADOR`
- `SOLO_LECTURA`

Confirmed `EstadoRelacionProyecto` values:

- `ACTIVA`
- `PENDIENTE`
- `RECHAZADA`
- `VENCIDA`

[`../../lib/project-access/get-project-access.ts`](../../lib/project-access/get-project-access.ts) evaluates these project permissions:

- `EDITAR_PROYECTO`
- `SUBIR_DOCUMENTACION`
- `GESTIONAR_RELACIONES`
- `TRANSICIONAR_ESTADO`
- `PUBLICAR`
- `RESERVAR`
- `CAPTAR_LEADS`
- `VER_LEADS_GLOBALES`
- `VER_METRICAS_GLOBALES`
- `OVERRIDE_FLAGS`

Important confirmed behavior:

- `ADMIN` and `SUPERADMIN` are treated as full management access for project context.
- Explicit `OWNER` or legacy `creadoPorId` can act as effective owner.
- `COLABORADOR` can upload documentation when active, but cannot edit projects or perform commercial operations.
- `COMERCIALIZADOR_*` relations with expired mandate are downgraded to `VENCIDA`.
- `RECHAZADO` and `SUSPENDIDO` are blocking states for commercial permissions.
- Commercial permissions also depend on project flags: `puedePublicarse`, `puedeReservarse`, `puedeCaptarLeads`.

## CRM Write Permissions

[`../../lib/guards.ts`](../../lib/guards.ts) defines CRM read/write guards:

- `requireCrmRead(orgId)`: any authenticated member of that org, or admin/superadmin.
- `requireCrmWrite(orgId)`: admin/superadmin, or at least one active `ProyectoUsuario` relation in that org with type `OWNER`, `VENDEDOR_ASIGNADO`, `COMERCIALIZADOR_EXCLUSIVO`, or `COMERCIALIZADOR_NO_EXCLUSIVO`.

Legacy fallback: if a non-admin org member has no active `ProyectoUsuario` rows, CRM write is allowed for backward compatibility.

## KYC And Demo State

KYC/demo fields are part of `session.user` and `User`:

- `kycStatus`
- `demoEndsAt`
- `demoUsed`
- `developerVerified`
- `kycRequiredAt`
- `kycSubmittedAt`

`requireKYC()` allows `ADMIN`/`SUPERADMIN` and otherwise requires `APROBADO` or `VERIFICADO`.

Middleware enforces KYC/demo redirects for page navigation, not API authorization.

## Evidence

- [`../../prisma/schema.prisma`](../../prisma/schema.prisma): `User.rol`, `ProyectoUsuario`, relation enums, `SystemConfig`.
- [`../../lib/constants/roles.ts`](../../lib/constants/roles.ts): canonical role constants and hierarchy notes.
- [`../../lib/guards.ts`](../../lib/guards.ts): role, org, KYC, project, reservation, notification, CRM guards.
- [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts): configurable permission matrix.
- [`../../lib/project-access/get-project-access.ts`](../../lib/project-access/get-project-access.ts): project relation permission evaluator.
- [`../../lib/auth/registration-policy.ts`](../../lib/auth/registration-policy.ts): public role assignment policy.
- [`../../middleware.ts`](../../middleware.ts): admin dashboard route handling.

## Risks And Inconsistencies

### Role constants are not fully unified

- Location: [`../../lib/constants/roles.ts`](../../lib/constants/roles.ts), [`../../lib/guards.ts`](../../lib/guards.ts), inline role arrays across routes/actions.
- Observed behavior: canonical constants exist, but many checks still use string literals. `lib/guards.ts` also contains `USER`, which is not in the canonical role file or permission matrix.
- Risk: role behavior can drift when adding or changing roles.
- Evidence: `requireAnyRole([...])` calls across API routes/actions use literal arrays; `PERMISSION_ROLES` excludes `USER`.
- Possible impact: a role may gain UI access but fail server checks, or the reverse.
- Preliminary recommendation: document intended role vocabulary as canonical and gradually replace string literals during normal feature work.

### SUPERADMIN and ADMIN are close but not identical

- Location: [`../../lib/guards.ts`](../../lib/guards.ts), [`../../app/api/admin/role-permissions/route.ts`](../../app/api/admin/role-permissions/route.ts), [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts).
- Observed behavior: `SUPERADMIN` bypasses `requireRole(role)`, but `ADMIN` does not pass `requireRole("SUPERADMIN")`. `platform.config.manage` defaults to `SUPERADMIN` only.
- Risk: docs that say ADMIN is simply "super-admin" can hide important distinctions.
- Evidence: `requireRole` returns early for `SUPERADMIN`; role-permission API explicitly calls `requireRole("SUPERADMIN")`.
- Possible impact: operational confusion around who can change platform permission configuration.
- Preliminary recommendation: keep a distinct platform-admin vs admin distinction in docs and UI copy.

### Configurable permissions can diverge from hard-coded role guards

- Location: [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts), [`../../lib/guards.ts`](../../lib/guards.ts), admin pages/actions.
- Observed behavior: selected modules use `requirePermission`, while many legacy modules still use fixed roles.
- Risk: changing a permission override may not affect modules guarded by hard-coded role checks.
- Evidence: `users.manage`, `crm.admin`, and `platform.config.manage` are permission-driven; project/reservation/blog/plan actions mostly use role guards.
- Possible impact: admins may expect a permission override to grant broader access than it actually grants.
- Preliminary recommendation: label the current permission matrix as partial/module-scoped until each module has an explicit permission key.

## To Verify

- Whether any persisted users have roles outside the six canonical roles.
- Whether `USER` is dead code, seed data, or a future role.
- Complete mapping of every dashboard page to its matching server-side route/action guard.
- Whether legacy CRM write fallback remains required for production data.
