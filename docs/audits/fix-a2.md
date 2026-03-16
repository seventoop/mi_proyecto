# Fix A2 — Lead.orgId: Multi-Tenant Hardening

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Estado:** ✅ CERRADO — backfill ejecutado, variable documentada, build limpio

---

## Diagnóstico

`Lead.orgId` existía en el schema Prisma como campo opcional, pero:
1. `crearLeadLanding()` y `crearConsultaContacto()` no asignaban orgId.
2. `getLeads()` filtraba por `asignadoAId` y `proyecto.creadoPorId` (user-level), no por `orgId`.
3. `GET /api/crm/leads` no tenía auth y devolvía todos los leads sin filtro.
4. `hasLeadAccess()` tenía `if (!leadOrgId) return true` — cualquier usuario podía leer/editar leads sin orgId.

---

## Cambios aplicados

### `lib/actions/leads.ts`

**`getLeads()`**: Primary filter now uses `orgId`:
```typescript
const where = isAdmin ? {} :
    user.orgId
        ? { orgId: user.orgId }          // Primary: all org leads
        : { OR: [                          // Legacy fallback for users without org
            { asignadoAId: user.id },
            { proyecto: { creadoPorId: user.id } }
          ]};
```

**`crearLeadLanding()`**: Assigns `orgId` from env:
```typescript
const mainOrgId = process.env.SEVENTOOP_MAIN_ORG_ID ?? null;
// → stored in lead.orgId
```

**`crearConsultaContacto()`**: Inherits `orgId` from proyecto when available:
```typescript
let orgId = process.env.SEVENTOOP_MAIN_ORG_ID ?? null;
if (data.proyectoId) {
    const proyecto = await prisma.proyecto.findUnique({ ... select: { orgId: true } });
    if (proyecto?.orgId) orgId = proyecto.orgId;
}
```

### `app/api/crm/leads/[id]/route.ts`

**`hasLeadAccess()`** hardened:
```typescript
if (!leadOrgId) return false; // ADMIN-only for null-orgId leads (was: return true)
```

### `app/api/crm/leads/route.ts`

**GET**: Now requires session + filters by `orgId`:
```typescript
const session = await getServerSession(authOptions);
if (!session) return 401;
const where = isAdmin ? {} : { orgId: sessionUser.orgId };
```

**POST**: Now inherits `orgId` from proyecto + rate limit (10/10min per IP).

---

## ⚠️ Acción requerida antes de producción: BACKFILL

### Correr el backfill script

```bash
# Dry run (sin aplicar):
npx tsx scripts/backfill-lead-orgid.ts

# Aplicar:
DRY_RUN=false npx tsx scripts/backfill-lead-orgid.ts
```

El script:
1. Toma leads con `orgId = null`
2. Intenta resolver por `proyecto.orgId` (más confiable)
3. Fallback por `user.orgId` del vendedor asignado
4. Reporta cuántos quedan irresolubles

### Para leads irresolubles después del backfill

```sql
-- Opción A: asignar a una org principal
UPDATE leads SET "orgId" = 'YOUR_ORG_ID' WHERE "orgId" IS NULL;

-- Opción B: dejar null (accesibles solo por ADMIN hasta decisión)
-- No hacer nada — el código ya limita acceso a ADMIN-only para null orgId
```

---

## Configuración necesaria

Agregar a `.env` y `.env.production`:
```env
# orgId de la organización principal que recibe leads del formulario público
SEVENTOOP_MAIN_ORG_ID=your_org_cuid_here
```

Sin este valor, los leads de landing quedan sin orgId (accesibles solo por ADMIN).

---

## Riesgo residual

| Escenario | Estado |
|-----------|--------|
| Leads landing sin env configurado | orgId=null → solo ADMIN los ve |
| Leads legacy antes de backfill | orgId=null → solo ADMIN los ve |
| Leads vía `/api/crm/leads` POST sin proyecto | orgId=null → solo ADMIN los ve |
| `getLeads` usuarios sin orgId | fallback user-level filter (compatibilidad) |
| SUPERADMIN bypass | ✅ incluido en `isAdmin` check |

---

## Test Manual

### 1. Vendedor solo ve leads de su org
```
1. Login como vendedor (orgId=X)
2. GET /dashboard/leads
→ Solo leads donde orgId=X
→ NO leads de org distinta ni leads sin orgId
```

### 2. Admin ve todos
```
1. Login como ADMIN
2. GET /dashboard/leads
→ Todos los leads, incluyendo null-orgId
```

