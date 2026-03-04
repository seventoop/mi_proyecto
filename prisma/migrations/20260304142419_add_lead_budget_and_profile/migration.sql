-- Manual migration: add Lead.presupuesto + Lead.perfilInversor
-- Safe: additive only (no drops). Works on existing DB.

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "presupuesto" DECIMAL(18,2);

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "perfilInversor" TEXT NOT NULL DEFAULT 'MODERADO';
