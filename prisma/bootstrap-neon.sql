-- ============================================================
-- SevenToop — Bootstrap SQL para Neon DB (producción / staging)
-- Ejecutar en orden. Todo el script es idempotente.
-- Requiere: psql o Neon SQL Console
-- ============================================================

-- ─── STEP 1: Crear Organization principal ───────────────────
INSERT INTO "Organization" (id, nombre, slug, plan, "createdAt", "updatedAt")
VALUES (
    'seventoop-main',
    'Seventoop',
    'seventoop',
    'FREE',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
    SET nombre     = EXCLUDED.nombre,
        "updatedAt" = NOW();

-- ─── STEP 2: Asignar orgId a todos los usuarios existentes ──
UPDATE "User"
SET "orgId"    = 'seventoop-main',
    "updatedAt" = NOW()
WHERE "orgId" IS NULL;

-- ─── STEP 3: Asignar orgId + creadoPorId a proyectos ────────
-- creadoPorId: usar el primer usuario con rol ADMIN
UPDATE "Proyecto"
SET "orgId"      = 'seventoop-main',
    "creadoPorId" = (SELECT id FROM "User" WHERE rol = 'ADMIN' LIMIT 1),
    "updatedAt"   = NOW()
WHERE "orgId" IS NULL;

-- ─── STEP 4: Crear PipelineEtapas default ───────────────────
-- Idempotente: no inserta si ya existen etapas para esta org
INSERT INTO "PipelineEtapa" (id, "orgId", nombre, color, orden, "esDefault", "createdAt")
SELECT
    gen_random_uuid()::text,
    'seventoop-main',
    nombre,
    color,
    orden,
    "esDefault",
    NOW()
FROM (VALUES
    ('Nuevo',           '#6366f1', 1, true),
    ('Contactado',      '#3b82f6', 2, false),
    ('Calificado',      '#f59e0b', 3, false),
    ('Propuesta',       '#8b5cf6', 4, false),
    ('Cerrado Ganado',  '#10b981', 5, false),
    ('Cerrado Perdido', '#ef4444', 6, false)
) AS t(nombre, color, orden, "esDefault")
WHERE NOT EXISTS (
    SELECT 1 FROM "PipelineEtapa" WHERE "orgId" = 'seventoop-main'
);

-- ─── STEP 5: Verificación ────────────────────────────────────
SELECT 'organizations'   AS tabla, COUNT(*) AS total FROM "Organization";
SELECT 'users_sin_org'   AS tabla, COUNT(*) AS total FROM "User"   WHERE "orgId" IS NULL;
SELECT 'proyectos_sin_org' AS tabla, COUNT(*) AS total FROM "Proyecto" WHERE "orgId" IS NULL;
SELECT 'pipeline_etapas' AS tabla, COUNT(*) AS total FROM "PipelineEtapa" WHERE "orgId" = 'seventoop-main';

-- ─── NOTAS ───────────────────────────────────────────────────
-- Después de ejecutar este script:
--   1. Añadir SEVENTOOP_MAIN_ORG_ID=seventoop-main al .env
--   2. Añadir la variable en el dashboard de Neon / Vercel
--   3. Reiniciar la aplicación
-- ============================================================
