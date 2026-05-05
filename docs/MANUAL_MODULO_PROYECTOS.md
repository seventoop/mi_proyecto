# MANUAL DEFINITIVO DE PRODUCCIÓN — MÓDULO PROYECTOS SEVENTOOP

> **Este documento es fuente de contexto obligatoria.**
> Todo agente IA (Antigravity/Codex) o desarrollador DEBE leer este manual completo antes de tocar código.
> Paso 2, Paso 3 y herramientas internas del Paso 5/6 son zonas sensibles: no tocar sin causa raíz confirmada.
> El foco actual de estabilidad es el Paso 4 y su integración con la persistencia del Paso 5 actual.

---

## 0. Ley Suprema del Módulo

El módulo Proyectos de SevenToop es una **máquina de estados determinística basada en base de datos**.

La base de datos es la única fuente de verdad. La UI solo representa el estado. Los botones solo ejecutan mutaciones controladas. Los pasos solo se habilitan por datos persistidos y válidos. Los recursos temporales nunca definen el estado del sistema.

### Reglas absolutas
*   No se puede modificar código sin diagnóstico previo.
*   No se puede declarar resuelto un problema sin prueba manual real.
*   No se puede hacer commit ni push sin orden expresa.
*   No se puede usar UI, estado local, blob URLs, flags temporales o caché como fuente de verdad.
*   No se puede habilitar un paso si la condición persistida en DB no existe o no es válida.
*   No se puede tocar una zona sensible sin causa raíz confirmada.
*   No se puede corregir un paso rompiendo otro.
*   No se puede reemplazar lógica estable por una reescritura amplia sin justificación forense.

---

## 1. Propósito del Módulo Proyectos

El módulo Proyectos es el núcleo operativo de SevenToop. Permite a desarrolladoras, administradores, equipos comerciales, arquitectos y clientes compradores gestionar y visualizar el ciclo de vida completo de un desarrollo inmobiliario.

El sistema permite:
*   Crear desarrollos inmobiliarios y cargar su información general.
*   Procesar planos técnicos (DXF/SVG) y generar un masterplan interactivo.
*   Georreferenciar el proyecto sobre cartografía real (Mapa Interactivo).
*   Generar contenido visual, renders y escenas futuras (Modelado Arquitectónico).
*   Administrar galería, tours 360° y biblioteca visual de assets.
*   Alimentar de forma automática la landing pública del proyecto.
*   Gestionar leads, CRM, documentación comercial y pagos.

### Principio de producto
SevenToop no es solo un dashboard. Es una plataforma visual donde cada proyecto se convierte en una experiencia digital navegable y vendible.

---

## 2. Modelo Mental Obligatorio

```txt
Proyecto = Estado Global
Estado = f(DB)
UI = representación del estado, NO fuente de verdad
Acciones = mutaciones controladas sobre DB
Pasos = validaciones sobre DB
Render = reconstrucción visual desde datos persistidos o derivados
Landing = vitrina pública alimentada por el módulo Proyectos
```

Si el usuario refresca con F5, cierra sesión o navega entre tabs, el sistema debe reconstruirse íntegramente desde DB. Si algo solo existe en memoria, no existe para el sistema.

---

## 3. Tipos de Estado

### 3.1 Persistido (Fuente de Verdad)
Vive en la DB. Ejemplo: `masterplanSVG`, `overlayBounds`, `overlayRotation`, `Unidad.coordenadasMasterplan`, `ProyectoImagen.masterplanOverlay`, `Tour360.anchors`.

### 3.2 Derivado
Recalculado desde datos persistidos. Ejemplo: `svgViewBox`, `canAlignProjectPlan`, centroides visuales, bounds proyectados desde SVG, preview de composición.

### 3.3 Temporal
Existe solo en la sesión. **No confiable**. Ejemplo: `blob:` URLs, previews locales no guardadas, archivos en memoria, flags temporales.

### 3.4 Visual
Estado puramente UI. Ejemplo: instancia Leaflet, zoom local, tooltip abierto, drag activo, selección visual, modal abierto.

