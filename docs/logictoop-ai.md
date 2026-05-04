# LogicToop AI — Documentación Interna del Módulo

> **Estado**: MVP human-in-the-loop (Fase 2E.1 cerrada)
> **Rama**: `dani-dev4`
> **Último commit**: `d14aac1 fix(ai): set approval timestamp explicitly`

---

## 1. Resumen del módulo

LogicToop AI es el subsistema de orquestación de inteligencia artificial dentro de SevenToop. Permite registrar agentes IA, crear tareas que requieren aprobación humana, y gestionar el ciclo de vida de esas tareas a través de un panel de administración protegido.

En su estado actual, el módulo opera como un **MVP inerte**: registra y gestiona estados de tareas IA sin ejecutar ningún efecto secundario real en la plataforma (no modifica proyectos, leads, banners, ni envía emails).

---

## 2. Objetivo del MVP human-in-the-loop

Establecer la infraestructura base para que un administrador humano pueda:

- Visualizar tareas generadas por agentes IA.
- Aprobar o rechazar cada tarea de forma individual.
- Dejar registro de auditoría de cada decisión.
- Mantener el control total sobre cualquier acción que la IA proponga.

**Principio rector**: Ninguna acción de IA se ejecuta sin aprobación humana explícita.

---

## 3. Arquitectura actual

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│                                                     │
│  /orchestrator          /orchestrator/approvals     │
│  ┌──────────────┐       ┌─────────────────────┐     │
│  │ Orchestrator │──────▶│  ApprovalsClient    │     │
│  │   Client     │       │  (tabla + botones)  │     │
│  └──────────────┘       └────────┬────────────┘     │
│                                  │                  │
│                          Server Actions             │
│                          (lib/actions/)              │
├──────────────────────────────────┼──────────────────┤
│                                  │                  │
│  ┌───────────────┐    ┌──────────▼──────────┐       │
│  │  AI Gateway   │◀───│  logictoop-ai.ts    │       │
│  │  (validación) │    │  - getAiTasks       │       │
│  └───────────────┘    │  - approveAiTask    │       │
│                       │  - rejectAiTask     │       │
│                       └──────────┬──────────┘       │
│                                  │                  │
│                       ┌──────────▼──────────┐       │
│                       │    Prisma / DB      │       │
│                       │  - AiAgent          │       │
│                       │  - AiTask           │       │
│                       │  - AiApproval       │       │
│                       └─────────────────────┘       │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │         Paperclip (DESCONECTADO)        │        │
│  │         No hay llamadas HTTP            │        │
│  │         No hay webhooks                 │        │
│  │         FEATURE_FLAG = false            │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

---

## 4. Rutas existentes

| Ruta | Tipo | Descripción |
|---|---|---|
| `/dashboard/admin/logictoop/orchestrator` | Page (Server + Client) | Panel principal del AI Orchestrator |
| `/dashboard/admin/logictoop/orchestrator/approvals` | Page (Server + Client) | Bandeja de aprobaciones IA |

Ambas rutas están protegidas por:
- Autenticación (`requireAuth`)
- Validación de rol (`ADMIN` / `SUPERADMIN`)
- Feature flag (`FEATURE_FLAG_LOGICTOOP_AI_UI`)

---

## 5. Archivos principales

### Backend

| Archivo | Responsabilidad |
|---|---|
| `lib/actions/logictoop-ai.ts` | Server Actions: `getAiTasks`, `getAiAgents`, `rejectAiTask`, `approveAiTask` |
| `lib/logictoop/ai-gateway.ts` | Validación de seguridad, payload limits, feature flags |

### Frontend

| Archivo | Responsabilidad |
|---|---|
| `app/(dashboard)/dashboard/admin/logictoop/orchestrator/page.tsx` | Server component del Orchestrator |
| `app/(dashboard)/dashboard/admin/logictoop/orchestrator/orchestrator-client.tsx` | Client component con tarjeta de navegación a Approvals |
| `app/(dashboard)/dashboard/admin/logictoop/orchestrator/approvals/page.tsx` | Server component de Approvals (auth, flags, data fetching) |
| `app/(dashboard)/dashboard/admin/logictoop/orchestrator/approvals/_components/approvals-client.tsx` | Client component: tabla, botones Aprobar/Rechazar, feedback |

