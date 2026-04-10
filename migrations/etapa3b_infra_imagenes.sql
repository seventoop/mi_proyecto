-- ============================================================
-- Etapa 3B: nuevas tablas infraestructuras e imagenes_mapa
-- Compatible con PostgreSQL / Neon
-- NO resetea nada
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."infraestructuras" (
    "id"                  TEXT             NOT NULL,
    "proyectoId"          TEXT             NOT NULL,
    "nombre"              TEXT             NOT NULL,
    "categoria"           TEXT             NOT NULL,
    "tipo"                TEXT             NOT NULL,
    "geometriaTipo"       TEXT             NOT NULL,
    "coordenadas"         TEXT             NOT NULL,
    "estado"              TEXT             NOT NULL DEFAULT 'planificado',
    "descripcion"         TEXT,
    "superficie"          DOUBLE PRECISION,
    "longitudM"           DOUBLE PRECISION,
    "fechaEstimadaFin"    TIMESTAMP(3),
    "porcentajeAvance"    INTEGER          NOT NULL DEFAULT 0,
    "fotos"               TEXT,
    "colorPersonalizado"  TEXT,
    "orden"               INTEGER          NOT NULL DEFAULT 0,
    "visible"             BOOLEAN          NOT NULL DEFAULT true,
    "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "infraestructuras_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "infraestructuras_proyectoId_idx"
    ON "public"."infraestructuras"("proyectoId");

ALTER TABLE "public"."infraestructuras"
    DROP CONSTRAINT IF EXISTS "infraestructuras_proyectoId_fkey";
ALTER TABLE "public"."infraestructuras"
    ADD CONSTRAINT "infraestructuras_proyectoId_fkey"
    FOREIGN KEY ("proyectoId")
    REFERENCES "public"."proyectos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;


CREATE TABLE IF NOT EXISTS "public"."imagenes_mapa" (
    "id"           TEXT              NOT NULL,
    "proyectoId"   TEXT              NOT NULL,
    "unidadId"     TEXT,
    "url"          TEXT              NOT NULL,
    "tipo"         TEXT              NOT NULL DEFAULT 'foto',
    "titulo"       TEXT,
    "lat"          DOUBLE PRECISION  NOT NULL,
    "lng"          DOUBLE PRECISION  NOT NULL,
    "orden"        INTEGER           NOT NULL DEFAULT 0,
    "altitudM"     DOUBLE PRECISION           DEFAULT 500,
    "imageHeading" DOUBLE PRECISION           DEFAULT 0,
    "createdAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_mapa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "imagenes_mapa_proyectoId_idx"
    ON "public"."imagenes_mapa"("proyectoId");

CREATE INDEX IF NOT EXISTS "imagenes_mapa_unidadId_idx"
    ON "public"."imagenes_mapa"("unidadId");

ALTER TABLE "public"."imagenes_mapa"
    DROP CONSTRAINT IF EXISTS "imagenes_mapa_proyectoId_fkey";
ALTER TABLE "public"."imagenes_mapa"
    ADD CONSTRAINT "imagenes_mapa_proyectoId_fkey"
    FOREIGN KEY ("proyectoId")
    REFERENCES "public"."proyectos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."imagenes_mapa"
    DROP CONSTRAINT IF EXISTS "imagenes_mapa_unidadId_fkey";
ALTER TABLE "public"."imagenes_mapa"
    ADD CONSTRAINT "imagenes_mapa_unidadId_fkey"
    FOREIGN KEY ("unidadId")
    REFERENCES "public"."unidades"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;