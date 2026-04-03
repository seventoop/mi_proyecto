-- CreateEnum
CREATE TYPE "TipoRelacionProyecto" AS ENUM ('OWNER', 'VENDEDOR_ASIGNADO', 'COMERCIALIZADOR_EXCLUSIVO', 'COMERCIALIZADOR_NO_EXCLUSIVO', 'COLABORADOR', 'SOLO_LECTURA');

-- CreateEnum
CREATE TYPE "EstadoRelacionProyecto" AS ENUM ('ACTIVA', 'PENDIENTE', 'RECHAZADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "EstadoValidacionProyecto" AS ENUM ('BORRADOR', 'PENDIENTE_VALIDACION', 'EN_REVISION', 'APROBADO', 'OBSERVADO', 'RECHAZADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoMandato" AS ENUM ('EXCLUSIVO', 'NO_EXCLUSIVO');

-- AlterTable
ALTER TABLE "imagenes_mapa" ADD COLUMN     "latOffset" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "lngOffset" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "planRotation" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "planScale" DOUBLE PRECISION DEFAULT 1;

-- AlterTable
ALTER TABLE "proyectos" ADD COLUMN     "estadoValidacion" "EstadoValidacionProyecto" NOT NULL DEFAULT 'BORRADOR',
ADD COLUMN     "flagsOverrideAt" TIMESTAMP(3),
ADD COLUMN     "flagsOverridePorId" TEXT,
ADD COLUMN     "puedeCaptarLeads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puedePublicarse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puedeReservarse" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tour_scenes" ADD COLUMN     "masterplanOverlay" JSONB;

-- CreateTable
CREATE TABLE "proyecto_usuarios" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tipoRelacion" "TipoRelacionProyecto" NOT NULL,
    "estadoRelacion" "EstadoRelacionProyecto" NOT NULL DEFAULT 'PENDIENTE',
    "permisoEditarProyecto" BOOLEAN NOT NULL DEFAULT false,
    "permisoSubirDocumentacion" BOOLEAN NOT NULL DEFAULT false,
    "permisoVerLeadsGlobales" BOOLEAN NOT NULL DEFAULT false,
    "permisoVerMetricasGlobales" BOOLEAN NOT NULL DEFAULT false,
    "tipoMandato" "TipoMandato",
    "documentoMandatoUrl" TEXT,
    "mandatoVigenciaDesde" TIMESTAMP(3),
    "mandatoVigenciaHasta" TIMESTAMP(3),
    "confirmadoPorEmpresa" BOOLEAN NOT NULL DEFAULT false,
    "fechaConfirmacion" TIMESTAMP(3),
    "aprobadoPorAdminId" TEXT,
    "asignadoPorId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_estado_logs" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "estadoAnterior" "EstadoValidacionProyecto" NOT NULL,
    "estadoNuevo" "EstadoValidacionProyecto" NOT NULL,
    "realizadoPorId" TEXT NOT NULL,
    "motivo" TEXT,
    "flagsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_estado_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_usuarios_proyectoId_idx" ON "proyecto_usuarios"("proyectoId");

-- CreateIndex
CREATE INDEX "proyecto_usuarios_userId_idx" ON "proyecto_usuarios"("userId");

-- CreateIndex
CREATE INDEX "proyecto_usuarios_orgId_idx" ON "proyecto_usuarios"("orgId");

-- CreateIndex
CREATE INDEX "proyecto_usuarios_tipoRelacion_estadoRelacion_idx" ON "proyecto_usuarios"("tipoRelacion", "estadoRelacion");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_usuarios_proyectoId_userId_key" ON "proyecto_usuarios"("proyectoId", "userId");

-- CreateIndex
CREATE INDEX "proyecto_estado_logs_proyectoId_createdAt_idx" ON "proyecto_estado_logs"("proyectoId", "createdAt");

-- CreateIndex
CREATE INDEX "proyectos_estadoValidacion_idx" ON "proyectos"("estadoValidacion");

-- AddForeignKey
ALTER TABLE "proyecto_usuarios" ADD CONSTRAINT "proyecto_usuarios_aprobadoPorAdminId_fkey" FOREIGN KEY ("aprobadoPorAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_usuarios" ADD CONSTRAINT "proyecto_usuarios_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_usuarios" ADD CONSTRAINT "proyecto_usuarios_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_usuarios" ADD CONSTRAINT "proyecto_usuarios_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_usuarios" ADD CONSTRAINT "proyecto_usuarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_estado_logs" ADD CONSTRAINT "proyecto_estado_logs_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_estado_logs" ADD CONSTRAINT "proyecto_estado_logs_realizadoPorId_fkey" FOREIGN KEY ("realizadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
