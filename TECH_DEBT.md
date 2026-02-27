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

## Leyenda
- **Prioridad**: CRÍTICA > ALTA > MEDIA > BAJA
- **Estado**: 🔴 Bloqueante | 🟡 Pendiente | 🟢 Resuelto
