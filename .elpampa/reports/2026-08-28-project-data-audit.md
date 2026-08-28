# Seventoop - Auditoria Inicial De Datos De Proyectos

Fecha local: 2026-08-28
Perfil: autonomo, con barrera alta para produccion

## Resultado Ejecutivo

La app publica no muestra proyectos porque la base Supabase conectada no tiene filas en `public.proyectos`. Tambien se verifico que `public.unidades` esta en cero. La estructura de tablas si existe y coincide con el modelo fisico esperado por Prisma, incluyendo `proyectos`, `etapas`, `manzanas`, `unidades`, `imagenes_mapa`, `proyecto_imagenes`, `infraestructuras`, `tours_360`, `tour_scenes` y `tour_hotspots`.

Esto apunta a una base inicializada con schema pero sin carga de datos, no a un problema principal de filtros publicos.

## Como Se Muestra Un Proyecto Publico

El listado publico usa `listPublicProjectCards()` y el detalle usa `getPublicProjectShowcaseBySlug()`. Ambos terminan pasando por `buildPublicProjectWhere()`.

Condiciones publicas confirmadas:

- `deletedAt` debe ser `null`.
- `visibilityStatus` debe ser `PUBLICADO`.
- `estado` no puede ser `SUSPENDIDO`, `CANCELADO`, `ELIMINADO` o `DESACTIVADO`.
- Si `isDemo = true`, `demoExpiresAt` debe existir y ser futura.

Nota importante: `demoExpiresAt` no es una fecha comercial de vencimiento del proyecto. Solo afecta a proyectos marcados como demo. La fecha comercial del fondeo/inversion es `fechaLimiteFondeo`.

## Que Contiene Un Proyecto

`Proyecto` es el objeto central. Tiene datos comerciales, tenant, estado publico, validacion interna, flags operativos, mapa, masterplan, IA, inversion y relaciones.

Relaciones principales:

- Inventario: `Proyecto -> Etapa -> Manzana -> Unidad`.
- Media publica: `ProyectoImagen`, `ImagenMapa`, `Infraestructura`, `Tour360`, `TourScene`, `Hotspot`.
- Comercial: `Lead`, `Oportunidad`, `Reserva`, `Pago`.
- Inversion: `Inversion`, `EscrowMilestone`, `PriceHistory`.
- Operacion: `ProyectoUsuario`, `ProyectoEstadoLog`, `ProjectFeatureFlags`.

## Caminos De Creacion

Hay mas de una superficie de creacion:

- `createProyecto` en `lib/actions/proyectos.ts`: camino mas completo. Genera slug, valida KYC/demo, asigna `orgId`, `creadoPorId`, estado de validacion, flags, relacion OWNER y audit log.
- `POST /api/proyectos`: camino mas liviano. Crea proyecto basico y puede saltear side effects importantes del Server Action.
- `POST /api/developments`: parece legado o alias de proyecto.

Riesgo: si distintos clientes usan caminos distintos, pueden crearse proyectos con datos incompletos para dashboard, permisos, auditoria o publicacion.

## Masterplan Y Lotes

El flujo de plano tiene dos capas:

- Upload de fuente: `/api/upload/masterplan`, acepta SVG/DXF/DWG/PDF/imagenes validadas y guarda el archivo.
- Procesamiento cliente: `components/masterplan/blueprint-engine.tsx` detecta tipo, parsea SVG/DXF cuando puede, genera SVG util o fallback visual, y arma una tabla editable de lotes.
- Sync: `/api/proyectos/[id]/blueprint/sync` guarda `masterplanSVG` y crea/actualiza `Unidad` cuando `processingMode = detected-lots`.

Si hay `overlayBounds`, el sync proyecta centros de lotes a `geoJSON`. Eso permite unir plano y ubicacion geografica.

Limite confirmado: el sync permite hasta 5000 paths y SVG de hasta 8 MB. Para un barrio de mas de 2000 lotes entra conceptualmente, pero hay que testear performance real de UI, DB y render.

## Hallazgos

- Supabase tiene el schema, pero datos inmobiliarios vacios.
- La consulta compacta fallo por usar nombres de tabla inferidos desde modelos. Los nombres fisicos correctos salen de `@@map`: `tours_360` y `tour_hotspots`.
- `estado` de unidad no esta centralizado como enum; hay variantes `RESERVADO/RESERVADA` y `VENDIDO/VENDIDA` segun superficie.
- La creacion de proyecto no esta unificada entre Server Action y API.
- El parser de DXF tiene fallback seguro cuando no detecta lotes confiables, lo cual es bueno para no crear basura.
- Para proyectos grandes conviene auditar paginacion, virtualizacion y rendimiento antes de cargar 2000+ lotes reales.

## Recomendacion De Ejemplos

Preparar ejemplos chicos pero ricos:

1. `valles-del-pino-demo`: barrio privado de escala grande simulado, 3 etapas, 36 lotes, masterplan SVG simple, coordenadas, imagenes, infraestructura y tour 360 placeholder.
2. `campo-la-reserva-demo`: loteo rural premium simulado, 2 etapas, 24 lotes, infraestructura y galeria.

El script `scripts/seed-el-pampa-projects.ts` queda dry-run por defecto. Solo escribe si se ejecuta con `--apply`.

## Proximo Paso Seguro

1. Correr auditoria read-only en local o Supabase.
2. Revisar salida del seed en dry-run.
3. Decidir destino: local primero, Supabase despues.
4. Aplicar ejemplos solo con autorizacion explicita sobre ese destino.

## Cierre Del Ciclo

Se agregaron dos herramientas locales:

- `scripts/elpampa-project-data-audit.ts`: auditoria read-only de conteos, visibilidad y muestras de proyectos.
- `scripts/seed-el-pampa-projects.ts`: ejemplos ricos en modo dry-run por defecto, con apply explicito.

Se agregaron los comandos `audit:elpampa-projects`, `seed:elpampa-projects:dry-run` y `seed:elpampa-projects:apply` en `package.json`.

En el ciclo siguiente se instalaron las dependencias desde `package-lock.json` y el dry-run del seed ejecuto correctamente, sin escrituras. El auditor tambien ejecuto correctamente hasta la conexion, pero `DATABASE_URL` de `.env.local` fue rechazado por Supabase con `P1000` (credenciales invalidas para `postgres`). Esto confirma que el bloqueo actual es de credencial local, no de nombres de tablas ni del script. El typecheck sigue fallando solo por el problema preexistente de `roleChangeRequest` documentado en `TECH_DEBT.md`; el auditor nuevo ya no agrega errores de tipos. No se aplico ningun seed.

## Carga De Ejemplos Y Vercel

Con autorizacion explicita del usuario, se cargaron en el proyecto Supabase `Seventoop` dos ejemplos idempotentes: `Valles del Pino - Demo` con 3 etapas, 6 manzanas y 36 unidades, y `Campo La Reserva - Demo` con 2 etapas, 4 manzanas y 24 unidades. Ambos quedaron en estado `EN_VENTA`, visibilidad `PUBLICADO`, con imagen, masterplan SVG, infraestructura y tour de prueba.

Vercel esta vinculado al repositorio correcto y tiene un deploy de `main` en estado listo. La inspeccion de runtime detecto `DATABASE_URL` vacia y `NEXTAUTH_SECRET` ausente en el deploy anterior. Se regenero `NEXTAUTH_SECRET` para Production y Preview. Falta configurar una credencial valida para `DATABASE_URL` y hacer un nuevo deploy; por eso la verificacion visual de las paginas publicas todavia no puede considerarse completa.
