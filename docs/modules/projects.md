# Projects Module

This document describes the functional `Proyecto` module from the current codebase. It should be read with [[data-model]], [[multi-tenancy]], [[roles-and-permissions]], and [`units-and-inventory.md`](units-and-inventory.md).

## Confirmed Scope

`Proyecto` is the central business object. It carries:

- product/catalog data: name, slug, description, location, type, status, cover image, gallery fields;
- tenant and ownership: `orgId`, `creadoPorId`, `ProyectoUsuario`;
- public visibility: `visibilityStatus`, `deletedAt`, demo flags;
- validation lifecycle: `estadoValidacion`, operational flags, state logs;
- commercial/investment flags: `invertible`, m2/price/funding fields;
- maps/media: `masterplanSVG`, map center/zoom, overlay config, `tour360Url`, `planGallery`;
- AI sales context: `aiKnowledgeBase`, `aiSystemPrompt`;
- relations to inventory, leads, opportunities, reservations, investment, documentation, media, banners, infrastructure, tours, payments, tasks, testimonials.

## Creation Paths

### Server Action `createProyecto`

Confirmed source: [`../../lib/actions/proyectos.ts`](../../lib/actions/proyectos.ts).

- Requires `requireAuth()`.
- Validates inline `proyectoCreateSchema`.
- Required business fields: `nombre`, `ubicacion`.
- Generates a unique slug from `slug` or `nombre`.
- Non-admin users must be KYC `VERIFICADO` or have an active 48h demo period.
- Non-admin projects:
  - `estadoValidacion = BORRADOR`;
  - flags derived from `flagsFromEstado(BORRADOR)`, so publish/reserve/lead-capture flags are false;
  - `isDemo` is true when the user is not verified but has demo access.
- `ADMIN` and `SUPERADMIN`:
  - bypass KYC/demo checks;
  - start at `estadoValidacion = APROBADO`;
  - flags are enabled by `flagsFromEstado(APROBADO)`.
- Sets `creadoPorId = user.id`, `orgId = user.orgId`, `visibilityStatus = PUBLICADO`.
- Creates an active `ProyectoUsuario` OWNER relation when `user.orgId` exists.
- Writes audit log `CREATE_PROJECT`.
- If demo, marks `User.demoUsed = true`.

### API `POST /api/proyectos`

Confirmed source: [`../../app/api/proyectos/route.ts`](../../app/api/proyectos/route.ts).

- Requires `requireAnyRole(["ADMIN", "DESARROLLADOR"])`.
- Creates a simpler project with `orgId`, `creadoPorId`, JSON-encoded `galeria`/`documentos`.
- Does not include the same KYC/demo logic, slug generation, validation-state setup, OWNER relation creation, or audit logic seen in the Server Action.

### API `POST /api/developments`

Confirmed source: [`../../app/api/developments/route.ts`](../../app/api/developments/route.ts).

- Requires `ADMIN` or `DESARROLLADOR`.
- Duplicates the simpler project creation style.
- Appears to be an alias/legacy API surface around `Proyecto`.

## State And Flags

### `estado`

String field defaulting to `PLANIFICACION`. It is used broadly as a general project status and public visibility filter. Public helpers hide projects whose `estado` is in `SUSPENDIDO`, `CANCELADO`, `ELIMINADO`, or `DESACTIVADO`.

### `visibilityStatus`

String field defaulting to `PUBLICADO`. Public helpers require `PUBLICADO`. `expire-demo-projects` sets expired demo projects to `DESPUBLICADO` and `estado = SUSPENDIDO`.

Confirmed public visibility rule from [`../../lib/public-projects.ts`](../../lib/public-projects.ts):

- `deletedAt` must be null;
- `visibilityStatus` must be `PUBLICADO`;
- `estado` must not be hidden/suspended/cancelled/deleted/deactivated;
- demo projects must have non-expired `demoExpiresAt`.

### `estadoValidacion`

