BEGIN;

CREATE TEMP TABLE seed_project_definitions AS
SELECT *
FROM (
  VALUES
      (
        'reserva-geodevia',
        'Reserva Geodevia',
        'Reserva Geodevia es un desarrollo de urbanizacion premium en el Valle de Punilla, pensado para combinar naturaleza, servicios y una propuesta comercial clara desde el primer contacto.',
        'Valle de Punilla, Cordoba, Argentina',
        'URBANIZACION',
        'EN_VENTA',
        -31.4201::double precision,
        -64.1888::double precision,
        15,
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop',
        210::numeric,
        125::numeric,
        TRUE,
        24,
        330::double precision,
        38000::double precision
      ),
      (
        'barrio-los-alamos',
        'Barrio Los Alamos',
        'Barrio Los Alamos propone lotes amplios en una urbanizacion de baja densidad, con foco en primera vivienda y un producto comercial de rotacion rapida.',
        'Cordoba, Argentina',
        'URBANIZACION',
        'EN_VENTA',
        -31.3856::double precision,
        -64.2320::double precision,
        15,
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=2000&auto=format&fit=crop',
        165::numeric,
        NULL::numeric,
        FALSE,
        18,
        360::double precision,
        32000::double precision
      ),
      (
        'barrio-capinota',
        'Barrio Capinota',
        'Barrio Capinota es una propuesta residencial en Canuelas pensada para familias que buscan amplitud, verde y cercania con Buenos Aires.',
        'Canuelas, Buenos Aires, Argentina',
        'URBANIZACION',
        'PLANIFICACION',
        -34.7821::double precision,
        -58.6242::double precision,
        14,
        'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=2000&auto=format&fit=crop',
        145::numeric,
        NULL::numeric,
        FALSE,
        20,
        420::double precision,
        28000::double precision
      ),
      (
        'villa-del-lago',
        'Villa del Lago',
        'Villa del Lago combina laguna, lotes residenciales y un posicionamiento comercial premium para familias y segunda vivienda.',
        'Canuelas, Buenos Aires, Argentina',
        'URBANIZACION',
        'EN_DESARROLLO',
        -34.8012::double precision,
        -58.6105::double precision,
        14,
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop',
        190::numeric,
        118::numeric,
        TRUE,
        22,
        390::double precision,
        41000::double precision
      ),
      (
        'chacras-del-norte',
        'Chacras del Norte',
        'Chacras del Norte es un loteo de perfil rural residencial en Rafaela, con superficies amplias y una narrativa comercial centrada en espacio y tranquilidad.',
        'Rafaela, Santa Fe, Argentina',
        'LOTEO',
        'EN_DESARROLLO',
        -31.2533::double precision,
        -61.4867::double precision,
        15,
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2000&auto=format&fit=crop',
        132::numeric,
        NULL::numeric,
        FALSE,
        16,
        510::double precision,
        26000::double precision
      ),
      (
        'loteo-san-martin',
        'Loteo San Martin',
        'Loteo San Martin plantea una salida comercial accesible en Maipu, Mendoza, con foco en infraestructura resuelta y ticket de entrada competitivo.',
        'Maipu, Mendoza, Argentina',
        'LOTEO',
        'ENTREGADO',
        -32.8908::double precision,
        -68.8272::double precision,
        15,
        'https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=2000&auto=format&fit=crop',
        118::numeric,
        NULL::numeric,
        FALSE,
        17,
        300::double precision,
        22000::double precision
      ),
      (
        'barrio-las-casuarinas',
        'Barrio Las Casuarinas',
        'Barrio Las Casuarinas es un desarrollo urbano de perfil familiar en Cordoba Capital, con amenities basicos y un esquema comercial flexible.',
        'Cordoba Capital, Argentina',
        'URBANIZACION',
        'EN_VENTA',
        -31.4015::double precision,
        -64.2110::double precision,
        15,
        'https://images.unsplash.com/photo-1494526585095-c41746248156?q=80&w=2000&auto=format&fit=crop',
        175::numeric,
        NULL::numeric,
        FALSE,
        19,
        340::double precision,
        34500::double precision
      )
  ) AS t(
  slug,
  nombre,
  descripcion,
  ubicacion,
  tipo,
  estado,
  lat,
  lng,
  zoom,
  portada,
  precio_mercado,
  precio_inversor,
  invertible,
  unit_count,
  base_surface,
  base_price
);