### Datos

| Archivo | Responsabilidad |
|---|---|
| `prisma/schema.prisma` | Modelos `LogicToopAiAgent`, `LogicToopAiTask`, `LogicToopAiApproval` |
| `prisma/migrations/20260503110000_add_logictoop_ai_foundations/migration.sql` | Migración formal de las tablas AI |

---

## 6. Feature flags

Definidos en `.env` / `.env.local`:

| Variable | Default | Controla |
|---|---|---|
| `FEATURE_FLAG_LOGICTOOP_AI_UI` | `"true"` | Acceso a las páginas UI del módulo AI |
| `FEATURE_FLAG_LOGICTOOP_AI_CORE` | `"true"` | Habilitación de escritura en DB (aprobar/rechazar) |
| `FEATURE_FLAG_PAPERCLIP` | `"false"` | Habilitación general del motor Paperclip |
| `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION` | `"false"` | Conexión HTTP real a la API de Paperclip |

### Matriz de comportamiento

| UI | CORE | Resultado |
|---|---|---|
| `false` | `*` | Páginas inaccesibles |
| `true` | `false` | **Modo lectura**: tabla visible, botones deshabilitados, Server Actions bloqueadas |
| `true` | `true` | **Modo operativo**: aprobación y rechazo funcionales |

---

## 7. Modelos Prisma

### `LogicToopAiAgent`

Tabla: `logictoop_ai_agents`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `orgId` | String | Organización propietaria |
| `name` | String | Nombre del agente |
| `role` | String | Rol del agente (e.g. "QA/Ops Agent") |
| `systemPrompt` | String? | Prompt del sistema |
| `tools` | Json | Lista de herramientas disponibles |
| `status` | String | `ACTIVE` / `INACTIVE` |

### `LogicToopAiTask`

Tabla: `logictoop_ai_tasks`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `orgId` | String | Organización propietaria |
| `agentId` | String | FK → `LogicToopAiAgent` |
| `requestedById` | String | FK → `User` que solicitó la tarea |
| `executionId` | String? | FK → `LogicToopExecution` (opcional) |
| `inputPayload` | Json | Datos de entrada de la tarea |
| `outputResult` | Json? | Resultado (null en fase actual) |
| `status` | String | Estado actual de la tarea |
| `costTokens` | Int | Tokens consumidos (0 en fase actual) |
| `costEstimated` | Float | Costo estimado (0 en fase actual) |
| `paperclipRunId` | String? | ID de ejecución en Paperclip (null, no conectado) |
| `errorLogs` | Json? | Logs de error |

### `LogicToopAiApproval`

Tabla: `logictoop_ai_approvals`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | String (cuid) | PK |
| `taskId` | String | FK → `LogicToopAiTask` |
| `approvedById` | String | FK → `User` que tomó la decisión |
| `approvedAt` | DateTime? | Timestamp explícito de la decisión |
| `comments` | String? | Motivo o comentario del administrador |
| `actionTaken` | String | Acción registrada (ver sección 12/13) |

---

## 8. Estados de `LogicToopAiTask`

| Estado | Descripción | Se puede aprobar | Se puede rechazar |
|---|---|---|---|
| `PENDING` | Tarea recién creada | ✅ | ✅ |
| `NEEDS_APPROVAL` | Requiere revisión humana explícita | ✅ | ✅ |
| `APPROVED` | Aprobada por admin | ❌ | ❌ |
| `REJECTED` | Rechazada por admin | ❌ | ❌ |
| `COMPLETED` | Ejecutada exitosamente (futuro) | ❌ | ❌ |
| `FAILED` | Error de ejecución (futuro) | ❌ | ❌ |
| `CANCELLED` | Cancelada (futuro) | ❌ | ❌ |

---

## 9. Flujo de creación de task

