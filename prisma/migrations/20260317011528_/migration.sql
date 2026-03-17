/*
  Warnings:

  - You are about to drop the column `defaultActions` on the `logic_toop_templates` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `pagos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `reservas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `flowConfig` to the `logic_toop_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `logic_toop_templates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LogicToopFlowStatus" AS ENUM ('DRAFT', 'TESTING', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "context" TEXT NOT NULL DEFAULT 'ORG_LANDING',
ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "internalName" TEXT,
ADD COLUMN     "orgId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "subheadline" TEXT,
ADD COLUMN     "tagline" TEXT,
ALTER COLUMN "estado" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "logic_toop_executions" ADD COLUMN     "aiEstimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "aiModelsUsed" JSONB,
ADD COLUMN     "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "errorMessage" TEXT;

-- AlterTable
ALTER TABLE "logic_toop_flows" ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "recommendationId" TEXT,
ADD COLUMN     "status" "LogicToopFlowStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "logic_toop_templates" DROP COLUMN "defaultActions",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT ' Lead Automation',
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "flowConfig" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "precioAnterior" DECIMAL(18,2) NOT NULL,
    "precioNuevo" DECIMAL(18,2) NOT NULL,
    "tipo" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logic_toop_recommendations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "problemDetected" TEXT,
    "proposedSolution" TEXT,
    "expectedImpact" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "suggestedTrigger" TEXT,
    "suggestedNodes" JSONB,
    "signals" JSONB DEFAULT '{}',
    "sourceMetrics" JSONB DEFAULT '{}',
    "explanation" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceFlowId" TEXT,

    CONSTRAINT "logic_toop_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_intake" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infraestructuras" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "geometriaTipo" TEXT NOT NULL,
    "coordenadas" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'planificado',
    "descripcion" TEXT,
    "superficie" DOUBLE PRECISION,
    "longitudM" DOUBLE PRECISION,
    "fechaEstimadaFin" TIMESTAMP(3),
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "fotos" TEXT,
    "colorPersonalizado" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "infraestructuras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes_mapa" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "unidadId" TEXT,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'foto',
    "titulo" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "altitudM" DOUBLE PRECISION DEFAULT 500,
    "imageHeading" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imagenes_mapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_history_proyectoId_idx" ON "price_history"("proyectoId");

-- CreateIndex
CREATE INDEX "price_history_createdAt_idx" ON "price_history"("createdAt");

-- CreateIndex
CREATE INDEX "logic_toop_recommendations_orgId_idx" ON "logic_toop_recommendations"("orgId");

-- CreateIndex
CREATE INDEX "logic_toop_recommendations_status_idx" ON "logic_toop_recommendations"("status");

-- CreateIndex
CREATE INDEX "logic_toop_recommendations_type_idx" ON "logic_toop_recommendations"("type");

-- CreateIndex
CREATE INDEX "integration_configs_orgId_idx" ON "integration_configs"("orgId");

-- CreateIndex
CREATE INDEX "integration_configs_provider_idx" ON "integration_configs"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_orgId_provider_key" ON "integration_configs"("orgId", "provider");

-- CreateIndex
CREATE INDEX "lead_intake_status_idx" ON "lead_intake"("status");

-- CreateIndex
CREATE INDEX "lead_intake_source_idx" ON "lead_intake"("source");

-- CreateIndex
CREATE INDEX "infraestructuras_proyectoId_idx" ON "infraestructuras"("proyectoId");

-- CreateIndex
CREATE INDEX "imagenes_mapa_proyectoId_idx" ON "imagenes_mapa"("proyectoId");

-- CreateIndex
CREATE INDEX "imagenes_mapa_unidadId_idx" ON "imagenes_mapa"("unidadId");

-- CreateIndex
CREATE INDEX "banners_orgId_idx" ON "banners"("orgId");

-- CreateIndex
CREATE INDEX "banners_context_orgId_estado_idx" ON "banners"("context", "orgId", "estado");

-- CreateIndex
CREATE INDEX "logic_toop_executions_startedAt_idx" ON "logic_toop_executions"("startedAt");

-- CreateIndex
CREATE INDEX "logic_toop_flows_status_idx" ON "logic_toop_flows"("status");

-- CreateIndex
CREATE INDEX "logic_toop_flows_recommendationId_idx" ON "logic_toop_flows"("recommendationId");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_idempotencyKey_key" ON "pagos"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_idempotencyKey_key" ON "reservas"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logic_toop_flows" ADD CONSTRAINT "logic_toop_flows_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "logic_toop_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logic_toop_recommendations" ADD CONSTRAINT "logic_toop_recommendations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logic_toop_recommendations" ADD CONSTRAINT "logic_toop_recommendations_sourceFlowId_fkey" FOREIGN KEY ("sourceFlowId") REFERENCES "logic_toop_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infraestructuras" ADD CONSTRAINT "infraestructuras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes_mapa" ADD CONSTRAINT "imagenes_mapa_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes_mapa" ADD CONSTRAINT "imagenes_mapa_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