> **Regla**: Solo el estado **Persistido** define completitud, habilitación y persistencia del sistema.

---

## 4. Invariantes de Producción

1.  La DB es la única fuente de verdad.
2.  La UI nunca define el estado de completitud.
3.  Todo paso completado debe poder reconstruirse tras F5.
4.  **PROHIBIDO** persistir `blob:` URLs en la DB.
5.  `overlayBounds` debe ser geométricamente válido.
6.  `overlayBounds` + `masterplanSVG` deben permitir reconstruir el Paso 4.
7.  Paso 5 actual (o Paso 6 futuro) no habilita edición sin Paso 4 válido.
8.  En el flujo futuro, el nuevo Paso 5 genera assets visuales reutilizables.
9.  La landing del proyecto consume assets aprobados desde el módulo.
10. Todo patch debe ser mínimo, localizado, reversible y verificable.

---

## 5. Rutas Oficiales

### Gestión de proyecto
*   **Listado**: `/dashboard/proyectos`
*   **Gestión**: `/dashboard/proyectos/[id]`
*   **Pestañas**: `/dashboard/proyectos/[id]?tab=...` (Tab activo controlado por query param).

### Landing pública
*   **Ruta**: `/proyectos/[slug]` o `/desarrollos/[slug]`
*   La landing es alimentada directamente por los datos y assets validados en el módulo Proyectos.

---

## 6. Flujo Actual Estable — 7 Pasos

Este es el flujo operativo actual que no debe romperse:
1.  **Información General**: Datos básicos del proyecto.
2.  **Plano del Proyecto**: Carga de SVG/DXF.
3.  **Masterplan**: Inventario vectorial y lotes.
4.  **Mapa Interactivo**: Georreferenciación (Leaflet).
5.  **Galería / Tour 360 / Biblioteca**: Contenido visual y tours.
6.  **Comercial**: Documentación y pagos.
7.  **CRM / Gestión**: Leads y clientes.

---

## 7. Flujo Objetivo Futuro — 8 Pasos

Evolución aprobada del producto (No implementar todavía en código):
1.  Información General
2.  Plano del Proyecto
3.  Masterplan
4.  Mapa Interactivo
5.  **Modelado y Renderización Arquitectónica (NUEVO)**
6.  **Galería / Tour 360 / Biblioteca Visual** (Desplazado)
7.  **Comercial** (Desplazado)
8.  **CRM / Gestión** (Desplazado)

---

## 8. Comparación de Flujos

| Función | Flujo Actual | Flujo Futuro |
| :--- | :---: | :---: |
| Información General | Paso 1 | Paso 1 |
| Plano del Proyecto | Paso 2 | Paso 2 |
| Masterplan | Paso 3 | Paso 3 |
| Mapa Interactivo | Paso 4 | Paso 4 |
| Modelado y Renderizado | No existe | **Paso 5** |
| Galería / Tour 360 | Paso 5 | **Paso 6** |
| Comercial | Paso 6 | **Paso 7** |
| CRM / Gestión | Paso 7 | **Paso 8** |

---

## 9. Contrato de Completitud (Flujo Actual)

```ts
currentStepCompletion = {
  step1: Boolean(nombre && ubicacion && descripcion),
  step2: Boolean(masterplanSVG),
  step3: unidades.length > 0,
  step4: overlayBoundsValido, // Proyecto.overlayBounds persistido y parseable
  step5: hasTours || hasImages,
  step6: hasDocs || hasPayments,
  step7: hasLeads
}
```

---

## 10. Contrato de Completitud (Flujo Futuro)

```ts
futureStepCompletion = {
  // ...Pasos 1-4 igual...
  step5: hasArchitecturalAssets || hasModelingDrafts || hasGeneratedScenes,
  step6: hasPublishedAssets || hasTours || hasVisualLibraryAssets,
  step7: hasDocs || hasPayments || hasCommercialMaterial,
  step8: hasLeads || hasClientActivity
}
```

---

## 11. Contratos por Paso — Flujo Actual

