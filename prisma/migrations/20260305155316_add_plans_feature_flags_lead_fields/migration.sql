-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "adId" TEXT,
ADD COLUMN     "adSetId" TEXT,
ADD COLUMN     "campanaId" TEXT,
ADD COLUMN     "canalOrigen" TEXT NOT NULL DEFAULT 'WEB',
ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "score" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "limites" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_feature_flags" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "infoGeneral" BOOLEAN NOT NULL DEFAULT true,
    "archivos" BOOLEAN NOT NULL DEFAULT false,
    "documentos" BOOLEAN NOT NULL DEFAULT false,
    "pagos" BOOLEAN NOT NULL DEFAULT false,
    "masterplan" BOOLEAN NOT NULL DEFAULT false,
    "motorPlanos" BOOLEAN NOT NULL DEFAULT false,
    "tour360" BOOLEAN NOT NULL DEFAULT false,
    "etapas" BOOLEAN NOT NULL DEFAULT false,
    "inventario" BOOLEAN NOT NULL DEFAULT false,
    "metricas" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_feature_flags_projectId_key" ON "project_feature_flags"("projectId");

-- CreateIndex
CREATE INDEX "leads_orgId_idx" ON "leads"("orgId");

-- CreateIndex
CREATE INDEX "leads_canalOrigen_idx" ON "leads"("canalOrigen");

-- CreateIndex
CREATE INDEX "organizations_planId_idx" ON "organizations"("planId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_feature_flags" ADD CONSTRAINT "project_feature_flags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
