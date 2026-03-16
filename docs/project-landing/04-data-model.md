# 04 — Data Model: Project Landing System

## Overview

The Project Landing System uses a **decoupled contract** to isolate public pages
from the internal Prisma `Proyecto` model. Changes to the internal model are
absorbed by the adapter layer — public pages never break.

---

## Public Contract Types (`lib/project-landing/types.ts`)

### `ProjectPublicView`
The complete public representation of a project. All public pages depend on this.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Proyecto cuid |
| `nombre` | `string` | Display name |
| `slug` | `string \| null` | URL slug |
| `descripcion` | `string \| null` | Project description |
| `ubicacion` | `string \| null` | Location string |
| `tipo` | `string` | e.g. URBANIZACION, EDIFICIO |
| `estado` | `string` | e.g. ACTIVO, PROXIMO |
| `heroImageUrl` | `string \| null` | Resolved: imagenPortada > gallery primary |
| `hasMasterplan` | `boolean` | Whether masterplanSVG is set |
| `hasTour360Url` | `boolean` | Whether external tour360Url is set |
| `tour360Url` | `string \| null` | External iframe URL |
| `imagenes` | `ProjectPublicImage[]` | Gallery images |
| `tours` | `ProjectPublicTour[]` | 360° tour records with scenes |
| `unidadesDisponibles` | `ProjectPublicUnit[]` | DISPONIBLE units only |
| `totalUnidades` | `number` | All units across all etapas |
| `config` | `ProjectLandingConfig` | Block visibility + simulation config |
| `mapCenterLat/Lng` | `number` | For future map integration |
| `orgId` | `string \| null` | For CRM routing |

### `ProjectPublicUnit`

Minimal public representation of a Unidad. No internal fields exposed.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | For deep-link to `/unidades/[id]` |
| `numero` | `string` | Display label |
| `tipo` | `string` | LOTE, DEPARTAMENTO, etc. |
| `estado` | `UnitEstado` | DISPONIBLE, RESERVADA, VENDIDA, BLOQUEADA |
| `superficie` | `number \| null` | m² |
| `frente`, `fondo` | `number \| null` | Dimensions |
| `precio` | `number \| null` | Raw number (use formatCurrency for display) |
| `moneda` | `string` | USD, ARS, etc. |
| `etapaNombre`, `manzanaNombre` | `string \| null` | Context labels |

### `ProjectLandingConfig`

Controls which blocks render on the landing page.

| Field | Default | Notes |
|-------|---------|-------|
| `showGallery` | `true` | |
| `showMasterplan` | `!!masterplanSVG` | Derived from project |
| `showTour360` | `!!tour360Url` | Derived from project |
| `showUnidades` | `true` | |
| `showSimulator` | `true` | Payment simulator block |
| `showContactForm` | `true` | |
| `maxUnidadesPublicas` | `12` | Grid limit |
| `branding` | `ProjectBrandingConfig` | Phase 2: persisted overrides |
| `simulation` | `ProjectPaymentSimulationConfig` | Simulator configuration |

### `ProjectBrandingConfig`

Phase 1: all fields are `null` (safe fallbacks apply in the UI).
Phase 2: populated from a `ProjectBrandingOverride` table (future).

### `ProjectPaymentSimulationConfig`

Controls the commercial simulator block.

| Field | Default |
|-------|---------|
| `enabled` | `true` |
| `minDownPaymentPct` | `10` |
| `maxDownPaymentPct` | `80` |
| `plazoOptions` | `[12, 24, 36, 48, 60, 72, 84, 96]` |
| `currency` | `"USD"` |
| `disclaimer` | Legal disclaimer text (always visible) |

---

## Simulation CRM Storage

Simulation events are stored using the existing `Lead` model (no migration needed).

### Field mapping

| SimulationLeadPayload field | Lead field | Notes |
|----------------------------|------------|-------|
| `nombre` | `nombre` | |
| `whatsapp` | `telefono` | |
| `email` | `email` | optional |
| `proyectoId` | `proyectoId` | |
| `unidadId` | `unidadInteres` | string ID, existing pattern |
| `origen` | `origen` | "SIMULADOR_LANDING" or "SIMULADOR_UNIDAD" |
| `anticipo`, `cuota`, `plazo`, ... | `notas` | Stored as `SimulationCRMMetadata` JSON |

### `SimulationCRMMetadata` (JSON in `Lead.notas`)

```json
{
  "eventoTipo": "SIMULACION_FINANCIACION",
  "anticipoDisponible": 15000,
  "cuotaMensualPosible": 500,
  "plazoMeses": 48,
  "unidadId": "clx...",
  "unidadNumero": "42",
  "quiereVisita": true,
  "quiereWhatsApp": true,
  "origen": "SIMULADOR_LANDING",
  "moneda": "USD",
  "generadoEn": "2026-03-14T12:00:00.000Z"
}
```

### Future: dedicated SimulationEvent model (Phase 2)

When analytics on simulation funnels are needed, extract this to a proper model:

```prisma
model SimulationEvent {
  id               String   @id @default(cuid())
  leadId           String   @relation(...)
  proyectoId       String
  unidadId         String?
  anticipo         Decimal  @db.Decimal(18,2)
  cuotaMensual     Decimal  @db.Decimal(18,2)
  plazoMeses       Int
  quiereVisita     Boolean
  moneda           String
  origen           String
  createdAt        DateTime @default(now())
}
```

---

## Visibility Rule

**Single source of truth:** `lib/project-landing/adapter.ts`

```ts
export function isProjectPubliclyVisible(project): boolean
export const PUBLIC_PROJECT_WHERE  // Prisma where clause
```

All public pages must use one of these — never inline the conditions.