WITH seed_owner AS (
  SELECT COALESCE(
    (SELECT id FROM users WHERE rol = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1),
    (SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1)
  ) AS id
),
cleanup_projects AS (
  SELECT id, slug
  FROM proyectos
  WHERE slug IN (SELECT slug FROM seed_project_definitions)
),
deleted_images AS (
  DELETE FROM proyecto_imagenes
  WHERE "proyectoId" IN (SELECT id FROM cleanup_projects)
  RETURNING 1
),
deleted_infra AS (
  DELETE FROM infraestructuras
  WHERE "proyectoId" IN (SELECT id FROM cleanup_projects)
  RETURNING 1
),
deleted_docs AS (
  DELETE FROM documentacion
  WHERE "proyectoId" IN (SELECT id FROM cleanup_projects)
  RETURNING 1
),
deleted_files AS (
  DELETE FROM proyecto_archivos
  WHERE "proyectoId" IN (SELECT id FROM cleanup_projects)
  RETURNING 1
),
deleted_escrow AS (
  DELETE FROM hitos_escrow
  WHERE "proyectoId" IN (SELECT id FROM cleanup_projects)
  RETURNING 1
),
deleted_stages AS (
  DELETE FROM etapas
  WHERE "proyectoId" IN (SELECT id FROM cleanup_projects)
  RETURNING 1
)
INSERT INTO proyectos (
  id,
  nombre,
  slug,
  descripcion,
  ubicacion,
  estado,
  tipo,
  "imagenPortada",
  galeria,
  "mapCenterLat",
  "mapCenterLng",
  "mapZoom",
  invertible,
  "precioM2Inversor",
  "precioM2Mercado",
  "documentacionEstado",
  "visibilityStatus",
  "creadoPorId",
  "createdAt",
  "updatedAt"
)
SELECT
  'seed-proyecto-' || d.slug,
  d.nombre,
  d.slug,
  d.descripcion,
  d.ubicacion,
  d.estado,
  d.tipo,
  d.portada,
  json_build_array(
    d.portada,
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200&auto=format&fit=crop'
  )::text,
  d.lat,
  d.lng,
  d.zoom,
  d.invertible,
  d.precio_inversor,
  d.precio_mercado,
  'APROBADO',
  'PUBLICADO',
  seed_owner.id,
  NOW(),
  NOW()
FROM seed_project_definitions d
CROSS JOIN seed_owner
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  ubicacion = EXCLUDED.ubicacion,
  estado = EXCLUDED.estado,
  tipo = EXCLUDED.tipo,
  "imagenPortada" = EXCLUDED."imagenPortada",
  galeria = EXCLUDED.galeria,
  "mapCenterLat" = EXCLUDED."mapCenterLat",
  "mapCenterLng" = EXCLUDED."mapCenterLng",
  "mapZoom" = EXCLUDED."mapZoom",
  invertible = EXCLUDED.invertible,
  "precioM2Inversor" = EXCLUDED."precioM2Inversor",
  "precioM2Mercado" = EXCLUDED."precioM2Mercado",
  "documentacionEstado" = EXCLUDED."documentacionEstado",
  "visibilityStatus" = EXCLUDED."visibilityStatus",
  "creadoPorId" = EXCLUDED."creadoPorId",
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO proyecto_imagenes (id, "proyectoId", url, categoria, "esPrincipal", orden, "createdAt")
SELECT
  'seed-img-' || p.slug || '-' || idx::text AS id,
  p.id,
  CASE idx
    WHEN 0 THEN p."imagenPortada"
    WHEN 1 THEN 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop'
    ELSE 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=1200&auto=format&fit=crop'
  END AS url,
  CASE idx
    WHEN 0 THEN 'EXTERIOR'
    WHEN 1 THEN 'MASTERPLAN'
    ELSE 'RENDER'
  END AS categoria,
  idx = 0 AS "esPrincipal",
  idx AS orden,
  NOW() AS "createdAt"