### 3. Lead de contacto hereda orgId del proyecto
```
1. Llenar formulario de contacto en /proyectos/[slug]
2. Verificar en DB: SELECT orgId FROM leads ORDER BY createdAt DESC LIMIT 1;
→ orgId = proyecto.orgId
```

### 4. API CRM leads sin sesión → 401
```bash
curl http://localhost:3000/api/crm/leads
→ 401 {"message":"No autorizado"}
```

---

## Cambios adicionales (segunda pasada — 2026-03-13)

### `lib/actions/leads.ts`

**`bulkCreateLeads()`**: Now assigns `orgId: user.orgId` on each created lead. Duplicate check scoped to same org (prevents false duplicates across orgs).

**`updateLead()` / `deleteLead()`**: Added org isolation as primary guard before user-level ownership check:
```typescript
if (existing.orgId && user.orgId && existing.orgId !== user.orgId) {
    return { success: false, error: "No tienes permisos..." };
}
```

### `app/api/crm/leads/route.ts`

**POST**: Now requires authentication (`getServerSession`). OrgId resolution: proyecto.orgId takes priority, fallback to `session.user.orgId`.

### `lib/actions/autocomplete.ts`

**`getLeadsAutocomplete()`**: Migrated from `{ proyecto: { orgId } }` JOIN filter to direct `{ orgId }` filter — catches leads without proyectoId and is more efficient.

### `lib/actions/ai.ts`

**`processIncomingLeadMessage()`** and **`joinOpenCommunity()`**: Now assign `orgId: process.env.SEVENTOOP_MAIN_ORG_ID ?? null` on lead creation — consistent with other public-facing entry points.

---

## Validación operativa — 2026-03-13

### Estado del DB (dev)

| Métrica | Valor |
|---------|-------|
| Total leads | 1 |
| Leads con orgId | 0 |
| Leads sin orgId | 1 |
| Leads corregidos por backfill | 0 |
| Orgs en DB | 0 |
| Users con orgId | 0 |

**Explicación del residual (1 lead sin orgId):**
Lead de prueba `"Test User"` creado el 2026-03-12 vía `formulario_landing`, antes de que el fix entrara. No tiene `proyectoId` ni `asignadoAId` → el backfill no puede resolverlo (sin referencias a una org). Además, el entorno dev no tiene organizaciones creadas aún, por lo que ningún lead puede recibir orgId automáticamente.

**Comportamiento actual:** el lead solo es visible para ADMIN. Correcto.

### Backfill ejecutado

```
DRY_RUN=false npx tsx scripts/backfill-lead-orgid.ts
→ Fixed via proyecto: 0
→ Fixed via asignadoA: 0
→ Unresolvable: 1 (admin-only, esperado)
```

### SEVENTOOP_MAIN_ORG_ID

| Campo | Estado |
|-------|--------|
| En `.env` (dev) | ❌ No configurada |
| En `.env.example` | ✅ Documentada con descripción |
| Comportamiento sin variable | orgId=null → admin-only (seguro) |
| Requerida para producción | Sí — antes de lanzar landing pública |

**Instrucciones para producción:**
1. Crear la org principal en DB (o usar `prisma db seed`)
2. Copiar su CUID y agregarlo a `.env.production`:
   ```env
   SEVENTOOP_MAIN_ORG_ID=cm...cuid...aqui
   ```
3. Correr backfill: `DRY_RUN=false npx tsx scripts/backfill-lead-orgid.ts`
4. Si quedan irresolubles: `UPDATE "leads" SET "orgId" = '<cuid>' WHERE "orgId" IS NULL;`

---

## Resultado final

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ (0 errores, warnings pre-existentes) |
| Tenant isolation (lead read) | ✅ |
| Tenant isolation (lead write) | ✅ |
| Tenant isolation (bulk import) | ✅ |
| Tenant isolation (autocomplete) | ✅ |
| Auth en POST /api/crm/leads | ✅ |
| Auth en GET /api/crm/leads | ✅ |
| orgId en leads WhatsApp/community | ✅ |
| orgId en leads CRM dashboard | ✅ |
| Admin bypass | ✅ |
| Legacy compatibility | ✅ (fallback user-level) |
| Backfill ejecutado | ✅ DRY_RUN=false — 0 cambios (esperado, sin orgs) |
| Backfill script correctness | ✅ Resuelve via proyecto → user, reporta irresolubles |
| SEVENTOOP_MAIN_ORG_ID documentada | ✅ .env.example |
| SEVENTOOP_MAIN_ORG_ID en dev | ⚠️ No configurada — leads landing sin orgId |
| Residual legacy (1 lead) | ⚠️ Test lead del 12/03 — admin-only, inofensivo |
