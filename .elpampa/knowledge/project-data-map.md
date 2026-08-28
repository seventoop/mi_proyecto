# Mapa De Conocimiento - Datos De Proyectos

## Concepto Producto

Seventoop vende y opera proyectos inmobiliarios: barrios privados, loteos, desarrollos con masterplan, lotes, estados comerciales, tours 360, fotos aereas, infraestructura y formularios de contacto.

El caso objetivo mencionado es un campo sojero convertido en barrio privado muy grande, con mas de 2000 lotes y 3 etapas. Para testeo conviene usar ejemplos reducidos que representen esa complejidad sin cargar volumen real desde el primer ciclo.

## Vocabulario

- Proyecto: desarrollo inmobiliario publicable.
- Etapa: fase del desarrollo.
- Manzana: agrupacion interna de lotes.
- Unidad: lote o unidad vendible.
- Masterplan: plano SVG/DXF/imagen asociado al proyecto.
- ImagenMapa: foto geolocalizada, incluyendo aereas y 360.
- Infraestructura: calles, plazas, club house, piletas, servicios u obras dibujables.
- Tour360: recorrido con escenas y hotspots.

## Memoria Para Proximos Ciclos

Antes de diagnosticar datos:

1. Leer `prisma/schema.prisma` y respetar `@@map`.
2. Consultar `information_schema.tables` si se usa Supabase.
3. Separar estado del schema, datos existentes y filtros publicos.
4. No confundir `demoExpiresAt` con `fechaLimiteFondeo`.
5. No escribir datos remotos sin autorizacion explicita del destino.