### Paso 1 — Información General
*   **Fuente**: `Proyecto.nombre`, `ubicacion`, `descripcion`.
*   **Escribe**: `updateProyecto`.
*   **Unlocks**: Paso 2.

### Paso 2 — Plano del Proyecto [ZONA SENSIBLE]
*   **Fuente**: `Proyecto.masterplanSVG`.
*   **Riesgo**: Re-sincronizar el plano puede romper la integridad si existen ventas o reservas.
*   **Regla**: No tocar la lógica de extracción de paths sin causa raíz confirmada.

### Paso 3 — Masterplan [ZONA SENSIBLE]
*   **Fuente**: `Unidad.coordenadasMasterplan`, `Unidad.estado`.
*   **Blindaje**: Render estable (sin flicker), números y superficies siempre visibles, interactividad reactiva (Hover/Click).

### Paso 4 — Mapa Interactivo [FOCO CRÍTICO]
*   **Fuente**: `Proyecto.overlayBounds`, `overlayRotation`, `mapCenter`.
*   **Contrato**: El plano debe aparecer al entrar, el mapa no genera loops, persiste tras F5.
*   **Controles**: La sección de zoom debe distinguir claramente entre `Zoom del mapa` (base layer) y `Escala del plano` (overlay).
*   **Reset**: El botón eliminar solo resetea la georreferenciación (P4) y NUNCA elimina `masterplanSVG`, unidades, galería ni tours. Requiere confirmación explícita.
*   **Rescue Effect**: Si hay `bounds` pero no `imageUrl` (post-F5), el sistema regenera el visual desde el SVG.
*   **Prohibido**: Persistir `blob:` URLs en la DB.

### Paso 5 Actual — Galería / Tour 360 [ZONA SENSIBLE]
*   **Fuente**: `ProyectoImagen`, `Tour360`.
*   **Condición Editar**: `canAlignProjectPlan` requiere Paso 4 válido en DB.
*   **Blindaje**: Botón `+ Cargar imágenes` siempre visible en header y empty state. La carga no depende de tours previos.

---

## 12. Paso 5 Futuro — Modelado y Renderización Arquitectónica

### 12.1 Propósito
Permitir a desarrolladoras y clientes finales crear contenido visual asistido sin conocimientos técnicos. El objetivo es un sistema guiado de visualización y renderización asistida.

### 12.2 Casos de Uso
*   **Desarrolladoras**: Renders de fachadas, amenities y unidades modelo para la landing.
*   **Arquitectos**: Generar variantes de estilo y propuestas visuales rápidas.
*   **Clientes**: Visualizar su futura casa sobre su lote, elegir estilos y guardar variantes.

### 12.3 Entradas y Salidas
*   **Entradas**: Plano arquitectónico, lote del masterplan, descripción textual o plantilla.
*   **Salidas**: Renders exteriores/interiores, escenas 360°, imágenes para la landing.

---

## 13. Paso 6 Futuro — Galería / Tour 360 / Biblioteca Visual

### 13.1 Responsabilidad
Administrar todos los assets visuales del proyecto. Organiza lo generado en el Paso 5 y lo cargado manualmente.
*   **Funciones**: Crear tours, seleccionar destacados, asignar imágenes a la landing, gestionar la biblioteca.
*   **Contrato**: La carga de imágenes es independiente y siempre accesible.

---

## 14. Paso 7 Futuro — Comercial

### 14.1 Foco
Aceleración de ventas mediante material técnico y comercial consolidado.
*   **Contenido**: Documentación técnica, fichas de unidad, planes de pago, materiales descargables para brokers.

---

## 15. Paso 8 Futuro — CRM / Gestión

### 15.1 Foco
Concentración de leads y actividad de usuarios.
*   **Señales Comerciales**: El CRM registra si un cliente generó renders en el Paso 5, qué estilos prefiere y cuántas veces visualizó una unidad.

---

## 16. Landing del Proyecto

### 16.1 Vitrina Pública
La landing consume información del módulo Proyectos para mostrar:
*   Nombre, ubicación y descripción.
*   Masterplan interactivo y disponibilidad de unidades.
*   Galería de renders (Paso 5) y fotos reales.
*   Tours 360° (Paso 6).
*   Documentación pública y formularios de contacto (CRM).

