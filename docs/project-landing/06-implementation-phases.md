# 06 — Implementation Phases: Project Landing System

## Phase 1 — COMPLETED (2026-03-14)

### What was implemented

#### Architecture
- `lib/project-landing/types.ts` — Full public contract (types, constants, configs)
- `lib/project-landing/adapter.ts` — Adapter/service layer + centralized visibility
- `lib/project-landing/actions.ts` — CRM server action for simulation events

#### Components
- `components/public/payment-simulator.tsx` — Commercial simulator with CRM integration
  (does NOT replace `financing-simulator.tsx` — both coexist)

#### Pages refactored
- `app/(public)/proyectos/[slug]/page.tsx` — Uses adapter, adds simulator block
- `app/(public)/proyectos/page.tsx` — Uses `PUBLIC_PROJECT_WHERE` from adapter

### What was left intentionally untouched
- `components/public/financing-simulator.tsx` — Preserved, used in unit detail page
- `components/public/contact-form.tsx` — Preserved, unchanged
- `lib/actions/leads.ts` — Preserved, unchanged
- `app/api/leads/public/route.ts` — Preserved, unchanged
- All dashboard routes and authenticated flows — Not touched
- Masterplan, Tour360, unit detail pages — Not touched

### Decoupling achieved
- Public pages no longer contain inline Prisma queries with scattered `visibilityStatus: "PUBLICADO"` strings
- `isProjectPubliclyVisible()` and `PUBLIC_PROJECT_WHERE` are the single source of truth
- `ProjectPublicView` contract isolates public pages from internal model changes
- Simulation data stored as structured JSON in `Lead.notas` — no migration needed

---

## Phase 2 — Recommended Next Steps

### Priority: HIGH

#### 2a. Centralize remaining public pages

Pages that still query `Proyecto` directly:
- `app/(public)/proyectos/[slug]/masterplan/page.tsx` — uses own `db.proyecto.findFirst`
- `app/(public)/proyectos/[slug]/tour360/page.tsx` — uses own `db.proyecto.findUnique`
- `app/(public)/proyectos/[slug]/unidades/[id]/page.tsx` — uses own `db.unidad.findUnique`

**Action:** Extend adapter with `getProjectPublicMasterplanData(slug)` and
`getProjectPublicTourData(slug)` to centralize their queries too.
Note: `unidades/[id]` is lower risk as it doesn't expose project-level visibility.

#### 2b. Public reservation CTA

Add a `[RESERVA CTA]` block on the landing for units with `estado === "DISPONIBLE"`.
Flow: Landing → intent form → lead with `origen: "INTENCION_RESERVA"` → manual processing.

**Important:** Do NOT wire this to the authenticated reserva flow yet.
Create a separate `crearInteresCivil()` action that creates a structured lead intent.

#### 2c. LogicToop automation trigger

When `Lead.origen === "SIMULADOR_LANDING"` or `"SIMULADOR_UNIDAD"`, trigger
a LogicToop workflow node `SIMULATION_RECEIVED`.

Implementation: add a `afterSimulationLead()` hook in `lib/project-landing/actions.ts`
that calls the workflow engine if the org has an automation for that event type.

---

### Priority: MEDIUM

#### 2d. ProjectBrandingConfig persistence

Add a `ProjectBrandingOverride` model:

```prisma
model ProjectBrandingOverride {
  id           String  @id @default(cuid())
  proyectoId   String  @unique
  primaryColor String?
  heroGradient String?
  logoUrl      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  proyecto     Proyecto @relation(...)
}
```

The adapter's `buildBranding()` function already expects this — it will just
read `null` until Phase 2 populates the values.

#### 2e. ProjectLandingConfig persistence

Similarly, persist `showGallery`, `showUnidades`, `showSimulator`, etc. per project.
This allows developers to hide blocks they don't want shown.

#### 2f. Map block

Replace the current "Mapa de Ubicación (placeholder)" with a real Google Maps embed
using `project.mapCenterLat` / `project.mapCenterLng` from the adapter.

---

### Priority: LOW

#### 2g. Testimonials block

Surface `Proyecto.testimonios` as a public block (they exist in the DB but aren't
rendered on the landing).

#### 2h. Analytics events

Emit custom events (e.g. via `analytics.ts`) when:
- Landing page is viewed
- Simulator is used (before submission)
- Proposal is sent
- Contact form is submitted

These can feed into a future dashboard analytics view.

---

## Known Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `ProjectsFilter` depends on full Prisma `Proyecto` type | `PUBLIC_PROJECT_WHERE` is imported, query result shape preserved. Adapter not yet used for the directory (safe for now). |
| `Lead.unidadInteres` is a string, not a FK | Existing pattern — acceptable for Phase 1. Phase 2 can add proper FK if needed. |
| `isProjectPubliclyVisible()` and `PUBLIC_PROJECT_WHERE` could diverge | They're defined side by side in adapter.ts — review both if you change the rule. |
| Simulation rate limit (5/10min) too strict for high-traffic events | Adjust `SIMULATION_RATE_LIMIT` in `lib/project-landing/actions.ts`. |
| `Lead.notas` stores structured JSON + human text | If Phase 2 adds a `SimulationEvent` model, migrate by parsing existing notas JSON. |
