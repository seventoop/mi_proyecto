-- CreateIndex
CREATE INDEX "historial_unidades_unidadId_createdAt_idx" ON "historial_unidades"("unidadId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_telefono_idx" ON "leads"("telefono");

-- CreateIndex
CREATE INDEX "leads_asignadoAId_estado_idx" ON "leads"("asignadoAId", "estado");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_leido_idx" ON "notificaciones"("usuarioId", "leido");

-- CreateIndex
CREATE INDEX "notificaciones_createdAt_idx" ON "notificaciones"("createdAt");

-- CreateIndex
CREATE INDEX "proyectos_estado_idx" ON "proyectos"("estado");

-- CreateIndex
CREATE INDEX "proyectos_createdAt_idx" ON "proyectos"("createdAt");

-- CreateIndex
CREATE INDEX "reservas_createdAt_idx" ON "reservas"("createdAt");

-- CreateIndex
CREATE INDEX "unidades_manzanaId_estado_idx" ON "unidades"("manzanaId", "estado");
