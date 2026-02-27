-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'VENDEDOR',
    "whatsappNumber" TEXT,
    "aiAgentTone" TEXT NOT NULL DEFAULT 'PROFESIONAL',
    "useAiCopilot" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apellido" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "apodo" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "configuracion" TEXT,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "proyectos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT,
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PLANIFICACION',
    "tipo" TEXT NOT NULL DEFAULT 'URBANIZACION',
    "imagenPortada" TEXT,
    "galeria" TEXT,
    "documentos" TEXT,
    "masterplanSVG" TEXT,
    "mapCenterLat" DOUBLE PRECISION DEFAULT -34.6037,
    "mapCenterLng" DOUBLE PRECISION DEFAULT -58.3816,
    "mapZoom" INTEGER DEFAULT 16,
    "overlayUrl" TEXT,
    "overlayBounds" TEXT,
    "overlayRotation" DOUBLE PRECISION DEFAULT 0,
    "invertible" BOOLEAN NOT NULL DEFAULT false,
    "precioM2Inversor" DOUBLE PRECISION,
    "precioM2Mercado" DOUBLE PRECISION,
    "metaM2Objetivo" DOUBLE PRECISION,
    "m2VendidosInversores" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaLimiteFondeo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentacionEstado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "creadoPorId" TEXT,
    "aiKnowledgeBase" TEXT,
    "aiSystemPrompt" TEXT,

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inversiones" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "inversorId" TEXT NOT NULL,
    "m2Comprados" DOUBLE PRECISION NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "precioM2Aplicado" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ESCROW',
    "hashTransaccion" TEXT,
    "fechaInversion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inversiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hitos_escrow" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaLogro" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hitos_escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manzanas" (
    "id" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "coordenadas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manzanas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades" (
    "id" TEXT NOT NULL,
    "manzanaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'LOTE',
    "superficie" DOUBLE PRECISION,
    "frente" DOUBLE PRECISION,
    "fondo" DOUBLE PRECISION,
    "esEsquina" BOOLEAN NOT NULL DEFAULT false,
    "orientacion" TEXT,
    "precio" DOUBLE PRECISION,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "geoJSON" TEXT,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "financiacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "coordenadasMasterplan" TEXT,
    "imagenes" TEXT,
    "tour360Url" TEXT,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "origen" TEXT NOT NULL DEFAULT 'WEB',
    "proyectoId" TEXT,
    "unidadInteres" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "asignadoAId" TEXT,
    "ultimoContacto" TIMESTAMP(3),
    "fuente" TEXT,
    "campana" TEXT,
    "mensaje" TEXT,
    "notas" TEXT,
    "aiQualificationScore" INTEGER,
    "lastAiSummary" TEXT,
    "automationStatus" TEXT NOT NULL DEFAULT 'MANUAL',
    "communityType" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_messages" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oportunidades" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "unidadId" TEXT,
    "etapa" TEXT NOT NULL DEFAULT 'NUEVO',
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "valorEstimado" DOUBLE PRECISION,
    "presupuesto" DOUBLE PRECISION,
    "fechaCierreEstimada" TIMESTAMP(3),
    "proximaAccion" TEXT,
    "fechaProximaAccion" TIMESTAMP(3),
    "motivoPerdida" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oportunidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "leadId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoSena" DOUBLE PRECISION,
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "documentoGenerado" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_unidades" (
    "id" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours_360" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "unidadId" TEXT,
    "nombre" TEXT NOT NULL,
    "escenas" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notasAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tours_360_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'IMAGEN',
    "mediaUrl" TEXT NOT NULL,
    "linkDestino" TEXT,
    "posicion" TEXT NOT NULL DEFAULT 'HOME_TOP',
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "notasAdmin" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonios" (
    "id" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "autorTipo" TEXT NOT NULL DEFAULT 'USUARIO',
    "autorContacto" TEXT,
    "texto" TEXT NOT NULL,
    "rating" INTEGER DEFAULT 5,
    "mediaUrl" TEXT,
    "proyectoId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "notasAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentacion" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comentarios" TEXT,
    "usuarioId" TEXT,
    "proyectoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "concepto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comprobanteUrl" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "bannerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "linkAccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noticias" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "contenido" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'GENERAL',
    "imagenUrl" TEXT,
    "destacada" BOOLEAN NOT NULL DEFAULT false,
    "autorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noticias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "proyectos_slug_key" ON "proyectos"("slug");

-- CreateIndex
CREATE INDEX "etapas_proyectoId_idx" ON "etapas"("proyectoId");

-- CreateIndex
CREATE INDEX "manzanas_etapaId_idx" ON "manzanas"("etapaId");

-- CreateIndex
CREATE INDEX "unidades_manzanaId_idx" ON "unidades"("manzanaId");

-- CreateIndex
CREATE INDEX "unidades_estado_idx" ON "unidades"("estado");

-- CreateIndex
CREATE INDEX "unidades_responsableId_idx" ON "unidades"("responsableId");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_proyectoId_idx" ON "leads"("proyectoId");

-- CreateIndex
CREATE INDEX "leads_asignadoAId_idx" ON "leads"("asignadoAId");

-- CreateIndex
CREATE INDEX "leads_estado_idx" ON "leads"("estado");

-- CreateIndex
CREATE INDEX "lead_messages_leadId_idx" ON "lead_messages"("leadId");

-- CreateIndex
CREATE INDEX "reservas_unidadId_idx" ON "reservas"("unidadId");

-- CreateIndex
CREATE INDEX "reservas_leadId_idx" ON "reservas"("leadId");

-- CreateIndex
CREATE INDEX "reservas_vendedorId_idx" ON "reservas"("vendedorId");

-- CreateIndex
CREATE INDEX "reservas_estado_idx" ON "reservas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_bannerId_key" ON "pagos"("bannerId");

-- CreateIndex
CREATE INDEX "pagos_usuarioId_idx" ON "pagos"("usuarioId");

-- CreateIndex
CREATE INDEX "pagos_proyectoId_idx" ON "pagos"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "noticias_slug_key" ON "noticias"("slug");

-- AddForeignKey
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inversiones" ADD CONSTRAINT "inversiones_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inversiones" ADD CONSTRAINT "inversiones_inversorId_fkey" FOREIGN KEY ("inversorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hitos_escrow" ADD CONSTRAINT "hitos_escrow_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas" ADD CONSTRAINT "etapas_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manzanas" ADD CONSTRAINT "manzanas_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "etapas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzanas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_messages" ADD CONSTRAINT "lead_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_unidades" ADD CONSTRAINT "historial_unidades_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_unidades" ADD CONSTRAINT "historial_unidades_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours_360" ADD CONSTRAINT "tours_360_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours_360" ADD CONSTRAINT "tours_360_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonios" ADD CONSTRAINT "testimonios_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentacion" ADD CONSTRAINT "documentacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentacion" ADD CONSTRAINT "documentacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "banners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noticias" ADD CONSTRAINT "noticias_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