FROM proyectos p
CROSS JOIN generate_series(0, 2) AS idx
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
ON CONFLICT (id) DO UPDATE SET
  url = EXCLUDED.url,
  categoria = EXCLUDED.categoria,
  "esPrincipal" = EXCLUDED."esPrincipal",
  orden = EXCLUDED.orden;

INSERT INTO infraestructuras (
  id,
  "proyectoId",
  nombre,
  categoria,
  tipo,
  "geometriaTipo",
  coordenadas,
  estado,
  descripcion,
  "porcentajeAvance",
  visible,
  orden,
  "createdAt",
  "updatedAt"
)
SELECT
  'seed-infra-' || p.slug || '-' || infra.idx::text AS id,
  p.id,
  infra.nombre,
  infra.categoria,
  infra.tipo,
  'POINT',
  json_build_object(
    'lat', p."mapCenterLat" + infra.offset_lat,
    'lng', p."mapCenterLng" + infra.offset_lng
  )::text,
  infra.estado,
  infra.descripcion,
  infra.avance,
  TRUE,
  infra.idx,
  NOW(),
  NOW()
FROM proyectos p
JOIN (
  VALUES
    (1, 'Acceso principal', 'vialidad', 'acceso', 'construido', 'Ingreso resuelto con frente institucional y circulacion jerarquizada.', 100, 0.0001::double precision, 0.0001::double precision),
    (2, 'Red de servicios', 'servicios', 'infraestructura', 'en_construccion', 'Infraestructura basica para operacion comercial y futura entrega.', 72, -0.0001::double precision, 0.00012::double precision),
    (3, 'Area verde central', 'paisajismo', 'espacio_verde', 'planificado', 'Pulmon verde previsto como punto de encuentro y permanencia.', 45, 0.00014::double precision, -0.00008::double precision)
) AS infra(idx, nombre, categoria, tipo, estado, descripcion, avance, offset_lat, offset_lng)
  ON TRUE
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria = EXCLUDED.categoria,
  tipo = EXCLUDED.tipo,
  coordenadas = EXCLUDED.coordenadas,
  estado = EXCLUDED.estado,
  descripcion = EXCLUDED.descripcion,
  "porcentajeAvance" = EXCLUDED."porcentajeAvance",
  visible = EXCLUDED.visible,
  orden = EXCLUDED.orden,
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO documentacion (id, tipo, "archivoUrl", estado, "proyectoId", "createdAt", "updatedAt")
SELECT
  'seed-doc-' || p.slug || '-' || doc.tipo AS id,
  doc.tipo,
  doc.url,
  'APROBADO',
  p.id,
  NOW(),
  NOW()
FROM proyectos p
JOIN (
  VALUES
    ('BROCHURE', 'https://example.com/brochure.pdf'),
    ('PLANO_GENERAL', 'https://example.com/masterplan.pdf')
) AS doc(tipo, url)
  ON TRUE
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
ON CONFLICT (id) DO UPDATE SET
  "archivoUrl" = EXCLUDED."archivoUrl",
  estado = EXCLUDED.estado,
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO proyecto_archivos (id, "proyectoId", tipo, nombre, url, "visiblePublicamente", "createdAt")
SELECT
  'seed-archivo-' || p.slug || '-' || file.tipo AS id,
  p.id,
  file.tipo,
  file.nombre || ' ' || p.nombre,
  file.url,
  TRUE,
  NOW()
