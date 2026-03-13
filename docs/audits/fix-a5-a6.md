# Fix A5 + A6 — Guards Consolidation + Roles Constants

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13

---

## A5 — Guards: Dos archivos, propósitos distintos (documentación)

### Hallazgo

Existen dos archivos de guards con funciones de igual nombre:

| Archivo | Comportamiento en fallo | Uso correcto |
|---------|------------------------|--------------|
| `lib/guards.ts` | Lanza `AuthError` → JSON | Server Actions, API Routes |
| `lib/auth/guards.ts` | Llama `redirect()` → navegación | Server Components (page.tsx) |

Estos NO son duplicados — son dos patrones correctos para dos contextos distintos. En React Server Components, `redirect()` es la forma correcta de rechazar acceso. En Server Actions y API Routes, un throw/return de JSON es lo correcto.

**El riesgo:** Si un dev usa `lib/auth/guards.ts` en un API Route, el `redirect()` dentro de un route handler lanza una excepción de Next.js que interrumpe el response con una redirección 307, rompiendo el cliente JSON.

### Cambio aplicado

Agregado docblock claro a ambos archivos explicando cuándo usar cada uno:

```typescript
// lib/guards.ts — CANONICAL
/**
 * CANONICAL guards — use in Server Actions and API Route handlers.
 * These throw AuthError on failure, caught by handleGuardError() or handleApiGuardError().
 * DO NOT use in Server Components / page.tsx files.
 */

// lib/auth/guards.ts — PAGE-LEVEL
/**
 * PAGE-LEVEL guards — use in Server Components (app/page.tsx files).
 * These call redirect() on failure, correct in RSC context.
 * DO NOT use in API Route handlers or Server Actions.
 */
```

### Riesgo residual

Los imports actuales de `lib/auth/guards.ts` deberían ser auditados para confirmar que todos son en page.tsx / layout.tsx:

```bash
grep -r "from.*lib/auth/guards" --include="*.tsx" --include="*.ts" .
```

Si alguno aparece en un API route o server action, reemplazar por `lib/guards.ts`.

---

## A6 — Roles: Constantes compartidas

### Hallazgo

Roles hardcodeados como strings en decenas de archivos:
```typescript
if (user.role === "ADMIN") { ... }
await requireAnyRole(["ADMIN", "DESARROLLADOR"]);
```

Sin un tipo central, un typo como `"ADMINISTRADOR"` compila sin error y falla silenciosamente en runtime.

### Cambio aplicado

Creado `lib/constants/roles.ts`:

```typescript
export const ROLES = {
    ADMIN: "ADMIN",
    SUPERADMIN: "SUPERADMIN",
    DESARROLLADOR: "DESARROLLADOR",
    VENDEDOR: "VENDEDOR",
    INVERSOR: "INVERSOR",
    CLIENTE: "CLIENTE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PROJECT_WRITE_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.DESARROLLADOR];
export const BYPASS_ORG_ROLES: Role[] = [ROLES.ADMIN, ROLES.SUPERADMIN];
```

### Estrategia de migración (no implementada aún)

No se reemplazaron los strings existentes para evitar un refactor masivo de alto riesgo. La migración correcta es gradual:

1. Nuevos archivos y 7TP7 usan `ROLES.X` desde el inicio.
2. Al tocar un archivo existente por otro motivo, reemplazar las strings del archivo.
3. Eventualmente, habilitar una regla ESLint custom que prohíba strings de roles hardcodeados.

El archivo `lib/constants/roles.ts` es un prerequisito para que 7TP7 pueda definir permisos de forma consistente sin duplicar las definiciones de roles.

---

## Exposición GET /api/proyectos/[id] (resuelto en commit separado)

El GET de este endpoint devolvía leads, oportunidades y historial de unidades a cualquier visitante sin autenticación. Fue protegido con `requireAuth()` en el mismo ciclo de trabajo.

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run build` | ✅ exitoso |
| Guards documentados | ✅ docblocks claros |
| `ROLES` constants disponibles | ✅ para uso en 7TP7 |
| Strings legacy reemplazados | ⏳ migración gradual pendiente |