---

## 17. Roles y Permisos

| Rol | Permisos Principales | Limitaciones |
| :--- | :--- | :--- |
| **Superadmin** | Control total, auditoría, publicación global. | Ninguna. |
| **Admin** | Gestión de proyectos, planos, assets y landing. | No accede a configuración global de sistema. |
| **Desarrolladora** | Gestión de sus proyectos, generación de renders, leads propios. | Solo ve sus proyectos asignados. |
| **Arquitecto** | Uso de herramientas de modelado (P5), variantes, biblioteca. | No altera datos comerciales o CRM. |
| **Cliente Comprador** | Ver su unidad, crear renders privados de su casa. | No publica en landing, no ve otros clientes. |

---

## 18. Estados de Assets Visuales (Lifecycle)

Todo asset visual debe seguir este flujo de estados:
1.  **DRAFT**: Borrador inicial o proceso de generación.
2.  **GENERATED**: Resultado de IA o modelado, pendiente de guardado.
3.  **SAVED**: Persistido en biblioteca, visible internamente.
4.  **APPROVED**: Validado por el Admin/Desarrolladora para uso comercial.
5.  **PUBLISHED**: Visible en la landing pública del proyecto.
6.  **ARCHIVED**: Retirado de visibilidad pero conservado en historia.

---

## 19. Publicación en Landing

### 19.1 Reglas de Publicación
Un asset solo llega a la landing si:
*   Su estado es `APPROVED` o `PUBLISHED`.
*   Tiene el flag `isPublishedToLanding = true`.
*   Posee una URL persistente (No blobs).
*   El usuario que publica tiene permisos de Admin/Desarrolladora.

---

## 20. Fases de Implementación del Nuevo Paso 5

1.  **Fase 1 (MVP)**: Carga de plano, elección de estilo y generación de renders estáticos. Guardado en biblioteca.
2.  **Fase 2 (Integración)**: Conexión con Tour 360 y escenas por unidad/lote.
3.  **Fase 3 (Cliente)**: Acceso para compradores para diseñar sobre su lote real.
4.  **Fase 4 (Premium)**: Recorridos inmersivos y colaboración en tiempo real.

---

## 21. Reglas de No Implementación Prematura

**PROHIBIDO** hasta autorización expresa:
*   Crear el tab real del Paso 5 futuro en la UI.
*   Renumerar los pasos 5-7 actuales en el código.
*   Cambiar rutas de API para acomodar el flujo futuro.
*   Crear placeholders o lógica incompleta para el nuevo Paso 5.

---

## 22. Validación Fuerte de overlayBounds

El sistema debe validar la coherencia geométrica de los `overlayBounds`. Son inválidos si:
*   Contienen `NaN`, `undefined` o coordenadas infinitas.
*   Están fuera de los rangos [-90, 90] lat y [-180, 180] lng.
*   Tienen área cero o puntos repetidos que degeneran el polígono.
*   **Acción**: Si es inválido, el sistema debe impedir el guardado y loguear el error.

---

## 23. Contrato Paso 4: Blob URLs y Rescue Effect

### 23.1 Rescue Visual
Si el sistema detecta `overlayBounds` válidos pero falta el `imageUrl` (por expiración de blob post-refresco), debe disparar el **Rescue Effect**:
*   Regenerar el blob visual desde el `masterplanSVG` persistido.
*   **Seguridad**: Usar `hasAttemptedRescueRef` para evitar loops de render infinitos.

---

## 24. Dependencias Críticas Internas

Piezas de código blindadas que no deben alterarse sin justificación:
*   **Paso 3**: `prevUnitsRef` y `Fast-path` de render para evitar flickers de SVG.
*   **Paso 4**: `hasAttemptedRescueRef`, `leafletMapRef`, y el cleanup `.remove()` de la instancia de mapa.
*   **Integración P4-P5**: `canAlignProjectPlan` basado estrictamente en datos de DB.

---

## 25. Sistema de Diagnóstico Obligatorio

