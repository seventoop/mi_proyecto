# Units And Inventory

This document maps the inventory model under `Proyecto`: `Etapa -> Manzana -> Unidad`. It complements [`projects.md`](projects.md) and [[data-model]].

## Core Chain

`Proyecto` owns ordered `Etapa` records. Each `Etapa` owns `Manzana` records. Each `Manzana` owns `Unidad` records.

Tenant context is inherited from `Proyecto`; `Etapa`, `Manzana`, and `Unidad` do not carry `orgId`.

## Etapa

Schema:

- PK: `id`.
- Parent: `proyectoId`.
- Fields: `nombre`, `orden`, `estado`, timestamps.
- Default state: `PENDIENTE`.
- Index: `proyectoId`.
- Cascade: deleted with parent project; child manzanas cascade from etapa.

Confirmed behavior:

- Server Actions in [`../../lib/actions/etapas.ts`](../../lib/actions/etapas.ts) validate IDs, resolve project ownership, and revalidate project pages.
- `createEtapa` auto-calculates next `orden` when absent.
- `updateEtapa` and `deleteEtapa` resolve etapa -> project before `requireProjectOwnership`.
- `GET/POST /api/proyectos/[id]/etapas` is now guarded with `requireProjectOwnership` and validates project ID.
- `DELETE /api/proyectos/[id]/reset` can delete all etapas for a project during admin reset.

Gap:

- `etapaCreateSchema` includes `descripcion`, but Prisma `Etapa` has no `descripcion` field. If passed through `data`, this could be inconsistent with current Prisma model expectations.

## Manzana

Schema:

- PK: `id`.
- Parent: `etapaId`.
- Fields: `nombre`, `coordenadas`, timestamps.
- Index: `etapaId`.
- Cascade: deleted with parent etapa; child unidades cascade from manzana.

Confirmed behavior:

- Server Actions in [`../../lib/actions/manzanas.ts`](../../lib/actions/manzanas.ts) resolve etapa/manzana to project and use `requireProjectOwnership`.
- `getManzanas`, `createManzana`, `updateManzana`, and `deleteManzana` all traverse back to project before returning or mutating data.

Gap:

- Action schemas use `coordsGeoJSON`, while Prisma uses `coordenadas`. This looks like naming drift unless transformed elsewhere by callers.

## Unidad

Schema:

- PK: `id`.
- Parent: `manzanaId`.
- State: `estado`, default `DISPONIBLE`.
- Commercial fields: `tipo`, `superficie`, dimensions, orientation, `precio`, `moneda`, `financiacion`.
- Map/media fields: `geoJSON`, `centerLat`, `centerLng`, `coordenadasMasterplan`, `imagenes`, `tour360Url`, `polygon`.
- Assignment: optional `responsableId`.
- Reservation control: `bloqueadoHasta`.
- Indexes: `manzanaId`, `estado`, `responsableId`, `[manzanaId, estado]`.
- Relations: histories, map images, opportunities, reservations, tours/hotspots.

Confirmed behavior:

- Server Actions in [`../../lib/actions/unidades.ts`](../../lib/actions/unidades.ts) use `requireProjectOwnership` for create/update/delete/status/assignment after resolving unit -> project.
- `getUnidades` and `getProjectBlueprintData` require auth and enforce org boundary directly for non-admin users.
- API `POST /api/unidades` allows `ADMIN`, `SUPERADMIN`, `DESARROLLADOR`, and `VENDEDOR`; it checks that target manzana and optional responsible user belong to the caller's org for non-admins.
- API `GET/PUT/DELETE /api/unidades/[id]` resolves unit -> project org and enforces same-org for non-admins. `PUT` also checks target `manzanaId` and `responsableId` to prevent cross-tenant reassignment.
- Unit status changes may create `HistorialUnidad`, audit entries, and realtime Pusher events depending on surface.
- Public helpers normalize unit states through `normalizeUnitEstado`.

## Unit States

Schema does not use an enum. Current normalized public states are:

- `DISPONIBLE`
- `RESERVADA`
- `VENDIDA`
- `BLOQUEADA`
- `SUSPENDIDO`

