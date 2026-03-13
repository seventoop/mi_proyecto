# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run typecheck    # TypeScript check (no emit)
npm run lint         # ESLint
npm run check-all    # typecheck + build
npm run build        # Production build

# Database
docker-compose up -d          # Start local Postgres on port 5433
npm run db:migrate:dev        # Create and apply new migration
npm run db:migrate:deploy     # Apply migrations (production)
npm run db:migrate:status     # Check migration status
npm run db:seed               # Seed database
npm run db:studio             # Open Prisma Studio
```

## Architecture

### Route Groups
- `app/(auth)/` — Login, register, forgot/reset password. No sidebar.
- `app/(public)/` — Public-facing marketing site and project pages.
- `app/(dashboard)/dashboard/` — Authenticated app. Role-scoped sub-routes.

### Dashboard Role Routes
Each role has its own subtree under `/dashboard/`:
- `/dashboard/` (INVERSOR/CLIENTE) — Portfolio, reservas, KYC
- `/dashboard/developer/` — DESARROLLADOR projects, CRM, leads
- `/dashboard/admin/` — ADMIN super-admin panel
- `/dashboard/portafolio/` — Investor portfolio management

### Page Pattern
- `page.tsx` = Server Component: handles auth guards + data fetching
- `page-client.tsx` or `*-client.tsx` = `"use client"` island for interactive UI

### Auth & Guards (`lib/guards.ts`)
Always call guards at the top of Server Actions and API routes:
```ts
const user = await requireAuth();           // any authenticated user
const user = await requireRole("ADMIN");    // specific role
const user = await requireAnyRole(["DESARROLLADOR", "ADMIN"]);
const user = await requireProjectOwnership(projectId);
const user = await requireKYC();           // APROBADO or VERIFICADO status
```

Error handling wrappers:
- `handleGuardError(error)` — for Server Actions (returns `{ success: false, error }`)
- `handleApiGuardError(error)` — for API routes (returns `NextResponse`)
- `withAdminGuard(handler)` — HOC for ADMIN-only API routes

`AuthUser` type (returned by all guards): `{ id, email, name, role, orgId, kycStatus, demoEndsAt }`

### Multi-Tenancy
Every non-ADMIN user belongs to an `Organization` via `user.orgId`. Always scope Prisma queries:
```ts
prisma.proyecto.findMany({ where: { ...orgFilter(user), ...otherFilters } })
```
ADMIN bypasses org scoping (sees all data).

### Session
`session.user` is typed in `types/next-auth.d.ts` and includes: `id`, `role`, `orgId`, `kycStatus`, `demoEndsAt`. The JWT callback re-fetches `role/orgId/kycStatus/demoEndsAt` from DB on every request (live role updates).

### SaaS Plan Limits (`lib/saas/limits.ts`)
Check before creating resources:
```ts
await checkPlanLimit(user.orgId, "tour360")   // feature flag
await enforceLimit(user.orgId, "leads", count) // quota check
```
Features: `crm`, `banners`, `tour360`, `masterplan`, `inventario`, `workflows`, `blog`.
Resources: `leads`, `proyectos`, `users`, `automations`.

### Data Model (Prisma)
Core hierarchy: `Organization → Proyecto → Etapa → Manzana → Unidad`
- `Reserva` links `Unidad` + vendedor + comprador
- `Tour360 → TourScene → Hotspot` (360° virtual tour)
- `Workflow → WorkflowNode` with `WorkflowRun` execution tracking
- `Lead` + `PipelineEtapa` for CRM kanban

### Storage (`lib/storage.ts`)
```ts
await uploadFile({ folder, filename, contentType, buffer })
await deleteFile(key)
```
`STORAGE_TYPE=local` (dev) | `STORAGE_TYPE=s3` (prod). S3 vars: `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_URL`.

### Realtime (`lib/pusher.ts`)
```ts
getPusherServer()   // server-side trigger (null if unconfigured)
getPusherClient()   // client-side subscribe (null if unconfigured)
```
Both degrade gracefully. Channels: `CHANNELS.RESERVAS`, `CHANNELS.UNIDADES`. Private user channels: `private-user-{userId}-notifications`.

### Key Libraries
- **UI**: Radix UI primitives + `components/ui/` wrappers, Tailwind CSS, Framer Motion
- **Forms**: react-hook-form + Zod validation (`lib/validations.ts`)
- **Charts**: Recharts
- **State**: Zustand (`lib/store.ts`, `lib/masterplan-store.ts`, `lib/reserva-store.ts`)
- **Email**: Resend via `lib/mail.ts`
- **AI**: `@anthropic-ai/sdk` + `openai` in `lib/actions/ai*.ts`
- **TensorFlow/Upscaler**: server-side only — excluded from client bundle via webpack aliases in `next.config.mjs`
- **Tour 360°**: `@photo-sphere-viewer` — `components/tour360/tour-viewer.tsx`
- **Blueprint/Planos**: SVG/DXF viewer — `components/blueprint/BlueprintEngine.tsx`

### Notifications (`lib/notifications/`)
- `send.ts` — creates DB `Notificacion` + optionally triggers Pusher
- `crm-notifications.ts` — CRM-specific notification helpers

### Workflow Engine (`lib/workflow-engine.ts`)
Executes `Workflow` graphs node-by-node. Node types include: `UPDATE_LEAD`, `CONDITION`, `WEBHOOK`, `WAIT`. Triggered from CRM actions.