Antes de tocar código, el agente debe responder:
1.  **Qué paso falla**: Identificar el número y nombre.
2.  **Comportamiento exacto**: Qué hace vs qué debería hacer.
3.  **Completitud**: Qué condición de DB no se está cumpliendo.
4.  **Fuente de Verdad**: Qué campo y tabla de Prisma están involucrados.
5.  **API/Acción**: Qué ruta lee o escribe ese dato.
6.  **Tipo de Bug**: Clasificar según sección 26.
7.  **Zonas Sensibles**: Listar qué NO se va a tocar.
8.  **Patch Mínimo**: Describir el cambio localizado.
9.  **Validación**: Cómo se probará manualmente (F5, navegación, persistencia).

---

## 26. Clasificación Obligatoria de Bugs

1.  **Persistencia**: DB no guarda o guarda datos corruptos.
2.  **Sincronización FE/BE**: El cliente tiene datos distintos al servidor.
3.  **Render/UI**: Los datos están bien, pero la visualización parpadea o falla.
4.  **Habilitación**: Pasos o botones bloqueados/habilitados erróneamente.
5.  **Integridad Geométrica**: Coordenadas inválidas o polígonos degenerados.
6.  **Publicación/Landing**: Assets visibles sin permiso o no visibles estando aprobados.
7.  **Permisos/Rol**: Falla en el control de acceso.

---

## 27. Gates de Producción

Un cambio solo es aceptable si supera:
1.  **Gate Diagnóstico**: Diagnóstico previo escrito y aprobado.
2.  **Gate Patch Mínimo**: El cambio es localizado y no afecta colaterales.
3.  **Gate Typecheck**: `npm run typecheck` debe pasar sin errores.
4.  **Gate Diff Limpio**: Sin archivos temporales o cambios en archivos prohibidos (.env, package-lock).
5.  **Gate Validación**: Probar P3 -> P4 -> P5 -> P4 y refrescar con F5 en cada uno.

---

## 28. Logs Forenses

Eventos mínimos que deben poder auditarse (vía consola o tabla de Audit):
*   `OVERLAY_SAVE_SUCCESS` / `OVERLAY_SAVE_FAILED`
*   `OVERLAY_RESCUE_STARTED` / `OVERLAY_RESCUE_FINISHED`
*   `BLUEPRINT_SYNC_STARTED` / `BLUEPRINT_SYNC_FINISHED`
*   `STEP_NAVIGATION_ATTEMPTED` (con validación de completitud)
*   `ASSET_STATUS_CHANGED` (DRAFT -> APPROVED -> PUBLISHED)
*   `LANDING_PUBLISH_ATTEMPTED` (con chequeo de permisos)

---

## 29. Validadores Recomendados

Se recomienda centralizar la lógica de contratos en `lib/projects/project-state-contract.ts`:
*   `validateOverlayBounds(bounds)`: Validador geométrico.
*   `canEnterStep(project, step)`: Validador de flujo de estados.
*   `canPublishToLanding(asset, user)`: Validador de negocio y permisos.

## 30. Estándares de Sincronización FE-BE (Blindaje Técnico)

Para evitar regresiones en la habilitación de herramientas críticas (como el botón "Editar imagen" en Paso 5), se deben seguir estos estándares:

### A. Fetching de Datos Críticos
Todo fetch de configuración de proyecto (`blueprint`, `overlay`, `plan-gallery`) desde componentes de trabajo (Paso 4 y Paso 5) DEBE usar `cache: "no-store"` para ignorar el cache del navegador/router.
```ts
fetch(`/api/proyectos/${id}/overlay`, { cache: "no-store" })
```

### B. Parsing Resiliente de Georreferenciación
Debido a que Prisma puede devolver strings JSON o el motor de la API puede duplicar la serialización, el parsing de `overlayBounds` debe ser defensivo en el frontend:
1. Verificar si el dato es un `string`.
2. Si es string, intentar un `JSON.parse` adicional.
3. Validar que el resultado sea un array de longitud 2.