> **Nota**: En la fase actual, las tasks se crean manualmente via seed o script de prueba. No existe aún un flujo automatizado de creación.

Flujo futuro previsto:

1. Un agente IA (interno o Paperclip) genera una propuesta de acción.
2. SevenToop recibe la propuesta y crea un `LogicToopAiTask` con `status = "PENDING"` o `"NEEDS_APPROVAL"`.
3. La tarea aparece en la Bandeja de Aprobaciones para revisión humana.

---

## 10. Flujo de aprobación (`approveAiTask`)

1. **`requireAuth()`** — Verifica sesión activa.
2. **Validación de rol** — Solo `ADMIN` o `SUPERADMIN`. Lanza `AuthError(403)` si no cumple.
3. **Feature flag** — Verifica `FEATURE_FLAG_LOGICTOOP_AI_CORE === "true"`. Retorna error controlado si no.
4. **Búsqueda con tenant isolation** — `findFirst` con filtro `orgId`:
   - `ADMIN`: limitado a su propia organización.
   - `SUPERADMIN`: puede operar globalmente.
5. **Validación de estado** — Solo permite `PENDING` o `NEEDS_APPROVAL`.
6. **Transacción atómica** (`$transaction`):
   - Actualiza `LogicToopAiTask.status` → `"APPROVED"`.
   - Crea registro en `LogicToopAiApproval`:
     - `actionTaken` = `"APPROVED_NO_SIDE_EFFECTS"`
     - `approvedAt` = timestamp actual
     - `approvedById` = ID del usuario autenticado
     - `comments` = input del usuario o `"Aprobado sin side-effects (Fase 2E.1)"`
7. **`revalidatePath()`** — Refresca la página de approvals.
8. **Retorna** `{ success: true, taskId }`.

**En esta fase, aprobar NO ejecuta ninguna acción real.** Solo cambia el estado y registra la auditoría.

---

## 11. Flujo de rechazo (`rejectAiTask`)

1. Mismas validaciones de auth, rol, flag y tenant isolation que la aprobación.
2. **Transacción atómica** (`$transaction`):
   - Actualiza `LogicToopAiTask.status` → `"REJECTED"`.
   - Crea registro en `LogicToopAiApproval`:
     - `actionTaken` = `"REJECTED"`
     - `approvedAt` = timestamp actual
     - `approvedById` = ID del usuario autenticado
     - `comments` = motivo proporcionado por el admin
3. `revalidatePath()` y retorno.

**En esta fase, rechazar NO ejecuta ninguna acción real.** Solo cambia el estado y registra la auditoría.

---

## 12. Qué significa `APPROVED_NO_SIDE_EFFECTS`

Este valor en `LogicToopAiApproval.actionTaken` indica que:

- El administrador aprobó la tarea propuesta por la IA.
- La aprobación **no disparó ninguna acción** en el sistema (no modificó proyectos, leads, banners, etc.).
- Es una marca explícita de que la aprobación ocurrió en la **Fase 2E.1** (MVP inerte).
- En fases futuras, cuando se habiliten side-effects reales, el `actionTaken` cambiará a un valor diferente (e.g. `"APPROVED"`, `"APPROVED_WITH_EXECUTION"`).

---

## 13. Qué significa `REJECTED`

Este valor en `LogicToopAiApproval.actionTaken` indica que:

- El administrador rechazó la tarea propuesta por la IA.
- El rechazo incluye un motivo en el campo `comments`.
- La tarea queda en estado terminal `REJECTED` y no puede ser re-procesada en esta fase.

---

## 14. Seguridad

### Autenticación

Todas las Server Actions llaman a `requireAuth()` como primera línea. Si no hay sesión válida, se lanza un error y la acción se aborta.

### Roles

Solo `ADMIN` y `SUPERADMIN` pueden acceder al módulo. Otros roles (`VENDEDOR`, `INVERSOR`, `CLIENTE`) son bloqueados con `AuthError(403)`.

### Tenant isolation (orgId)