FROM proyectos p
JOIN (
  VALUES
    ('REGLAMENTO', 'Reglamento', 'https://example.com/reglamento.pdf'),
    ('FICHA_TECNICA', 'Ficha tecnica', 'https://example.com/ficha-tecnica.pdf')
) AS file(tipo, nombre, url)
  ON TRUE
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  url = EXCLUDED.url,
  "visiblePublicamente" = EXCLUDED."visiblePublicamente";

INSERT INTO hitos_escrow (id, "proyectoId", titulo, descripcion, porcentaje, estado, "fechaLogro", "createdAt")
SELECT
  'seed-escrow-' || p.slug || '-' || milestone.idx::text AS id,
  p.id,
  milestone.titulo,
  milestone.descripcion,
  milestone.porcentaje,
  milestone.estado,
  milestone.fecha_logro,
  NOW()
FROM proyectos p
JOIN (
  VALUES
    (1, 'Lanzamiento comercial', 'Apertura comercial del desarrollo y puesta en marcha del producto.', 20, 'COMPLETADO', NOW()),
    (2, 'Infraestructura base', 'Despliegue inicial de servicios y trazado principal.', 45, 'PENDIENTE', NULL::timestamp),
    (3, 'Consolidacion final', 'Etapa final para entrega, ocupacion y documentacion.', 100, 'PENDIENTE', NULL::timestamp)
) AS milestone(idx, titulo, descripcion, porcentaje, estado, fecha_logro)
  ON TRUE
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
  AND p.invertible = TRUE
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  porcentaje = EXCLUDED.porcentaje,
  estado = EXCLUDED.estado,
  "fechaLogro" = EXCLUDED."fechaLogro";

INSERT INTO etapas (id, "proyectoId", nombre, orden, estado, "createdAt", "updatedAt")
SELECT
  'seed-etapa-' || p.slug AS id,
  p.id,
  'Etapa 1',
  1,
  CASE
    WHEN p.estado = 'ENTREGADO' THEN 'COMPLETADA'
    ELSE 'EN_CURSO'
  END,
  NOW(),
  NOW()
FROM proyectos p
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  orden = EXCLUDED.orden,
  estado = EXCLUDED.estado,
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO manzanas (id, "etapaId", nombre, "createdAt", "updatedAt")
SELECT
  'seed-manzana-' || p.slug || '-' || lower(block.nombre) AS id,
  'seed-etapa-' || p.slug AS "etapaId",
  'Manzana ' || block.nombre,
  NOW(),
  NOW()
FROM proyectos p
JOIN (VALUES ('A'), ('B')) AS block(nombre)
  ON TRUE
WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  "updatedAt" = EXCLUDED."updatedAt";

