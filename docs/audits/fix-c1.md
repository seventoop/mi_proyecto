# Fix C1 — PUT /api/proyectos/[id]: Ownership Guard

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Riesgo original:** CRÍTICO — cualquier usuario autenticado podía editar cualquier proyecto (nombre, estado, galería, masterplanSVG, etc.)

---

## Cambio

**Archivo:** `app/api/proyectos/[id]/route.ts`

Agregado al inicio del handler `PUT`:
```ts
await requireProjectOwnership(params.id);
```

La guard `requireProjectOwnership` (en `lib/guards.ts`) ya implementa:
- **ADMIN bypass**: si `user.role === "ADMIN"`, retorna inmediatamente.
- **404 si el proyecto no existe** (no revela existencia a usuarios de otro org).
- **404 si el proyecto es de otro org** (multi-tenant: `proyecto.orgId !== user.orgId`).
- **403 si no es el creador** del proyecto dentro del mismo org.

El catch fue simplificado de `console.error + 500` a `handleApiGuardError(error)`, que propaga correctamente el status code de `AuthError`.

> **Nota:** El handler `GET` del mismo archivo sigue siendo completamente público (sin auth). Expone leads, oportunidades e historial de unidades a cualquier visitante. Registrado como issue pendiente A6 — fuera del scope de este ticket.

---

## Test Manual

### Pre-requisitos
- Dev local corriendo (`npm run dev`)
- 3 usuarios en DB:
  - `admin@test.com` — rol ADMIN
  - `dev1@test.com` — rol DESARROLLADOR, dueño del proyecto P1 (`creadoPorId = dev1.id`)
  - `dev2@test.com` — rol DESARROLLADOR, **distinto orgId** o mismo org pero no creador

### Casos a validar

#### 1. ADMIN puede editar cualquier proyecto → 200
```bash
# Login como admin y obtener cookie de sesión, luego:
curl -X PUT http://localhost:3000/api/proyectos/<P1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<ADMIN_TOKEN>" \
  -d '{"nombre": "Test Admin Edit"}'
# Esperado: 200 + proyecto actualizado
```

#### 2. Dev dueño puede editar su propio proyecto → 200
```bash
curl -X PUT http://localhost:3000/api/proyectos/<P1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<DEV1_TOKEN>" \
  -d '{"nombre": "Test Dev1 Edit"}'
# Esperado: 200 + proyecto actualizado
```

#### 3. Dev de otro org recibe 404 (no revela existencia)
```bash
curl -X PUT http://localhost:3000/api/proyectos/<P1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<DEV2_OTHER_ORG_TOKEN>" \
  -d '{"nombre": "Hack"}'
# Esperado: 404 {"error":"Proyecto no encontrado"}
```

#### 4. Dev del mismo org pero no creador recibe 403
```bash
curl -X PUT http://localhost:3000/api/proyectos/<P1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<DEV2_SAME_ORG_TOKEN>" \
  -d '{"nombre": "Hack"}'
# Esperado: 403 {"error":"No tienes permisos sobre este proyecto"}
```

#### 5. Sin sesión recibe 401
```bash
curl -X PUT http://localhost:3000/api/proyectos/<P1_ID> \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Hack"}'
# Esperado: 401 {"error":"No autorizado"}
```

#### 6. GET sigue funcionando sin auth (comportamiento anterior, no modificado)
```bash
curl http://localhost:3000/api/proyectos/<P1_ID>
# Esperado: 200 + datos completos del proyecto (público por diseño actual)
```

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run build` | ✅ exitoso |
| GET no afectado | ✅ sin cambios |
| ADMIN bypass | ✅ guard retorna inmediatamente |
| No-owner → 403/404 | ✅ según multi-tenant |
| Anónimo → 401 | ✅ via requireAuth() |