### C. Independencia de Pasos
El Paso 5 no debe depender del estado volátil de memoria del Paso 4. Siempre debe re-hidratar la georreferenciación directamente desde la API en el `mount` del componente para asegurar que ve los últimos cambios guardados.

### D. Logs Forenses de Sincronización
Cada componente crítico debe emitir un log en consola al cargar datos de georreferenciación exitosamente:
`[Componente] Project georeferencing loaded successfully: [[...], [...]]`

---

## 31. Criterios de Sistema Terminado

El módulo se considera estable si:
1.  **Persistencia Total**: F5 en cualquier paso reconstruye el estado exacto.
2.  **Navegación Fluida**: No hay parpadeos (flickers) al cambiar de tab o al sincronizar datos de fondo.
3.  **Habilitación Determinística**: Los pasos se habilitan SOLO si la DB confirma que el anterior está completo.
4.  **Seguridad de Datos**: No existen `blob:` URLs en la DB y no hay mapas duplicados en memoria.
5.  **Alineación Landing**: Los datos públicos coinciden exactamente con los assets aprobados en el dashboard.

---

## 32. Editor 360 / Editor de Imagen — Paso 5 actual

### 32.1 Botón “Editar imagen”
Debe habilitarse cuando existe imagen editable seleccionada, georreferenciación válida del Paso 4, y plano persistente. No debe depender de blob URLs, preview local o caché. Si existe `projectOverlayBounds` válido, el editor debe poder abrirse.

### 32.2 Galería de Assets dentro del editor
La herramienta **Imagen** del editor debe conectarse con las imágenes reales del proyecto cargadas en el Paso 5.
* Debe listar assets reales del proyecto y no aparecer vacía si existen.
* No debe exigir assets publicados en landing.
* Texto empty state: “No hay imágenes cargadas en el proyecto. Subí imágenes desde la Galería del Paso 5 para usarlas como assets.”

### 32.3 Marcos e imágenes insertadas
En modo edición:
* Click normal sobre marco o imagen insertada debe seleccionar el elemento.
* Click normal NO debe navegar, NO debe cerrar el editor, NO debe volver atrás.
* La imagen/marco debe seguir siendo editable (drag/drop habilitado).
* Guardar cambios debe persistir marco, imagen vinculada y posición.

### 32.4 Botón Play del marco
Contrato obligatorio en modo edición:
* El botón Play puede aparecer si el marco tiene una escena vinculada.
* Al hacer click en Play, debe cambiar a la escena vinculada dentro del mismo editor SIN CERRARLO ni volver atrás.
* **Regla crítica:** `onSaved` silencioso no debe ejecutar `setIsOverlayEditorOpen(false)`. El cierre del editor solo ocurre por acción explícita.
En modo preview / navegación: el botón Play funciona como portal/navegación.

### 32.5 Separación de modos
**Regla:** Editando se edita. Navegando se navega.
* Modo edición: click selecciona, drag/drop edita, Play cambia escena interna.
* Modo preview: click/play navega escenas.

### 32.6 Persistencia esperada
Después de guardar, al hacer F5 en Paso 5: el editor debe reconstruirse con assets, marcos, imágenes insertadas y vínculos conservados. Paso 4 no debe perder georreferenciación.

### 32.7 Funciones blindadas
* `projectScenes={scenes}` alimenta la Galería de Assets del editor.
* `onNavigate` dentro del editor cambia escena activa sin cerrarlo.
* `onSaved` silencioso no cierra el editor.
* El botón Play no se elimina del editor.
* Click normal no dispara navegación en modo edición.

### 32.8 Anti-regresión
Checklist Paso 5: abrir “Editar imagen” -> verificar botón habilitado -> abrir herramienta Imagen -> confirmar assets visibles -> crear marco e insertar imagen -> click normal selecciona -> Play cambia escena interna -> guardar -> F5 -> volver a editar -> confirmar persistencia -> confirmar Paso 4 intacto.

### 32.9 Herramientas de Ubicación y Polígonos (Contrato de Herramientas)
Contrato obligatorio para herramientas interactivas del editor:

