# SevenToop — Bootstrap Checklist (Tenant Principal)

## Contexto
El sistema tiene 0 Organizations en producción. Este checklist inicializa el tenant principal
con ID determinista `seventoop-main` de forma segura e idempotente.

---

## Opción A — Fresh install (DB vacía / dev local)

```bash
# 1. Asegurate de que la DB esté corriendo
docker-compose up -d          # local postgres en puerto 5433

# 2. Aplicar migrations pendientes
npm run db:migrate:deploy

# 3. Ejecutar seed (crea org + users + projects + pipeline)
npm run db:seed

# 4. Añadir variable de entorno al .env
echo "SEVENTOOP_MAIN_ORG_ID=seventoop-main" >> .env

# 5. Verificar
npm run db:studio              # abrir Prisma Studio y confirmar datos
```

---

## Opción B — DB existente con datos (Neon / staging / prod)

### Pre-checks (SELECT-only, sin riesgo)
```sql
SELECT COUNT(*) FROM "Organization";                           -- esperado: 0
SELECT COUNT(*) FROM "User" WHERE "orgId" IS NULL;            -- esperado: 4
SELECT COUNT(*) FROM "Proyecto" WHERE "orgId" IS NULL;        -- esperado: 2
SELECT COUNT(*) FROM "PipelineEtapa" WHERE "orgId" = 'seventoop-main'; -- esperado: 0
SELECT COUNT(*) FROM "Lead";                                   -- esperado: 0 (no hay datos de negocio)
SELECT COUNT(*) FROM "Reserva";                                -- esperado: 0
```

Si todos los resultados coinciden con lo esperado, proceder.

### Ejecución
```bash
# Ejecutar el script SQL via psql o Neon SQL Console
psql $DATABASE_URL -f prisma/bootstrap-neon.sql

# O pegar contenido directamente en Neon SQL Console
```

### Verificación post-ejecución
```sql
-- Todos deben devolver el valor esperado
SELECT COUNT(*) FROM "Organization";                           -- 1
SELECT COUNT(*) FROM "User" WHERE "orgId" IS NULL;            -- 0
SELECT COUNT(*) FROM "Proyecto" WHERE "orgId" IS NULL;        -- 0
SELECT COUNT(*) FROM "PipelineEtapa" WHERE "orgId" = 'seventoop-main'; -- 6
SELECT id, nombre, slug, plan FROM "Organization";             -- seventoop-main | Seventoop | seventoop | FREE
```

### Variables de entorno
```bash
# .env (local)
SEVENTOOP_MAIN_ORG_ID=seventoop-main

# Neon / Vercel dashboard → Environment Variables
# Key: SEVENTOOP_MAIN_ORG_ID
# Value: seventoop-main
# Entornos: Production + Preview
```

### Restart
```bash
# Después de añadir la variable
npm run dev                    # local
# En Vercel: trigger redeploy o reiniciar instancia
```

---

## Rollback

Si algo sale mal:

```sql
-- Revertir en orden inverso (seguro si no hay leads/reservas)
DELETE FROM "PipelineEtapa" WHERE "orgId" = 'seventoop-main';
UPDATE "Proyecto" SET "orgId" = NULL, "creadoPorId" = NULL WHERE "orgId" = 'seventoop-main';
UPDATE "User" SET "orgId" = NULL WHERE "orgId" = 'seventoop-main';
DELETE FROM "Organization" WHERE id = 'seventoop-main';
```

**Condición crítica**: El rollback solo es seguro si no existen Leads, Reservas u Oportunidades
ligados a la org. Verificar antes:

```sql
SELECT COUNT(*) FROM "Lead" WHERE "orgId" = 'seventoop-main';     -- debe ser 0
SELECT COUNT(*) FROM "Reserva" r
JOIN "Unidad" u ON r."unidadId" = u.id
JOIN "Manzana" m ON u."manzanaId" = m.id
JOIN "Etapa" e ON m."etapaId" = e.id
JOIN "Proyecto" p ON e."proyectoId" = p.id
WHERE p."orgId" = 'seventoop-main';                                -- debe ser 0
```

---

## Dependencias detectadas

| Componente | Requiere bootstrap? | Notas |
|---|---|---|
| `SEVENTOOP_MAIN_ORG_ID` env var | **SÍ — crítico** | Usado en `processIncomingLeadMessage`, `joinOpenCommunity`, `crearLeadLanding`. Sin esto los leads de WhatsApp/landing van a quarantine. |
| PipelineEtapas por defecto | **SÍ** | Sin etapas, el CRM kanban aparece vacío para todos los usuarios de la org. |
| Plan record en tabla `Plan` | No requerido | `Organization.planId` es nullable. FREE plan funciona sin FK. |
| orgId en usuarios | **SÍ** | Sin orgId, los usuarios con rol ≠ ADMIN no pueden crear leads ni ver proyectos. |
| orgId en proyectos | **SÍ** | Sin orgId, los proyectos son accesibles solo para ADMIN (org-scoped queries usan `orgFilter`). |
| creadoPorId en proyectos | **SÍ** | `requireProjectOwnership` verifica `creadoPorId`. Sin esto, solo ADMIN puede editar proyectos. |

---

## Estado final esperado

```
Organization:   1  (id=seventoop-main, slug=seventoop)
Users:          4  (todos con orgId=seventoop-main)
Proyectos:      2  (ambos con orgId=seventoop-main, creadoPorId=admin.id)
PipelineEtapas: 6  (Nuevo → Contactado → Calificado → Propuesta → Cerrado Ganado → Cerrado Perdido)
Env var:        SEVENTOOP_MAIN_ORG_ID=seventoop-main
```
