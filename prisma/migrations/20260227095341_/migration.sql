-- AlterTable
ALTER TABLE "proyectos" ADD COLUMN     "demoExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireKyc" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visibilityStatus" TEXT NOT NULL DEFAULT 'PUBLICADO';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "demoEndsAt" TIMESTAMP(3),
ADD COLUMN     "demoUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'low',
ADD COLUMN     "riskReason" TEXT;

-- CreateTable
CREATE TABLE "proyecto_archivos" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "visiblePublicamente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_imagenes" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_archivos_proyectoId_idx" ON "proyecto_archivos"("proyectoId");

-- CreateIndex
CREATE INDEX "proyecto_imagenes_proyectoId_idx" ON "proyecto_imagenes"("proyectoId");

-- CreateIndex
CREATE INDEX "proyecto_imagenes_orden_idx" ON "proyecto_imagenes"("orden");

-- AddForeignKey
ALTER TABLE "proyecto_archivos" ADD CONSTRAINT "proyecto_archivos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_imagenes" ADD CONSTRAINT "proyecto_imagenes_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