Enum field defaulting to `BORRADOR`. State machine source: [`../../lib/project-access/transition-state.ts`](../../lib/project-access/transition-state.ts).

Confirmed states:

- `BORRADOR`
- `PENDIENTE_VALIDACION`
- `EN_REVISION`
- `APROBADO`
- `OBSERVADO`
- `RECHAZADO`
- `SUSPENDIDO`

Owner transitions:

- `BORRADOR -> PENDIENTE_VALIDACION`
- `OBSERVADO -> PENDIENTE_VALIDACION`

Admin transitions:

- `PENDIENTE_VALIDACION -> EN_REVISION | BORRADOR`
- `EN_REVISION -> APROBADO | OBSERVADO | RECHAZADO | BORRADOR`
- `APROBADO -> SUSPENDIDO | BORRADOR`
- `SUSPENDIDO -> APROBADO | BORRADOR`
- `RECHAZADO -> BORRADOR`
- `BORRADOR -> PENDIENTE_VALIDACION`
- `OBSERVADO -> PENDIENTE_VALIDACION | BORRADOR`

### Operational Flags

Fields:

- `puedePublicarse`
- `puedeReservarse`
- `puedeCaptarLeads`

`flagsFromEstado` sets all three true only when `estadoValidacion === APROBADO`; otherwise false. `RECHAZADO` and `SUSPENDIDO` are blocking states and clear admin overrides. Admin can manually override flags through `adminOverrideFlagsAction`, except in blocking states.

Observed use:

- `ProjectPermission.PUBLICAR`, `RESERVAR`, and `CAPTAR_LEADS` check flags and blocking states.
- `createLead` checks `CAPTAR_LEADS`; if disabled, it quarantines input to `LeadIntake`.
- `crearReserva` checks `RESERVAR` through project access before reservation creation.
- Public showcase exposes `leadCaptureEnabled` and `reservationEnabled` from these flags.

## Lifecycle Reconstruction

Confirmed lifecycle:

1. Creation:
   - Server Action creates full lifecycle metadata; API creation paths are lighter and may skip relation/validation setup.
2. Draft/configuration:
   - Non-admin Server Action projects start `BORRADOR`.
   - Inventory/media/documentation can be configured through project-owned routes/actions.
3. Submission:
   - Owner calls `submitProyectoParaValidacion` from `BORRADOR` or `OBSERVADO`.
4. Admin review:
   - Admin transitions through `PENDIENTE_VALIDACION`, `EN_REVISION`, and then `APROBADO`, `OBSERVADO`, or `RECHAZADO`.
5. Operational enablement:
   - `APROBADO` enables publish/reserve/lead-capture flags unless overridden.
6. Public exposure:
   - Requires public visibility filters; `visibilityStatus` alone is not enough.
7. Lead capture:
   - Project-aware lead creation requires `CAPTAR_LEADS` for non-admin paths.
8. Reservation:
   - Reservation logic resolves unit -> project and checks availability and tenant boundary; Server Actions also use project permission `RESERVAR`.
9. Investment:
   - Requires `Proyecto.invertible = true`; confirmed investment increments project sold m2 when admin confirms.
10. Suspension/demo expiry:
   - Validation state can move to `SUSPENDIDO`.
   - Demo cron despublishes expired demo projects.

Soft delete / archive is a gap: `deletedAt` exists and is respected by many reads, but current delete paths inspected use hard delete.

## Access And Ownership

### Who Sees Projects

- Public users see projects through public adapters only when `buildPublicProjectWhere()` / `isProjectPubliclyVisible()` passes.
- Developer dashboard project list:
  - `ADMIN`/`SUPERADMIN` sees all.
  - Other users see same-org projects where they have an active `ProyectoUsuario` relation or are legacy `creadoPorId`.
- API detail `/api/proyectos/[id]`:
  - requires auth;
  - non-admin users must share `orgId` with the project, otherwise 404.

### Who Edits Projects

