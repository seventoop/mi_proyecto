# A2 — Lead.orgId: Estrategia de Migración (sin romper compatibilidad)

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Estado:** Estrategia documentada — implementación pendiente de decisión

---

## El problema

Leads con `orgId = null` existen en la DB en dos casos:

1. **Legacy pre-multi-tenant:** Leads creados antes de que se introdujera `orgId` en el schema.
2. **Landing público:** `crearLeadLanding()` y `crearConsultaContacto()` crean leads sin `orgId` (no hay sesión de usuario que provea el org context).

### Riesgo actual

En `app/api/crm/leads/[id]/route.ts`, el check de ownership tiene esta cláusula:

```typescript
function hasLeadAccess(sessionUser: any, leadOrgId: string | null): boolean {
    if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPERADMIN") return true;
    if (!leadOrgId) return true; // ← LEGACY LEAD SIN ORG — accesible por cualquier usuario autenticado
    return (sessionUser as any).orgId === leadOrgId;
}
```

**Cualquier vendedor de cualquier organización puede leer y modificar leads sin orgId.**

Con los leads del formulario landing, esto significa que cualquier usuario del sistema puede acceder a los leads que llegan de la web pública.

---

## Plan de migración correcto

### Fase 1 — Asignación de orgId en leads de landing (IMPLEMENTAR YA)

`crearLeadLanding()` y `crearConsultaContacto()` deben asignar un `orgId`. Opciones:

**Opción A: Org por defecto global** — si hay una sola org "principal" (modelo SaaS de una sola empresa):
```typescript
const defaultOrg = await prisma.organization.findFirst({
    where: { slug: "main" } // o la org configurada en ENV
});
data.orgId = defaultOrg?.id ?? null;
```

**Opción B: Sin orgId pero solo accesible por ADMIN** — más conservador:
```typescript
// Cambiar hasLeadAccess:
if (!leadOrgId) return sessionUser.role === "ADMIN" || sessionUser.role === "SUPERADMIN";
```

**Opción C: Multi-org con routing por proyecto** — si el lead viene de un proyecto específico:
```typescript
if (data.proyectoId) {
    const proyecto = await prisma.proyecto.findUnique({
        where: { id: data.proyectoId },
        select: { orgId: true }
    });
    data.orgId = proyecto?.orgId ?? null;
}
```

### Fase 2 — Backfill de leads legacy (POSTPROD)

```sql
-- Asignar leads sin orgId a la org del vendedor asignado
UPDATE leads l
SET "orgId" = u."orgId"
FROM users u
WHERE l."asignadoAId" = u.id
  AND l."orgId" IS NULL
  AND u."orgId" IS NOT NULL;

-- Ver cuántos quedan sin org después del backfill
SELECT COUNT(*) FROM leads WHERE "orgId" IS NULL;
```

### Fase 3 — Endurecer el check de acceso

Una vez completado el backfill, cambiar `hasLeadAccess` para que los leads sin orgId sean SOLO accesibles por ADMIN:

```typescript
function hasLeadAccess(sessionUser: any, leadOrgId: string | null): boolean {
    if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPERADMIN") return true;
    if (!leadOrgId) return false; // post-backfill: ningún lead debería estar sin org
    return (sessionUser as any).orgId === leadOrgId;
}
```

---

## Recomendación inmediata para 7TP7

**Antes de conectar 7TP7 a datos de leads:**

1. Decidir qué org reciben los leads de landing → implementar Fase 1.
2. Si el modelo es multi-tenant real: usar Opción C (hereda orgId del proyecto).
3. Si es SaaS de única org: usar Opción A con org configurada por ENV.

**No implementar el módulo de leads de 7TP7 sobre el endpoint `/api/crm/leads/[id]` sin resolver la Fase 1.** El acceso a leads sin orgId es un agujero de tenant isolation que 7TP7 podría amplificar.

---

## Código legacy a marcar

```typescript
// lib/actions/leads.ts — crearLeadLanding() y crearConsultaContacto()
// ⚠️ LEGACY: no asigna orgId — leads quedan accesibles a todos los usuarios
await prisma.lead.create({
    data: {
        nombre: data.nombre,
        telefono: data.whatsapp,
        // orgId: SIN ASIGNAR — requiere decisión de arquitectura
    }
});
```

```typescript
// app/api/crm/leads/[id]/route.ts — hasLeadAccess()
if (!leadOrgId) return true; // ⚠️ LEGACY BYPASS — revisar tras backfill
```