WITH lots AS (
  SELECT
    p.id AS proyecto_id,
    p.slug,
    p.nombre,
    p."mapCenterLat" AS lat,
    p."mapCenterLng" AS lng,
    d.unit_count,
    d.base_surface,
    d.base_price,
    gs AS lot_index,
    CASE
      WHEN gs <= CEIL(d.unit_count / 2.0) THEN 'A'
      ELSE 'B'
    END AS block_name,
    LPAD(gs::text, 3, '0') AS lot_number,
    d.base_surface + ((gs % 5) * 12) AS surface,
    d.base_price + ((gs % 7) * 1850) AS price,
    12 + (gs % 3) AS frente,
    28 + (gs % 4) AS fondo,
    ((gs - 1) / 6) AS row_group,
    ((gs - 1) % 6) AS col_group
  FROM proyectos p
  JOIN seed_project_definitions d
    ON d.slug = p.slug
  CROSS JOIN generate_series(1, 24) AS gs
  WHERE p.slug IN (SELECT slug FROM seed_project_definitions)
    AND gs <= d.unit_count
)
INSERT INTO unidades (
  id,
  "manzanaId",
  numero,
  tipo,
  superficie,
  frente,
  fondo,
  "esEsquina",
  orientacion,
  precio,
  moneda,
  "centerLat",
  "centerLng",
  financiacion,
  estado,
  polygon,
  "createdAt",
  "updatedAt"
)
SELECT
  'seed-unidad-' || lots.slug || '-' || lots.lot_number AS id,
  'seed-manzana-' || lots.slug || '-' || lower(lots.block_name) AS "manzanaId",
  lots.lot_number,
  'LOTE',
  lots.surface,
  lots.frente,
  lots.fondo,
  (lots.col_group = 0 OR lots.col_group = 5),
  CASE (lots.lot_index % 4)
    WHEN 0 THEN 'NORTE'
    WHEN 1 THEN 'ESTE'
    WHEN 2 THEN 'SUR'
    ELSE 'OESTE'
  END,
  lots.price,
  'USD',
  lots.lat + (lots.row_group * 0.00042) + CASE WHEN lots.block_name = 'B' THEN 0.0012 ELSE 0 END,
  lots.lng + (lots.col_group * 0.00038),
  CASE
    WHEN lots.lot_index % 3 = 0 THEN 'Anticipo 30% y 48 cuotas'
    WHEN lots.lot_index % 3 = 1 THEN 'Anticipo 40% y 36 cuotas'
    ELSE 'Contado con descuento'
  END,
  CASE
    WHEN lots.lot_index % 11 = 0 THEN 'VENDIDA'
    WHEN lots.lot_index % 7 = 0 THEN 'RESERVADA'
    ELSE 'DISPONIBLE'
  END,
  json_build_object(
    'type', 'Polygon',
    'coordinates', json_build_array(
      json_build_array(
        json_build_array(lots.lng + (lots.col_group * 0.00038) - 0.00012, lots.lat + (lots.row_group * 0.00042) - 0.00012 + CASE WHEN lots.block_name = 'B' THEN 0.0012 ELSE 0 END),
        json_build_array(lots.lng + (lots.col_group * 0.00038) + 0.00012, lots.lat + (lots.row_group * 0.00042) - 0.00012 + CASE WHEN lots.block_name = 'B' THEN 0.0012 ELSE 0 END),
        json_build_array(lots.lng + (lots.col_group * 0.00038) + 0.00012, lots.lat + (lots.row_group * 0.00042) + 0.00012 + CASE WHEN lots.block_name = 'B' THEN 0.0012 ELSE 0 END),
        json_build_array(lots.lng + (lots.col_group * 0.00038) - 0.00012, lots.lat + (lots.row_group * 0.00042) + 0.00012 + CASE WHEN lots.block_name = 'B' THEN 0.0012 ELSE 0 END),
        json_build_array(lots.lng + (lots.col_group * 0.00038) - 0.00012, lots.lat + (lots.row_group * 0.00042) - 0.00012 + CASE WHEN lots.block_name = 'B' THEN 0.0012 ELSE 0 END)
      )
    )
  )::jsonb,
  NOW(),
  NOW()
FROM lots
ON CONFLICT (id) DO UPDATE SET
  numero = EXCLUDED.numero,
  superficie = EXCLUDED.superficie,
  frente = EXCLUDED.frente,
  fondo = EXCLUDED.fondo,
  "esEsquina" = EXCLUDED."esEsquina",
  orientacion = EXCLUDED.orientacion,
  precio = EXCLUDED.precio,
  moneda = EXCLUDED.moneda,
  "centerLat" = EXCLUDED."centerLat",
  "centerLng" = EXCLUDED."centerLng",
  financiacion = EXCLUDED.financiacion,
  estado = EXCLUDED.estado,
  polygon = EXCLUDED.polygon,
  "updatedAt" = EXCLUDED."updatedAt";

COMMIT;