- Most project mutations use `requireProjectOwnership(projectId)`.
- `requireProjectOwnership` delegates to `getProjectAccess` and requires `EDITAR_PROYECTO`.
- `ADMIN`/`SUPERADMIN` bypass project ownership checks in guard logic.

### ProyectoUsuario Resolution

Resolution order in `getProjectAccess`:

1. `ADMIN`/`SUPERADMIN`: management access.
2. Explicit `ProyectoUsuario` row for user/project.
3. Legacy fallback: `Proyecto.creadoPorId === user.id`, only when no conflicting active OWNER exists.

Relation defaults are defined in `assignUserToProject`:

| Relation | Typical permissions |
|---|---|
| `OWNER` | edit, docs, global leads, global metrics |
| `COLABORADOR` | documentation only |
| `VENDEDOR_ASIGNADO` | own leads/metrics only by default |
| `COMERCIALIZADOR_EXCLUSIVO` | global leads/metrics by default, mandate-controlled |
| `COMERCIALIZADOR_NO_EXCLUSIVO` | own leads/metrics only by default |
| `SOLO_LECTURA` | no mutation/global visibility permissions |

No cross-organization project sharing was confirmed for non-admin users. `ProyectoUsuario.orgId` and target-user checks keep relations within an Organization; admin can assign with explicit override paths.

## Project Relationships

- Inventory: `Proyecto -> Etapa -> Manzana -> Unidad`.
- Documentation: `Documentacion` and `proyecto_archivos`; public showcase includes approved/pending documents and publicly visible files.
- Leads and opportunities: `Lead.proyectoId`, `Oportunidad.proyectoId`; lead creation and visibility depend on org and project permissions.
- Reservations: linked through `Unidad`; reservation access resolves back to project.
- Investment: `Inversion.proyectoId`; project has `invertible`, `precioM2Inversor`, `metaM2Objetivo`, `m2VendidosInversores`, `fechaLimiteFondeo`.
- Public media: `ProyectoImagen`, `ImagenMapa`, `Infraestructura`, `Tour360`, `Testimonio`, `Banner`.
- AI: `aiKnowledgeBase` and `aiSystemPrompt` are used by AI lead/sales actions to shape prompts.
- Automation: native `Workflow` is org-scoped rather than project-scoped; LogicToop triggers can carry `proyectoId`.

## Inconsistencies And Gaps

- `visibilityStatus` default/publication: new Server Action projects get `PUBLICADO` even when `estadoValidacion = BORRADOR`; effective public visibility depends on combined filters and may be surprising.
- Hard delete vs soft delete: `deletedAt` is modeled and filtered, but inspected delete paths call `prisma.proyecto.delete`.
- Duplicate creation surfaces: Server Action and API routes do not apply the same lifecycle side effects.
- `/api/developments` duplicates project APIs and appears legacy/compatibility-oriented.
- `documentacionEstado` and `estadoValidacion` are separate state systems; both are used in UI/actions, and their exact product boundary should be clarified.
- `lib/validations/proyectos.ts` is a stub; real schemas are inline.
- Historical audit docs mention public route visibility gaps; current public project page uses `project-showcase`/public helpers, but older audit notes should not be treated as current without re-checking.

## Sources

- [`../../prisma/schema.prisma`](../../prisma/schema.prisma)
- [`../../lib/actions/proyectos.ts`](../../lib/actions/proyectos.ts)
- [`../../app/api/proyectos/route.ts`](../../app/api/proyectos/route.ts)
- [`../../app/api/proyectos/[id]/route.ts`](../../app/api/proyectos/%5Bid%5D/route.ts)
- [`../../app/api/developments/route.ts`](../../app/api/developments/route.ts)
- [`../../lib/actions/project-state-actions.ts`](../../lib/actions/project-state-actions.ts)
- [`../../lib/project-access`](../../lib/project-access)
- [`../../lib/public-projects.ts`](../../lib/public-projects.ts)
- [`../../lib/project-showcase.ts`](../../lib/project-showcase.ts)
