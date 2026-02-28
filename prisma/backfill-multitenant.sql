-- ============================================
-- STP-MULTITENANT-FOUNDATION: Backfill Script
-- ============================================
-- Run this AFTER prisma db push / migrate.
-- Creates a default organization and assigns all existing data to it.
-- Safe to run multiple times (idempotent).

-- 1. Create default organization (skip if exists)
INSERT INTO organizations (id, nombre, slug, plan, "createdAt", "updatedAt")
VALUES (
    'org_default',
    'Organización por defecto',
    'default',
    'FREE',
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Assign all users without org to the default org
UPDATE users
SET "orgId" = 'org_default'
WHERE "orgId" IS NULL;

-- 3. Assign all projects without org to the default org
UPDATE proyectos
SET "orgId" = 'org_default'
WHERE "orgId" IS NULL;

-- 4. Verify counts
SELECT 'Users without org' AS check, COUNT(*) AS count FROM users WHERE "orgId" IS NULL
UNION ALL
SELECT 'Projects without org', COUNT(*) FROM proyectos WHERE "orgId" IS NULL
UNION ALL
SELECT 'Total orgs', COUNT(*) FROM organizations;
