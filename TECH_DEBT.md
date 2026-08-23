# TECH_DEBT.md

| Error | Archivo | Prioridad | Estado |
|-------|---------|-----------|--------|
| Session mapping: Property 'id'/'role' does not exist on type 'User' | `lib/actions/*.ts`, components, pages | ALTA | 🟢 Resuelto |
| Prisma payload mismatch (missing includes) | `app/(public)/proyectos/[slug]/unidades/[id]/page.tsx` | ALTA | 🟢 Resuelto |
| Type 'Buffer' is not assignable to 'BodyInit' | `app/api/reservas/[id]/documento/route.ts` | MEDIA | 🟢 Resuelto |
| Nullable/undefined in UI access | `app/(public)/proyectos/[slug]/unidades/[id]/page.tsx` | MEDIA | 🟢 Resuelto |
| Incomplete Prisma unique constraint for Upsert | `lib/actions/ai.ts` | CRÍTICA | 🟢 Resuelto |
| Incorrect props in `FileUploader` | `components/dashboard/profile/profile-form.tsx` | MEDIA | 🟢 Resuelto |
| Zod Schema error: `required_error` invalid | `components/dashboard/reservas/reserva-dialog.tsx` | MEDIA | 🟢 Resuelto |
| Incompatible Button variant 'warning' | `components/dashboard/proyectos/suspend-project-dialog.tsx` | BAJA | 🟢 Resuelto |
| TypeScript `ignoreBuildErrors: false` | `next.config.mjs` | CRÍTICA | 🟢 Resuelto |
| Server Actions Security (Priority) | `lib/actions/{reservas,testimonios,notifications}.ts` | CRÍTICA | 🟢 Resuelto |
| Sentry Integration (DSN) | `sentry.*.config.ts` | ALTA | 🟢 Resuelto |
| ESLint Warnings: `no-unused-vars` | Global | BAJA | 🟡 Pendiente |
| Typecheck: `roleChangeRequest` no existe en Prisma Client | `app/api/role-change-requests/[requestId]/route.ts`, `app/api/role-change-requests/me/route.ts`, `app/api/role-change-requests/route.ts` | ALTA | 🟡 Pendiente |
| Auditoría npm: 39 vulnerabilidades reportadas por `npm ci` (2 low, 15 moderate, 20 high, 2 critical) | `package-lock.json`, dependencias npm | ALTA | 🟡 Pendiente |
| Workflow `SEND_EMAIL` aceptado por schema/API pero no implementado por el engine; actualmente queda `SKIPPED` | `app/api/workflows/route.ts`, `lib/workflow-engine.ts` | MEDIA | 🟡 Pendiente |
| `WorkflowRun` persiste `entityId` sin `entityType` ni `orgId`; enforcement tenant existe en runtime, pero falta observabilidad/extensibilidad | `prisma/schema.prisma`, `lib/workflow-engine.ts` | MEDIA | 🟡 Pendiente |

## Notas de sesión 2026-08-23

- El fallo de typecheck en `role-change-requests` es preexistente y no fue introducido por los fixes de autorización de esta sesión.
- No se ejecutó `npm audit fix`; las vulnerabilidades npm requieren una auditoría separada de dependencias.
- La deuda de `WorkflowRun` sin `entityType`/`orgId` queda registrada como observabilidad/extensibilidad futura, no como vulnerabilidad activa después del fix cross-tenant del Workflow Engine.

## Leyenda
- **Prioridad**: CRÍTICA > ALTA > MEDIA > BAJA
- **Estado**: 🔴 Bloqueante | 🟡 Pendiente | 🟢 Resuelto
