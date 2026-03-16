# Architectural Rules — Mutation & Lead Ingestion

> **Status**: Enforced — established after Audit Round 2026-03-15.  
> These rules are the result of a full split-brain consolidation audit covering the real estate domain and Leads/CRM pipeline.

---

## Rule 1: Domain Mutations via Server Actions Only

**Scope**: All entities in the real estate domain (Reservas, Proyectos, Etapas, Unidades, Manzanas).

### Principle

All **write operations** (create, update, delete) on domain entities **must** be performed exclusively through **Next.js Server Actions** located in `lib/actions/`.

**API Routes** (`app/api/`) are reserved **only** for:
- Read/query operations (`GET` handlers)
- Exposing data to external consumers (Zapier, integrations)
- Webhooks receiving inbound data from external platforms

### Rationale

Allowing mutations from both API Routes and Server Actions creates "split-brain" state where:
- Two sources of truth compete for the same domain
- Authorization logic diverges silently
- Business rules (e.g., LogicToop dispatch, state transitions) execute inconsistently

### Enforced Canonical Sources

| Domain | Canonical Mutation File |
|:---|:---|
| Reservas | `lib/actions/reservas.ts` (`createReserva`, `gestionarReserva`, `approveReserva`, etc.) |
| Proyectos | `lib/actions/proyectos.ts` (`createProyecto`, `updateProyecto`) |
| Etapas | `lib/actions/etapas.ts` (`createEtapa`, `updateEtapa`, `deleteEtapa`) |
| Unidades | `lib/actions/unidades.ts` |
| Manzanas | `lib/actions/manzanas.ts` |

### What was Eliminated

As of 2026-03-15:
- `POST /api/reservas` — **removed**
- `PUT /api/reservas/[id]` — **removed**
- `PUT /api/proyectos/[id]` — **removed**
- `POST /api/proyectos/[id]/etapas` — **removed**

---

## Rule 2: All Lead Ingestion via `executeLeadReception`

**Scope**: Any point in the system that creates a new `Lead` record.

### Principle

Every operational lead **must** transit through the central pipeline:

```typescript
import { executeLeadReception } from "@/lib/crm-pipeline";

const result = await executeLeadReception({
    nombre: "...",
    orgId: "...",
    sourceType: "MANUAL" | "LANDING" | "API_CRM" | "WEBHOOK_META" | ...
    // ... other fields
});
```

### The Pipeline Guarantees

Every lead created via `executeLeadReception` automatically receives:
1. **Tenant resolution enforcement** — leads without `orgId` are quarantined to `LeadIntake`
2. **AI Lead Scoring** — `aiLeadScoring(lead.id)` fires asynchronously
3. **Opportunity creation** — auto-created if `proyectoId` is present
4. **Native Tenant Workflows** — all `NEW_LEAD` workflows for the org are triggered
5. **LogicToop Dispatch** — `dispatchTrigger("NEW_LEAD", ...)` is always called
6. **Audit Log** — every creation is traceable to a source type

### Prohibited Patterns

The following patterns are **not allowed** outside of `lib/crm-pipeline.ts`:

```typescript
// ❌ FORBIDDEN — bypass pipeline
prisma.lead.create({ ... })
db.lead.create({ ... })
prisma.lead.createMany({ ... })
db.lead.createMany({ ... })
```

### Exceptions (must be documented in code)

| File | Reason | Status |
|:---|:---|:---|
| `lib/crm-pipeline.ts` | Definition of the pipeline itself | ✅ Authorized |

> Any new exception must be documented inline with a comment `// @lead-create-authorized: <reason>` and must be added to this table.

### Authorized Entry Points (as of 2026-03-15)

| Source | File | Call Site |
|:---|:---|:---|
| Dashboard / Manual | `lib/actions/leads.ts` | `createLead` → line 110 |
| Bulk Import | `lib/actions/leads.ts` | `bulkCreateLeads` → line 223 |
| Landing Form | `lib/actions/leads.ts` | `crearLeadLanding` → line 366 |
| Contact Form | `lib/actions/leads.ts` | `crearConsultaContacto` → line 427 |
| WhatsApp Bot | `lib/actions/ai.ts` | `processIncomingLeadMessage` → line 130 |
| WhatsApp Community | `lib/actions/ai.ts` | `joinOpenCommunity` → line 324 |
| CRM API (External) | `app/api/crm/leads/route.ts` | POST handler → line 57 |
| Public Form API | `app/api/leads/public/route.ts` | POST handler → line 53 |
| Meta Ads Webhook | `app/api/webhooks/meta/route.ts` | POST handler → line 126 |
| TikTok Webhook | `app/api/webhooks/tiktok/route.ts` | POST handler → line 79 |
| Financial Simulator | `lib/project-landing/actions.ts` | `crearSimulacionFinanciacion` |

---

## Enforcement

Run the automated guardrail locally or in CI:

```powershell
# From the repo root:
.\scripts\check-lead-create.ps1
```

This script will exit with code `1` if any unauthorized `lead.create` calls are detected outside of approved files.