- **ADMIN**: Todas las queries filtran por `orgId = user.orgId`. Un ADMIN no puede ver ni operar sobre tareas de otra organización.
- **SUPERADMIN**: Puede operar globalmente (sin filtro de `orgId`). Esto es intencional para soporte y administración cross-tenant.

### Feature flags

- `FEATURE_FLAG_LOGICTOOP_AI_UI`: Controla acceso a las páginas. Si es `false`, las rutas retornan vacío o redirigen.
- `FEATURE_FLAG_LOGICTOOP_AI_CORE`: Controla escritura. Si es `false`, las Server Actions de escritura retornan error controlado y los botones en la UI están deshabilitados.

### No conexión directa frontend → Paperclip

El frontend **nunca** llama directamente a la API de Paperclip. Todo pasa por Server Actions de SevenToop. Actualmente no existe ninguna llamada HTTP a Paperclip en el codebase.

---

## 15. Cómo probar en local

### Prerrequisitos

1. Docker Desktop corriendo.
2. Base de datos levantada:
   ```bash
   docker-compose up -d
   ```
3. Migraciones aplicadas:
   ```bash
   npm run db:migrate:dev
   ```
4. Seed ejecutado:
   ```bash
   npm run db:seed
   ```

### Variables de entorno requeridas (`.env.local`)

```
FEATURE_FLAG_LOGICTOOP_AI_CORE="true"
FEATURE_FLAG_LOGICTOOP_AI_UI="true"
FEATURE_FLAG_PAPERCLIP="false"
FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION="false"
```

### Usuarios de prueba

Usar un usuario local con rol `ADMIN` o `SUPERADMIN` perteneciente a la organización de desarrollo.

Requisitos del usuario de prueba:
- `rol`: `ADMIN` o `SUPERADMIN`
- `orgId`: `seventoop-main`
- `FEATURE_FLAG_LOGICTOOP_AI_UI` = `"true"`
- `FEATURE_FLAG_LOGICTOOP_AI_CORE` = `"true"`

Las credenciales concretas deben obtenerse del entorno local (`prisma/seed.ts`), del administrador del proyecto, o ejecutando `npm run db:seed` para crear los usuarios de desarrollo. **No documentar contraseñas en este archivo.**

### Acceso

1. Levantar la app: `npm run dev`
2. Abrir: `http://localhost:5000`
3. Iniciar sesión con alguno de los usuarios de prueba.
4. Navegar a: `/dashboard/admin/logictoop/orchestrator`
5. Hacer clic en la tarjeta de "Bandeja de Aprobaciones IA".

---

## 16. Datos dummy usados en validación

Estos datos fueron creados manualmente para validar la Fase 2E.1:

| Entidad | ID | Detalles |
|---|---|---|
| Organization | `seventoop-main` | Org principal de desarrollo |
| Agent | `cmopxbg210000nqowfvwgc7i5` | "QA/Ops Agent" |
| Task | `cmopxcbyv0001xpangj8hbiu3` | Tarea dummy, status: `APPROVED` |
| Approval | `cmoqly99r000ac2g5qhk3bhkb` | `APPROVED_NO_SIDE_EFFECTS` |
| Approver | `cmokqi4os0000nh18zaxv8sm4` | SUPERADMIN local de desarrollo |

---

## 17. Qué NO hace todavía

| Capacidad | Estado |
|---|---|
| Ejecutar acciones reales post-aprobación | ❌ No implementado |
| Conexión HTTP a Paperclip API | ❌ No implementado |
| Webhooks de entrada o salida | ❌ No implementado |
| Nodos IA dentro de LogicToop Flows (Canvas) | ❌ No implementado |
| Marketplace de agentes IA | ❌ No implementado |
| Modificar proyectos al aprobar | ❌ No implementado (por diseño) |
| Modificar leads al aprobar | ❌ No implementado (por diseño) |
| Modificar banners al aprobar | ❌ No implementado (por diseño) |
| Enviar emails al aprobar/rechazar | ❌ No implementado |
| Notificaciones push | ❌ No implementado |
| Re-aprobar tareas rechazadas | ❌ No implementado |
| Creación automática de tasks por agentes | ❌ No implementado |

