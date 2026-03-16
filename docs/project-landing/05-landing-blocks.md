# 05 — Landing Blocks: Project Landing System

## Block Architecture

Each section of the project landing page is a "block" controlled by
`ProjectLandingConfig`. Blocks are rendered conditionally — if the project
doesn't satisfy the block's requirements, it simply doesn't render.

All blocks receive data from `ProjectPublicView`, never from direct DB queries.

---

## Block Map

```
/proyectos/[slug]
│
├── [HERO]              Always rendered
│   ├── Source:         banner > heroImageUrl > fallback
│   ├── Controls:       config.showMasterplan (masterplan CTA)
│   │                   project.tours.length > 0 (tour CTA)
│   └── CTAs:           Masterplan, Tour360, Solicitar Información
│
├── [DETAILS]           Always rendered
│   ├── Source:         project.descripcion
│   └── Stat card:      unidadesDisponibles.length / totalUnidades
│
├── [GALLERY]           config.showGallery
│   ├── Source:         project.imagenes
│   └── Component:      PublicProjectGallery (existing, untouched)
│
├── [INVENTORY]         config.showUnidades && disponibles.length > 0
│   ├── Source:         project.unidadesDisponibles
│   ├── Limit:          config.maxUnidadesPublicas (default: 12)
│   └── CTA per unit:   → #simulador (anchor scroll)
│
├── [TOUR360 IFRAME]    config.showTour360 && project.tour360Url
│   └── Source:         project.tour360Url (external iframe)
│
├── [SIMULATOR]         config.showSimulator    ← NEW in Phase 1
│   ├── Component:      PaymentSimulator (components/public/payment-simulator.tsx)
│   ├── Config:         config.simulation (ProjectPaymentSimulationConfig)
│   ├── Input:          anticipo, cuota mensual, plazo
│   ├── Output:         orientative summary + CRM lead event
│   └── Action:         crearSimulacionFinanciacion() (lib/project-landing/actions.ts)
│
└── [CONTACT]           config.showContactForm
    ├── Source:         project.id
    └── Component:      ContactForm (existing, untouched)
```

---

## Block: HERO

**File:** `app/(public)/proyectos/[slug]/page.tsx`

Image priority: banner (Banner module) → `heroImageUrl` (adapter) → fallback Unsplash.

**CTAs shown conditionally:**
- "Ver Masterplan Interactivo" — only if `config.showMasterplan`
- "Tour Virtual 360°" — only if `project.tours.length > 0`
- "Solicitar Información" — always (anchor to #contacto)

---

## Block: SIMULATOR (Payment Simulator)

**Component:** `components/public/payment-simulator.tsx`

**Purpose:** Capture commercial intent with structured data for CRM.

**Two phases within the component:**
1. **Simulate** — User sets anticipo, cuota, plazo. Shows orientative summary.
2. **Send proposal** — Reveals contact form (nombre, WhatsApp, email, preferences).

**Inputs:**
| Field | Type | Required |
|-------|------|----------|
| Anticipo disponible | currency input | No (enables simulation) |
| Cuota mensual posible | currency input | No |
| Plazo deseado | select from `plazoOptions` | Yes |
| Nombre | text | Yes (to send) |
| WhatsApp | tel | Yes (to send) |
| Email | email | No |
| Quiere coordinar visita | checkbox | No |
| Prefiere WhatsApp | checkbox | Pre-checked |

**Legal disclaimer:** Always visible. Text from `config.simulation.disclaimer`.
Never implied as a binding financial offer.

**CRM output:**
- Creates or updates `Lead` via `crearSimulacionFinanciacion()`
- Rate-limited: 5 submissions / IP / 10 min
- Upserts on WhatsApp within same org (avoids duplicates)

---

## Future Blocks (Phase 2)

| Block | Trigger | Notes |
|-------|---------|-------|
| `[RESERVA CTA]` | `config.showReservaCTA` | Public reservation intent |
| `[BRANDING BANNER]` | `config.branding.logoUrl != null` | Custom org branding strip |
| `[MAP]` | `config.showMap` | Google Maps integration |
| `[TESTIMONIALS]` | `config.showTestimonials` | Proyecto.testimonios |
| `[DOCUMENTS]` | `config.showDocuments` | Public brochure downloads |

---

## Component Responsibilities

| Component | Responsibility | Touches DB? |
|-----------|---------------|-------------|
| `page.tsx` | Orchestrates data fetch via adapter | Via adapter only |
| `PaymentSimulator` | Simulation UI + proposal submission | Via server action |
| `ContactForm` | General contact lead | Via existing action |
| `PublicProjectGallery` | Gallery display | No (receives props) |
| `TourModal` | 360° tour launcher | No (receives props) |
| Adapter | All DB queries for public view | Yes — single place |