Normalization accepts variants such as `RESERVADO`, `RESERVADA_PENDIENTE`, `VENDIDO`, `BLOQUEADO`, and `SUSPENDIDA`.

Inconsistency: some project stats code checks `RESERVADO`/`VENDIDO`, while other code checks `RESERVADA`/`VENDIDA`. Public normalization masks this for public UI, but internal reporting may still differ by surface.

## Reservations

Schema:

- `Reserva` links required `unidadId`, required `vendedorId`, optional `leadId`, optional buyer user/data.
- State fields: `estado`, `estadoPago`, `fechaVencimiento`, `documentoGenerado`.
- Indexes: unit, lead, buyer, seller, state, created date.
- Cascade: deleting unit, lead, or seller cascades reservations as configured.

Confirmed behavior:

- `POST /api/reservas` requires `ADMIN`, `SUPERADMIN`, `VENDEDOR`, or `DESARROLLADOR`.
- It runs a transaction, loads unit with project org, checks same-org for non-admins, verifies lead org when non-admin, and requires `unidad.estado === "DISPONIBLE"`.
- It creates reservation with `estado = PENDIENTE_APROBACION`.
- Server Action reservation flows use project access permission `RESERVAR`, which depends on `puedeReservarse` and non-blocking project state.

## Investment Link

`Unidad` does not directly model investment. Investment is project-level through `Inversion`:

- `crearInversion` checks KYC/demo eligibility.
- It requires project `invertible = true`.
- It validates that `m2VendidosInversores + m2Comprados` does not exceed `metaM2Objetivo`.
- Admin confirmation moves investment to escrow and increments project sold m2.

## Masterplan And Map Data

Inventory is tied to multiple map/media fields:

- `Proyecto.masterplanSVG`: persisted blueprint/masterplan SVG.
- `Unidad.coordenadasMasterplan`: per-unit coordinates on masterplan.
- `Proyecto.overlayUrl`, `overlayBounds`, `overlayRotation`, map center/zoom: map overlay configuration.
- `ImagenMapa`: geolocated project/unit images.
- `Infraestructura`: project-level geometry/progress.
- `Tour360` and `Hotspot`: visual tour relationships, optionally linked to units.

Reset endpoint `POST /api/proyectos/[id]/reset` can clear masterplan, reset unit fields, clear overlay/map config, and delete 360 tours. It is admin/superadmin-only plus project ownership guard.

## Access Matrix

| Surface | Read | Write |
|---|---|---|
| Etapa Server Actions | `requireProjectOwnership` | `requireProjectOwnership` |
| Manzana Server Actions | resolve to project + `requireProjectOwnership` | resolve to project + `requireProjectOwnership` |
| Unidad Server Actions | auth + org/project checks | `requireProjectOwnership` |
| `/api/unidades` | no GET in current route | role + same-org manzana/responsible checks |
| `/api/unidades/[id]` | auth + same-org for non-admin | role + same-org current/target checks |
| Public project pages | public visibility helpers | no writes |

## Inconsistencies And Gaps

- State vocabulary is not centralized in Prisma enums; code handles multiple string variants.
- Some inventory actions use schemas with fields not matching Prisma names.
- API unit mutations use role + org checks, while Server Actions use `requireProjectOwnership`; this means API write access may be broader than relation-level project permissions for same-org users with allowed roles.
- Public project data has a newer adapter/showcase layer, but historical docs/audits include warnings that should be re-verified before relying on them.

## Sources

- [`../../prisma/schema.prisma`](../../prisma/schema.prisma)
- [`../../lib/actions/etapas.ts`](../../lib/actions/etapas.ts)
- [`../../lib/actions/manzanas.ts`](../../lib/actions/manzanas.ts)
- [`../../lib/actions/unidades.ts`](../../lib/actions/unidades.ts)
- [`../../app/api/unidades/route.ts`](../../app/api/unidades/route.ts)
- [`../../app/api/unidades/[id]/route.ts`](../../app/api/unidades/%5Bid%5D/route.ts)
- [`../../app/api/reservas/route.ts`](../../app/api/reservas/route.ts)
- [`../../lib/public-projects.ts`](../../lib/public-projects.ts)