---

## 18. Riesgos mitigados

| Riesgo | Mitigación |
|---|---|
| Acceso no autorizado | `requireAuth()` + validación de rol |
| Cross-tenant data leak | Filtro `orgId` en todas las queries |
| Side-effects accidentales | `actionTaken = "APPROVED_NO_SIDE_EFFECTS"`, sin lógica de ejecución |
| Double-approval | Validación de estado: solo `PENDING`/`NEEDS_APPROVAL` pueden ser procesados |
| Escritura sin feature flag | `FEATURE_FLAG_LOGICTOOP_AI_CORE` bloquea Server Actions |
| Conexión prematura a Paperclip | `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION = false`, sin código de conexión |
| UI habilitada sin backend | Botones deshabilitados cuando `canWrite = false` |
| Inconsistencia de datos | Transacciones Prisma (`$transaction`) para atomicidad |

---

## 19. Pendientes de UX

Mejoras de interfaz que no afectan la lógica de negocio:

- **Filtros**: Filtrar tareas por estado, agente o fecha.
- **Paginación**: La tabla actual carga todas las tareas. Agregar paginación server-side para escalabilidad.
- **Detalle expandido**: Mostrar `inputPayload` y `outputResult` en un modal o drawer al hacer clic en una tarea.
- **Historial por task**: Mostrar todos los registros de `LogicToopAiApproval` asociados a una tarea.
- **Confirmación mejorada**: Reemplazar `window.confirm` y `window.prompt` por modales de la UI.

---

## 20. Opciones para Fase 3

> ⚠️ **Ninguna opción debe implementarse sin un plan técnico aprobado previamente.**

### A. Agentes internos sin Paperclip

Crear un motor de ejecución propio dentro de SevenToop que procese las tareas aprobadas internamente, sin dependencias externas.

- **Pro**: Máximo control, sin latencia de red, sin dependencia de servicio externo.
- **Contra**: Requiere diseñar queue management, retry policy y cost tracking.

### B. Nodos IA dentro de LogicToop Flow

Extender el workflow engine existente (Canvas) para incluir nodos de tipo "IA" que puedan generar tareas automáticamente.

- **Pro**: Reutiliza infraestructura existente, integración natural con automatizaciones.
- **Contra**: Requiere extensión del modelo de nodos y del executor del workflow.

### C. Paperclip real como sidecar

Conectar Paperclip como servicio externo que recibe tareas aprobadas y retorna resultados.

- **Pro**: Motor de IA dedicado, separación de concerns.
- **Contra**: Requiere autenticación service-to-service, circuit breaker, retry policy, health checks.

### D. Webhooks de resultados IA

Exponer un endpoint que reciba resultados de ejecución de IA desde servicios externos.

- **Pro**: Desacoplamiento, compatibilidad con múltiples proveedores.
- **Contra**: Requiere endpoint público, validación de firmas, idempotencia, manejo de reintentos.

---

## 21. Recomendación

**Priorizar opciones A o B** (agentes internos o nodos IA en flows) antes de conectar Paperclip real:

1. Ambas opciones mantienen el control total dentro de SevenToop.
2. No introducen dependencias externas.
3. Permiten iterar rápido sobre el flujo de ejecución.
4. La infraestructura de human-in-the-loop ya está lista para soportarlas.

**Paperclip real** (opción C) debe diferirse hasta tener un caso de uso concreto que justifique la complejidad operativa de mantener un servicio externo.

---

## Historial de commits

```
cdaf5a5 feat(ai): setup logictoop ai orchestrator foundations
ce47204 feat(ai): add inert logictoop approvals flags
b5c11b2 chore(db): add logictoop ai foundations migration
16792da feat(ai): add protected logictoop ai orchestrator page
d95f3d7 feat(ai): persist protected logictoop ai tasks
df80656 feat(ai): add logictoop approvals dashboard
6c5337b feat(ai): link approvals inbox from orchestrator
dd40305 feat(ai): approve logictoop tasks without side effects
d14aac1 fix(ai): set approval timestamp explicitly
```
