/*
  Warnings:

  - You are about to alter the column `m2Comprados` on the `inversiones` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `montoTotal` on the `inversiones` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `precioM2Aplicado` on the `inversiones` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `valorEstimado` on the `oportunidades` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `presupuesto` on the `oportunidades` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `monto` on the `pagos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `precioM2Inversor` on the `proyectos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `precioM2Mercado` on the `proyectos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `metaM2Objetivo` on the `proyectos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `m2VendidosInversores` on the `proyectos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to alter the column `montoSena` on the `reservas` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.
  - You are about to drop the column `escenas` on the `tours_360` table. All the data in the column will be lost.
  - You are about to alter the column `saldo` on the `users` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE "inversiones" ALTER COLUMN "m2Comprados" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoTotal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "precioM2Aplicado" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "oportunidades" ALTER COLUMN "valorEstimado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "presupuesto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "tipo" TEXT,
ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "proyectos" ADD COLUMN     "orgId" TEXT,
ALTER COLUMN "precioM2Inversor" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "precioM2Mercado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "metaM2Objetivo" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "m2VendidosInversores" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "reservas" ALTER COLUMN "montoSena" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "tours_360" DROP COLUMN "escenas";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "orgId" TEXT,
ALTER COLUMN "saldo" SET DATA TYPE DECIMAL(18,2);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_scenes" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'RAW',

    CONSTRAINT "tour_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_hotspots" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "pitch" DOUBLE PRECISION NOT NULL,
    "yaw" DOUBLE PRECISION NOT NULL,
    "text" TEXT,
    "targetSceneId" TEXT,

    CONSTRAINT "tour_hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "tour_scenes_tourId_idx" ON "tour_scenes"("tourId");

-- CreateIndex
CREATE INDEX "tour_hotspots_sceneId_idx" ON "tour_hotspots"("sceneId");

-- CreateIndex
CREATE INDEX "tour_hotspots_unidadId_idx" ON "tour_hotspots"("unidadId");

-- CreateIndex
CREATE INDEX "proyectos_visibilityStatus_idx" ON "proyectos"("visibilityStatus");

-- CreateIndex
CREATE INDEX "proyectos_isDemo_idx" ON "proyectos"("isDemo");

-- CreateIndex
CREATE INDEX "proyectos_tipo_idx" ON "proyectos"("tipo");

-- CreateIndex
CREATE INDEX "proyectos_orgId_idx" ON "proyectos"("orgId");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_scenes" ADD CONSTRAINT "tour_scenes_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "tours_360"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_hotspots" ADD CONSTRAINT "tour_hotspots_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "tour_scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_hotspots" ADD CONSTRAINT "tour_hotspots_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
