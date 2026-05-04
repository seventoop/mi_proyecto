> Este documento es fuente de contexto obligatoria antes de modificar el módulo Proyectos.
> Todo agente IA (Antigravity/Codex) debe leer este manual completo antes de tocar código.
> Antes de tocar código relacionado con pasos 1 al 7, respetar las zonas sensibles.
> Paso 2, Paso 3 y herramientas internas del Paso 5 son zonas sensibles: no tocar sin causa raíz confirmada.
> No se puede modificar código sin diagnóstico previo. No se puede declarar resuelto un problema sin prueba manual real.
> El foco actual de reparación está en Paso 4: Mapa Interactivo y su integración con la habilitación de Paso 5.

# Manual Técnico-Funcional — Módulo Proyectos SevenToop

## 0. Ley obligatoria para agentes IA

- **Diagnóstico primero**: Antes de modificar código, leer este manual completo.
- **Identificar el fallo**: Identificar exactamente qué paso falla.
- **Respetar zonas**: Identificar qué pasos NO deben tocarse (Zonas Sensibles).
- **Fuente de verdad**: Identificar qué campo en la DB es la fuente de verdad.
- **Contrato de reparación**: Entregar diagnóstico y proponer patch mínimo.
- **Esperar autorización**: No aplicar cambios grandes sin aprobación.
- **No commit / No push**: Nunca hacer commit ni push sin orden expresa.
- **Persistencia real**: No usar blob URLs como fuente de persistencia.
- **Habilitación real**: No habilitar botones artificialmente sin resolver la fuente de verdad.
- **Aislamiento**: No tocar Paso 2 o 3 para arreglar el Paso 4. No tocar herramientas de Paso 5 para arreglar su habilitación.

## 1. Propósito del módulo
El módulo de Proyectos es el núcleo operativo de SevenToop. Permite a los desarrolladores inmobiliarios gestionar el ciclo de vida completo de un desarrollo: desde la carga técnica del plano y la georreferenciación en mapas reales, hasta la creación de tours virtuales 360°, gestión de inventario, ventas y CRM. El flujo está diseñado de forma progresiva en 7 pasos interconectados.

## 2. Entrada al flujo
El acceso al flujo de gestión se realiza desde el listado de proyectos.
- **Ruta de listado**: `/dashboard/proyectos` (o `/dashboard/admin/proyectos`).
- **Acción**: Botón **"Gestionar"** en la tarjeta del proyecto.
- **Ruta de gestión**: `/dashboard/proyectos/[id]` (donde `id` es el CUID del proyecto).
- **Componente Principal**: `ProyectoDetailPage` (`app/(dashboard)/dashboard/proyectos/[id]/page.tsx`).

## 3. Arquitectura general de datos
El módulo se apoya principalmente en los siguientes modelos de base de datos (`prisma/schema.prisma`):

| Modelo | Propósito | Campos Clave |
| :--- | :--- | :--- |
| **Proyecto** | Registro principal del desarrollo. | `masterplanSVG`, `overlayBounds`, `mapCenterLat`, `mapCenterLng`, `mapZoom`, `overlayRotation`. |
| **Etapa / Manzana** | Estructura jerárquica del loteo. | `coordenadas` (polígono visual en Manzana). |
| **Unidad** | Lote o departamento individual. | `estado` (DISPONIBLE, VENDIDA, etc), `coordenadasMasterplan` (JSON del path SVG), `polygon` (GeoJSON). |
| **ProyectoImagen** | Galería de imágenes (renders, avance). | `categoria` (360, RENDER, REAL), `masterplanOverlay` (JSON de calibración). |
| **Tour360** | Contenedor de experiencias inmersivas. | `isPublished`, `anchors` (anclajes espaciales). |
| **TourScene** | Escena individual dentro de un tour. | `imageUrl`, `masterplanOverlay` (puntos de control pitch/yaw para proyectar plano). |

## 4. Sistema de pasos (Flujo actual estable)
La navegación es gestionada por el componente `ProjectStepsDock` y controlada mediante el query param `?tab=`. El progreso se calcula dinámicamente en el servidor. Este flujo NO debe renumerarse ni modificarse todavía.

| Paso | Nombre | Condición de completitud | Archivos relacionados |
| :--- | :--- | :--- | :--- |
| 1 | Información General | `nombre`, `ubicacion` y `descripcion` presentes. | `page.tsx` |
| 2 | Plano del Proyecto | `masterplanSVG` no es nulo. | `blueprint-engine.tsx` |
| 3 | Masterplan | Existen unidades (`total > 0`). | `masterplan-viewer.tsx` |
| 4 | Mapa Interactivo | `overlayBounds` no es nulo. | `masterplan-map.tsx` |
| 5 | Galería / Tour 360 | Tiene al menos 1 tour o 1 imagen de mapa. | `tour-creator.tsx` |
| 6 | Comercial | Tiene pagos o documentación técnica. | `project-docs-tab.tsx` |
| 7 | CRM / Gestión | Tiene al menos 1 lead registrado. | `leads-client.tsx` |