#### Herramienta Ubicación
*   **Comportamiento**: Click en canvas sitúa un marcador de ubicación (MapPin) con indicador (cola).
*   **Interactividad**:
    *   **Selección**: Click selecciona, mostrando paleta de colores flotante y barra de borrado.
    *   **Edición**: Doble click en la etiqueta para editar el texto.
    *   **Personalización**: Permite cambiar el color del marcador y etiqueta desde la paleta.
*   **Render**: Debe proyectarse en el espacio 360 si la escena está anclada.

#### Herramienta Polígonos / Grilla
*   **Comportamiento**: Construcción punto a punto mediante clicks sucesivos.
*   **Cierre**: El polígono se cierra automáticamente al hacer click en el punto inicial o mediante el botón "Finalizar" (Check verde) en el sidebar.
*   **Visualización**: Sombreado interior semitransparente con borde sólido.
*   **Personalización**: Selección activa paleta de colores flotante para el trazo y relleno.
*   **Geometría**: Se persiste como un conjunto de coordenadas world-space (pitch/yaw) proyectadas.

#### Herramienta POI (Clipboard Paste & Contextual Toolbar)
*   **Comportamiento**: Click en canvas sitúa un marcador de punto de interés (POI).
*   **POI con imagen pegada desde portapapeles**:
    *   El usuario debe poder seleccionar un POI y pegar una imagen/logo desde el portapapeles.
    *   El flujo esperado es: 1. copiar imagen desde navegador; 2. volver al editor; 3. seleccionar POI; 4. usar botón visible “Pegar imagen” o Ctrl+V; 5. aplicar imagen al POI; 6. guardar; 7. F5; 8. la imagen debe persistir.
    *   El sistema debe soportar imágenes desde clipboard cuando sea posible usando `navigator.clipboard.read()` desde un botón visible.
    *   Ctrl+V existe como atajo, pero no es la única forma.
    *   Si el navegador bloquea el clipboard o no hay POI seleccionado, debe mostrar un mensaje claro (Toast).
    *   La imagen pegada debe subirse a storage persistente (`/api/upload/360`), no quedar como blob temporal.
    *   El POI debe actualizarse visualmente en tiempo real.
*   **Toolbar contextual del POI**:
    *   Al seleccionar un POI debe mostrarse una acción clara para **Pegar imagen**, selectores de color (si aplica) y el botón **Eliminar POI**.
    *   El botón eliminar solo elimina el POI seleccionado de la escena actual.
    *   Eliminar un POI **NO** debe borrar: assets del servidor, imágenes de la galería, marcos, líneas, flechas, polígonos, ubicación/georreferenciación ni otras escenas.
*   **Anti-regresión**:
    *   No eliminar botón “Pegar imagen” sin autorización explícita.
    *   No volver a depender solo de Ctrl+V.
    *   No guardar imágenes como blob URLs.
    *   No romper marcos, Play, Ubicación, Polígonos/Grilla ni Galería de Assets.

---

## 33. Prompt Base Obligatorio para IA

```txt
Leé completo docs/MANUAL_MODULO_PROYECTOS.md antes de tocar código.

Este módulo es una máquina de estados basada en DB.
La DB es la única fuente de verdad. La UI no define completitud.
Los blob URLs son temporales y nunca se persisten.

El flujo actual estable tiene 7 pasos (1.Info, 2.Plano, 3.Masterplan, 4.Mapa, 5.Galería/Tour, 6.Comercial, 7.CRM).
El flujo futuro de 8 pasos es HOJA DE RUTA, NO IMPLEMENTAR.

Antes de modificar código, respondé el Diagnóstico Obligatorio (Sección 25 del manual).
Clasificá el bug (Sección 26).
Respetá las Zonas Sensibles (P2, P3, P5 interno).

Prohibido: Forzar habilitaciones, simular estados, persistir blob URLs, romper el Fast-path de render o eliminar protecciones de loop en el mapa.
```

---

## 34. Regla Final

Si una IA o desarrollador no puede demostrar qué campo de DB lee/escribe y cómo afecta al flujo de estados, **no está autorizada** a modificar el módulo Proyectos.
