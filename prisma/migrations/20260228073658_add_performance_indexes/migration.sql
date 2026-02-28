-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "proyectoId" TEXT;

-- CreateIndex
CREATE INDEX "banners_proyectoId_idx" ON "banners"("proyectoId");

-- CreateIndex
CREATE INDEX "banners_estado_idx" ON "banners"("estado");

-- CreateIndex
CREATE INDEX "banners_createdAt_idx" ON "banners"("createdAt");

-- CreateIndex
CREATE INDEX "inversiones_proyectoId_idx" ON "inversiones"("proyectoId");

-- CreateIndex
CREATE INDEX "inversiones_inversorId_idx" ON "inversiones"("inversorId");

-- CreateIndex
CREATE INDEX "inversiones_estado_idx" ON "inversiones"("estado");

-- CreateIndex
CREATE INDEX "inversiones_fechaInversion_idx" ON "inversiones"("fechaInversion");

-- CreateIndex
CREATE INDEX "oportunidades_proyectoId_idx" ON "oportunidades"("proyectoId");

-- CreateIndex
CREATE INDEX "oportunidades_etapa_idx" ON "oportunidades"("etapa");

-- CreateIndex
CREATE INDEX "oportunidades_createdAt_idx" ON "oportunidades"("createdAt");

-- CreateIndex
CREATE INDEX "oportunidades_leadId_etapa_idx" ON "oportunidades"("leadId", "etapa");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "pagos_tipo_idx" ON "pagos"("tipo");

-- CreateIndex
CREATE INDEX "pagos_createdAt_idx" ON "pagos"("createdAt");

-- CreateIndex
CREATE INDEX "tareas_leadId_idx" ON "tareas"("leadId");

-- CreateIndex
CREATE INDEX "tareas_estado_idx" ON "tareas"("estado");

-- CreateIndex
CREATE INDEX "tareas_fechaVencimiento_idx" ON "tareas"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "tareas_usuarioId_idx" ON "tareas"("usuarioId");

-- CreateIndex
CREATE INDEX "tareas_usuarioId_estado_idx" ON "tareas"("usuarioId", "estado");

-- CreateIndex
CREATE INDEX "testimonios_estado_idx" ON "testimonios"("estado");

-- CreateIndex
CREATE INDEX "testimonios_createdAt_idx" ON "testimonios"("createdAt");

-- CreateIndex
CREATE INDEX "testimonios_proyectoId_idx" ON "testimonios"("proyectoId");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
