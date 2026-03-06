-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "etapaId" TEXT;

-- CreateTable
CREATE TABLE "pipeline_etapas" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "orden" INTEGER NOT NULL,
    "esDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_etapas_orgId_idx" ON "pipeline_etapas"("orgId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "pipeline_etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_etapas" ADD CONSTRAINT "pipeline_etapas_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
