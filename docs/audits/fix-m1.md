# Fix M1 — Audit Logs en Acciones Sensibles

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Estado:** ✅ Implementado para KYC y reservas — cobertura parcial documentada

---

## El problema

El sistema tenía un modelo `AuditLog` en el schema Prisma con estructura completa:
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  entity    String
  entityId  String?
  details   String?
  ip        String?
  createdAt DateTime @default(now())
  // ...
}
```

Pero no existía una función de escritura centralizada. Los únicos lugares que usaban `auditLog` eran lecturas en `admin-actions.ts` (para mostrar el log al admin). Ninguna acción importante escribía al log.

---

## Solución implementada

### `lib/actions/audit.ts` — Utility centralizada

```typescript
export async function audit(params: {
    userId: string;
    action: string;    // UPPER_SNAKE: e.g. RESERVA_CREATED, KYC_VERIFICADO
    entity: string;    // PascalCase model name
    entityId?: string;
    details?: Record<string, unknown>;
}): Promise<void>
```

**Características:**
- **Never throws** — audit no puede romper el flujo principal
- Captura IP automáticamente desde `headers()` (context-safe, no falla en cron)
- `details` serializado como JSON string en el campo `String?`

### Cobertura agregada

| Acción | Action string | Entity | Cuándo se llama |
|--------|--------------|--------|----------------|
| KYC aprobado/rechazado/revisión | `KYC_VERIFICADO` / `KYC_RECHAZADO` / `KYC_EN_REVISION` | `User` | `updateKYCStatus()` |
| Reserva creada | `RESERVA_CREATED` | `Reserva` | `createReserva()` |
| Reserva aprobada | `RESERVA_APPROVED` | `Reserva` | `approveReserva()` |
| Reserva cancelada | `RESERVA_CANCELLED` | `Reserva` | `cancelReserva()` |

---

## Convenciones para nuevas integraciones

```typescript
import { audit } from "@/lib/actions/audit";

// Ejemplo en cualquier server action:
await audit({
    userId: user.id,
    action: "PROYECTO_UPDATED",   // ENTITY_VERB
    entity: "Proyecto",            // PascalCase
    entityId: proyectoId,
    details: {
        campo: "estado",
        antes: "BORRADOR",
        despues: "ACTIVO",
    },
});
```

---

## Acciones sensibles pendientes de auditar

| Acción | Priority | Archivo |
|--------|----------|---------|
| `confirmarVenta` | HIGH | `lib/actions/reservas.ts` |
| `avanzarEstadoReserva` | MEDIUM | `lib/actions/reservas.ts` |
| `deleteProyecto` | HIGH | `lib/actions/proyectos.ts` |
| `updateEstadoDocumentoProyecto` | MEDIUM | `lib/actions/proyectos.ts` |
| `createLead` (dashboard) | MEDIUM | `lib/actions/leads.ts` |
| `deleteLead` | HIGH | `lib/actions/leads.ts` |
| `updateKYCStatus` → uploadKYCDoc | MEDIUM | `lib/actions/kyc.ts` |
| Login exitoso/fallido | MEDIUM | `lib/auth.ts` (jwt callback) |
| Workflow ejecutado | MEDIUM | `lib/workflow-engine.ts` |

Para 7TP7: priorizar `confirmarVenta`, `deleteProyecto`, `deleteLead` y workflow execution antes de conectar el módulo.

---

## Test Manual

### 1. KYC update genera audit log
```
1. Login como ADMIN
2. Aprobar KYC de un usuario en /dashboard/kyc
3. Verificar en DB:
   SELECT * FROM audit_logs WHERE action LIKE 'KYC_%' ORDER BY created_at DESC LIMIT 1;
→ Debe aparecer: userId=ADMIN_ID, action=KYC_VERIFICADO, entity=User, entityId=USER_ID
```

### 2. Crear reserva genera audit log
```
1. Login como vendedor/admin
2. Crear reserva para una unidad disponible
3. SELECT * FROM audit_logs WHERE action='RESERVA_CREATED' ORDER BY created_at DESC LIMIT 1;
→ userId, action, entity=Reserva, entityId, details={unidadId, leadId, montoSena}
```

### 3. Error en audit no rompe el flujo
```
1. Simular fallo de DB (desconectar temporalmente)
2. Aprobar un KYC
→ La operación principal debe completarse aunque el audit log falle
→ Console debe mostrar: [AUDIT] Failed to write audit log: ...
```

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| Utility centralizada | ✅ `lib/actions/audit.ts` |
| KYC auditado | ✅ |
| Reservas auditadas | ✅ (create/approve/cancel) |
| Confirmar venta | ⏳ pendiente |
| Delete proyecto/lead | ⏳ pendiente |
| Workflows | ⏳ pendiente |