## 5. Paso 1 — Información General
Muestra y edita los metadatos básicos. Utiliza la acción `updateProyecto`. Es el requisito mínimo para que el proyecto sea visible públicamente.

## 6. Paso 2 — Plano del Proyecto [ZONA SENSIBLE]
Base técnica del sistema vectorial. El usuario sube un archivo y el `BlueprintEngine` extrae el `masterplanSVG`. No tocar salvo causa raíz confirmada.

## 7. Paso 3 — Masterplan [ZONA SENSIBLE]
Renderiza el inventario vectorial sobre el SVG del Paso 2. Centraliza la gestión de unidades. No tocar salvo causa raíz confirmada.

## 8. Paso 4 — Mapa Interactivo [FOCO CRÍTICO]
### 8.1 Propósito
Georreferenciar el proyecto. Superpone el plano vectorial sobre la cartografía real.

### 8.2 Contrato obligatorio del Paso 4
El Paso 4 se considera correcto **solo si**:
- El plano aparece inmediatamente al entrar.
- El botón **“Ajustar Plano”** NO parpadea.
- El usuario puede ajustar, fijar posición y guardar exitosamente.
- Al navegar a Paso 5 u otros pasos y volver, el plano sigue visible y en la misma ubicación.
- Al refrescar con **F5**, el plano sigue visible y en la misma ubicación.
- El Paso 5 se habilita solo si el Paso 4 está realmente guardado en la DB.
- No hay errores de tipo "Maximum update depth exceeded".
- No hay dependencia de blob URLs como fuente persistente.

## 9. Paso 5 — Galería / Tour 360 / Biblioteca [ZONA SENSIBLE]
### 9.1 Condición para "Editar imagen"
Se habilita solo si se cumple: `canAlignProjectPlan = Boolean(projectOverlayBounds && hasPersistentPlan)`.
### 9.2 Herramientas del Editor
Editor de proyección matemática entre imagen y mapa. No tocar herramientas internas para arreglar habilitación.

## 10. Evolución futura del flujo — Modelado y Renderización Arquitectónica

### Flujo futuro propuesto (NO IMPLEMENTAR TODAVÍA)
1. Información General
2. Plano del Proyecto
3. Masterplan
4. Mapa Interactivo
**5. Modelado y Renderización Arquitectónica (NUEVO)**
6. Galería de Imágenes / Tour 360 / Biblioteca
7. Comercial
8. CRM / Gestión

### Propósito del futuro Paso 5
Permitir el modelado visual asistido: volumetrías, renders exteriores/interiores, escenas de proyecto futuro y material para comercialización. Debe contemplar loteos, barrios, countries, edificios y amenities.

**REGLA CRÍTICA**: No crear botones ni tabs para este paso hasta que el flujo actual (Pasos 1-7) esté 100% estabilizado.

## 11. APIs relevantes
- `/api/proyectos/[id]/blueprint`: Retorna el SVG persistente.
- `/api/proyectos/[id]/overlay`: Gestiona `bounds` y `rotation`.
- `getProjectBlueprintData`: Recupera unidades vectoriales.

## 12. Procedimiento obligatorio antes de reparar bugs
El agente debe ejecutar y analizar:
```bash
git branch --show-current
git status --short
git log --oneline -10
git diff --name-only
git diff --stat
```
Y responder explícitamente:
- ¿Qué paso falla?
- ¿Qué pasos funcionan y no deben tocarse?
- ¿Qué fuente de verdad lee y escribe el paso?
- ¿Qué API y campo están involucrados?
- ¿Qué patch mínimo propone?

## 13. Checklist obligatorio antes de commit
- `npm run typecheck` pasa.
- `git diff --check` pasa.
- `git status --short` revisado.
- No hay archivos temporales (`forensic_logs.txt`, `scratch/`, `x`, etc).
- No se tocó `package-lock.json`, `.env`, `Auth` ni banners globales.
- Pasos 1 a 3 funcionan correctamente.
- Paso 4 estable: sin parpadeo, guarda y persiste tras F5.
- Paso 5: habilitación correcta y herramientas funcionales.

## 14. Prompt base obligatorio para Antigravity/Codex
> “Leé primero docs/MANUAL_MODULO_PROYECTOS.md completo.
> No modifiques código hasta identificar causa raíz.
> Respetá las zonas sensibles: Paso 2, Paso 3 y herramientas internas de Paso 5 NO TOCAR.
> El foco actual está en Paso 4 y su integración con Paso 5.
> No hacer commit. No hacer push.”
