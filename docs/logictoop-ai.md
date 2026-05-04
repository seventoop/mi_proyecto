# LogicToop AI — Documentación Interna del Módulo

> **Estado**: Internal Agent Runner / Human-in-the-loop MVP (Fase 3A completada)
> **Rama**: `dani-dev4`
> **Últimos commits relevantes**: 
> - `28f48b3 feat(ai): add internal logictoop task runner`
> - `d14aac1 fix(ai): set approval timestamp explicitly`
> 
> ⚠️ **Documento rector — no recortar ni reemplazar sin aprobación explícita.**

---

## B. Reglas obligatorias para Antigravity/agentes

**LEER ANTES DE MODIFICAR CUALQUIER CÓDIGO DEL MÓDULO:**

1. **No reemplazar este documento por un resumen.** Este archivo es el manual definitivo y rector de la arquitectura de IA.
2. **No borrar secciones históricas útiles.** La historia de diseño es crítica para entender las decisiones de arquitectura.
3. **Proceso obligatorio antes de implementar:**
   - Inspección exhaustiva del estado actual.
   - Creación de un plan técnico (`implementation_plan.md`).
   - Aprobación explícita del usuario.
   - Implementación mínima viable (aislada).
   - Diff completo validado visualmente.
   - Verificación de tipos (`npm run typecheck`).
   - Verificación de esquema (`npx prisma validate`).
   - Commit aislado de la funcionalidad.
4. **Prohibiciones permanentes:**
   - NO ejecutar side-effects en la DB (modificar proyectos, leads, banners, emails) sin una fase aprobada explícitamente.
   - NO conectar Paperclip real a la red sin un diseño de seguridad aprobado.
   - NO crear webhooks sin firma, idempotencia y rate limiting implementados.
   - NO tocar Canvas ni Marketplace sin un plan técnico específico.
   - NO correr migraciones, `db push` o reset de base de datos sin aprobación explícita.
   - NO borrar feature flags legacy.
   - NO recortar este documento.
5. **Sanitización de datos**: Nunca incluir en la documentación correos electrónicos personales reales, contraseñas, tokens JWT, claves API u otros secretos.

---

## C. Resumen del módulo

LogicToop AI es el subsistema de orquestación de inteligencia artificial dentro de SevenToop. Permite registrar agentes IA, crear tareas que requieren aprobación humana, y gestionar el ciclo de vida de esas tareas a través de un panel de administración protegido.

En su estado actual (Fase 3A), el módulo opera como un **MVP human-in-the-loop**: registra tareas, permite su procesamiento local (mocking) a través de un `Internal Agent Runner`, y gestiona la aprobación/rechazo humano. Sigue siendo inerte en cuanto a efectos secundarios reales en la plataforma (no toca el negocio principal).

---

## D. Inspiración Paperclip y estrategia de fusión

- **Paperclip es referencia arquitectónica**: La visión multiagente y de orquestación está fuertemente inspirada en Paperclip.
- **SevenToop mantiene el control**: SevenToop *no* debe ser reemplazado. Sigue siendo el dueño absoluto de la Autenticación, `orgId`, Roles, Base de Datos, UI, capa de aprobaciones y auditoría.
- **LogicToop como Control Plane**: LogicToop será el panel oficial interno para administrar la orquestación.
- **Paperclip futuro (Sidecar)**: Paperclip real será conectado en el futuro como un *sidecar* opcional para offload de tareas de IA pesadas, pero no como un reemplazo del core.
- **Copiar código**: Cualquier adopción o copia directa de código desde un repositorio de Paperclip requiere revisión estricta de licencia, compatibilidad técnica y aprobación humana explícita.

---

## E. Arquitectura actual (Fase 3A)

```text
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
│                       │  - processAiTask... │       │
│                       └──────────┬──────────┘       │
│                                  │                  │
│                       ┌──────────▼──────────┐       │
│                       │ internal-ai-runner  │       │
│                       │ (Generación Mocks)  │       │
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

## F. Arquitectura objetivo

La visión a largo plazo para el ecosistema de IA en SevenToop:

- **LogicToop**: Panel oficial (UI) y capa rectora (Control Plane) de aprobaciones y auditoría human-in-the-loop.
- **Internal Agent Runner**: Motor local para tareas sencillas, pre-procesamiento, validaciones (QA_OPS) o "mocks" en entornos de desarrollo.
- **Paperclip**: Sidecar futuro y opcional. Un servicio externo seguro especializado en LLM routing, memory, y tool orchestration complejas.
- **AI Gateway**: Capa de seguridad, rate limiting y tenant isolation centralizada.

---

## G. Rutas existentes

| Ruta | Tipo | Descripción |
|---|---|---|
| `/dashboard/admin/logictoop/orchestrator` | Page (Server + Client) | Panel principal del AI Orchestrator |
| `/dashboard/admin/logictoop/orchestrator/approvals` | Page (Server + Client) | Bandeja de aprobaciones IA |

Ambas protegidas por: `requireAuth`, rol `ADMIN/SUPERADMIN`, y `FEATURE_FLAG_LOGICTOOP_AI_UI`.

---

## H. Archivos principales

**Backend:**
- `lib/actions/logictoop-ai.ts`: Server Actions (`getAiTasks`, `approveAiTask`, `rejectAiTask`, `processAiTaskLocally`).
- `lib/logictoop/ai-gateway.ts`: Validación de seguridad, tenant isolation, feature flags.
- `lib/logictoop/internal-ai-runner.ts`: Motor local (Mock) de ejecución de tareas para Fase 3A.

**Frontend:**
- `app/(dashboard)/dashboard/admin/logictoop/orchestrator/page.tsx`: Server component principal.
- `app/.../orchestrator/orchestrator-client.tsx`: Client component de navegación.
- `app/.../orchestrator/approvals/page.tsx`: Server component (data fetching).
- `app/.../orchestrator/approvals/_components/approvals-client.tsx`: Interfaz interactiva (tabla y acciones `Procesar`, `Aprobar`, `Rechazar`).

**Base de Datos:**
- `prisma/schema.prisma`: Modelos de datos.
- `prisma/migrations/.../migration.sql`: Migración de cimientos IA.

---

## I. Feature flags

Ubicados en `.env` o `.env.local`:

| Variable | Descripción |
|---|---|
| `FEATURE_FLAG_LOGICTOOP_AI_UI` | Habilita acceso a las páginas del dashboard. (Def: `true`) |
| `FEATURE_FLAG_LOGICTOOP_AI_CORE` | Habilita operaciones de escritura (Procesar/Aprobar/Rechazar). (Def: `true`) |
| `FEATURE_FLAG_PAPERCLIP` | Habilita integración general con orquestador Paperclip. (Def: `false`) |
| `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION` | Permite requests HTTP externos hacia la API de Paperclip. (Def: `false`) |

---

## J. Modelos Prisma detallados

Los modelos están diseñados con estricto Tenant Isolation (`orgId`).

### `LogicToopAiAgent`
Tabla: `logictoop_ai_agents`
- `id` (String, cuid): PK
- `orgId` (String): Tenant propietario
- `name` (String): Nombre legible
- `role` (String): Rol operativo (ej. QA_OPS)
- `systemPrompt` (String?): Instrucciones base
- `tools` (Json): Herramientas permitidas
- `status` (String): `ACTIVE` | `INACTIVE`

### `LogicToopAiTask`
Tabla: `logictoop_ai_tasks`
- `id` (String, cuid): PK
- `orgId` (String): Tenant propietario
- `agentId` (String): FK a LogicToopAiAgent
- `requestedById` (String): FK a User creador
- `executionId` (String?): FK a LogicToopExecution (Flows)
- `inputPayload` (Json): Contexto y parámetros enviados
- `outputResult` (Json?): Resultado devuelto por el Runner/IA
- `status` (String): Estado operativo
- `costTokens` (Int): Tokens consumidos
- `costEstimated` (Float): Costo en USD
- `paperclipRunId` (String?): ID externo (nulo si es local)
- `errorLogs` (Json?): Detalle de fallos

### `LogicToopAiApproval`
Tabla: `logictoop_ai_approvals`
- `id` (String, cuid): PK
- `taskId` (String): FK a LogicToopAiTask
- `approvedById` (String): FK a User autorizador
- `approvedAt` (DateTime?): Fecha de decisión
- `comments` (String?): Feedback del admin
- `actionTaken` (String): Enum string de la acción exacta ejecutada (ej. `APPROVED_NO_SIDE_EFFECTS`)

---

## K. Estados de LogicToopAiTask

Matriz de transiciones permitidas:

| Estado | Descripción | ¿Se puede Procesar? | ¿Se puede Aprobar/Rechazar? |
|---|---|:---:|:---:|
| `PENDING` | Tarea recién creada. | ✅ | ❌ |
| `NEEDS_APPROVAL` | Tarea ejecutada localmente o por IA, esperando veredicto. | ❌ | ✅ |
| `APPROVED` | Aprobada por un humano. Estado terminal de revisión. | ❌ | ❌ |
| `REJECTED` | Rechazada por un humano. Estado terminal de revisión. | ❌ | ❌ |
| `COMPLETED` | Ejecución final (side-effects) completada. (Futuro) | ❌ | ❌ |
| `FAILED` | Tarea falló internamente. | ❌ | ❌ |
| `CANCELLED` | Abortada manualmente antes de procesar. | ❌ | ❌ |

---

## L. Flujo actual completo

1. **Crear task**: (Vía script o DB local) Se crea registro con status `PENDING`.
2. **Procesar localmente**: Usuario presiona "Procesar". La tarea cambia a `NEEDS_APPROVAL` y genera un output mock.
3. **Revisar outputResult**: El administrador lee el resultado propuesto.
4. **Aprobar/Rechazar**: Admin decide la acción final, creando registro en `LogicToopAiApproval` y cerrando la tarea en `APPROVED` o `REJECTED`.
5. **Auditoría**: Queda traza permanente de quién, cuándo y por qué se decidió.

---

## M. Flujo de `processAiTaskLocally`

El método simula la ejecución segura sin salir de la infraestructura:
- Verifica `requireAuth` y roles (`ADMIN`/`SUPERADMIN`).
- Verifica `FEATURE_FLAG_LOGICTOOP_AI_CORE === "true"`.
- Verifica `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION !== "true"` (protección contra ejecución remota).
- Verifica tenant isolation (`orgId`).
- Valida que el status actual sea estrictamente `PENDING`.
- Ejecuta `internalAiRunner.processTaskInternal(taskId)`.
- El runner genera un JSON `outputResult` tipo mock (ej. para `QA_OPS`).
- Cambia status a `NEEDS_APPROVAL`.
- Retorna sin ejecutar ningún side-effect en otras tablas de la DB.
- Llama a `revalidatePath` para actualizar la UI.

---

## N. Flujo de `approveAiTask` completo

La aprobación es un evento puramente inerte y auditable:
- Verifica `requireAuth` y roles validos.
- Verifica `FEATURE_FLAG_LOGICTOOP_AI_CORE === "true"`.
- Busca la tarea filtrando por `orgId` (Tenant Isolation).
- Valida que el estado sea `NEEDS_APPROVAL` (o `PENDING` si la UI lo permitiera por override).
- Ejecuta una `$transaction` en Prisma:
  1. Actualiza tarea a status `APPROVED`.
  2. Crea registro en `LogicToopAiApproval`.
- Setea explícitamente `approvedAt: new Date()`.
- Setea `actionTaken: "APPROVED_NO_SIDE_EFFECTS"`.
- Llama a `revalidatePath`.
- **Cero Side-effects**: Finaliza sin tocar ninguna otra entidad comercial del sistema.

---

## O. Flujo de `rejectAiTask` completo

El rechazo sigue el mismo rigor de seguridad:
- Verifica `requireAuth`, roles y `CORE=true`.
- Búsqueda de tarea bajo Tenant Isolation.
- Valida estado pendiente/necesita aprobación.
- Ejecuta `$transaction` en Prisma:
  1. Actualiza tarea a status `REJECTED`.
  2. Crea registro `LogicToopAiApproval` capturando el comentario del administrador.
- Setea `approvedAt: new Date()`.
- Setea `actionTaken: "REJECTED"`.
- Llama a `revalidatePath`.
- **Cero Side-effects**.

---

## P. Qué significa `APPROVED_NO_SIDE_EFFECTS`

Es el string insertado en el log de aprobación. Garantiza histórica y contextualmente que, aunque un humano aprobó la tarea de IA, el sistema estaba en Fase de MVP (2E.1 / 3A) y estaba configurado deliberadamente para ignorar la ejecución real (no mutar leads, proyectos, enviar emails).

---

## Q. Qué significa `REJECTED`

Es el estado final de una decisión negativa humana. Implica que la propuesta del agente IA fue desestimada, bloqueando permanentemente su ejecución futura y almacenando el comentario justificativo del administrador para reentrenamiento o auditoría.

---

## R. Seguridad (Capa de blindaje)

- **`requireAuth()`**: Protección de rutas y Server Actions.
- **Roles `ADMIN` / `SUPERADMIN`**: Únicos autorizados a interactuar con el módulo.
- **`orgId` (Tenant Isolation)**: Filtro hardcodeado en las consultas Prisma de DB; un ADMIN nunca ve tareas ajenas a su organización.
- **Feature Flags**: Múltiples kill-switches (`UI`, `CORE`, `PAPERCLIP`).
- **No acceso directo Frontend → Paperclip**: El frontend no sabe de la existencia de Paperclip.
- **Sin vulnerabilidades RCE en el Runner**: El `internal-ai-runner.ts` NO utiliza `fetch` externo, NO usa `eval()`, NO invoca `child_process` ni comandos `shell`. Es puramente determinista (genera JSON estático basado en roles).
- **No Side-Effects**: Operatividad confinada exclusivamente a tablas del ecosistema IA (`tasks`, `approvals`).

---

## S. Cómo probar en local

1. No se requiere conexión a servicios reales ni credenciales externas.
2. Usar un usuario local (por `seed.ts`) genérico con rol `ADMIN` o `SUPERADMIN` perteneciente a `seventoop-main`.
3. Validar flags en `.env.local`: `FEATURE_FLAG_LOGICTOOP_AI_UI="true"`, `FEATURE_FLAG_LOGICTOOP_AI_CORE="true"`, `FEATURE_FLAG_PAPERCLIP="false"`, `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION="false"`.
4. Iniciar server: `npm run dev` en puerto `5000`.
5. Navegar a `/dashboard/admin/logictoop/orchestrator/approvals`.
6. Insertar tarea `PENDING` vía un script local Prisma (`ts-node` o `tsx`).
7. Probar flujo visual: Procesar -> Ver status cambiar -> Aprobar/Rechazar -> Confirmar registros.

---

## T. Datos dummy de validación

Historial de validaciones técnicas locales (seguras y sanitizadas):

- OrgId base: `seventoop-main`
- AgentId dummy (`QA_OPS`): `cmopxbg210000nqowfvwgc7i5`
- TaskId de validación Fase 2E.1: `cmopxcbyv0001xpangj8hbiu3`
- TaskId de validación Fase 3A: `cmor6wruh00014kmumhth49id`
- Rol que aprobó: `SUPERADMIN`
- Mode devuelto por runner: `internal_mock_agent`
- Status alcanzados: `PENDING` -> `NEEDS_APPROVAL` -> `APPROVED`.

*Nota: No se deben incluir identificadores que comprometan datos de usuarios reales.*

---

## U. Qué NO hace todavía

Para prevenir alucinaciones arquitectónicas, se detalla explícitamente lo que el módulo aún no implementa:

- **Paperclip Real**: Conexión HTTP apagada.
- **Webhooks**: Sin infraestructura de callbacks externos entrantes ni salientes.
- **Side-effects reales**: No se envían emails. No se modifican ni se crean Proyectos, Leads, Banners, Reservas ni Unidades al aprobar.
- **Nodos en Canvas**: LogicToop Flows no posee actualmente integración gráfica con IA.
- **Marketplace de Agentes**: No existe repositorio público real de agentes.
- **Post-ejecución**: El estado terminal actual es `APPROVED`/`REJECTED`, no se cuenta con worker post-aprobación (`COMPLETED`).

---

## V. Riesgos mitigados

- **Acceso no autorizado**: Cubierto por `requireAuth()` estricto.
- **Fuga de datos cruzados**: Cubierto por Tenant Isolation (`orgId`).
- **Modificación destructiva accidental**: Cubierta por la marca inerte `APPROVED_NO_SIDE_EFFECTS`.
- **Doble procesamiento**: Validado mediante el chequeo estricto del campo `status` antes de transacciones.
- **Conexión prematura no testeada a IA**: Bloqueada preventivamente por `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION=false`.
- **Inconsistencia de datos relacionales**: Prevenida usando transacciones de Prisma (`$transaction`).

---

## W. Pendientes UX

- **Filtros**: Por estado, agente o fechas.
- **Paginación**: Evitar sobrecarga en la vista `approvals-client.tsx`.
- **OutputResult Expandido**: Un modal o panel deslizable para inspeccionar detalladamente el JSON devuelto por el agente o el runner.
- **Historial de Task**: Ver auditorías y comentarios anidados cronológicamente.
- **Modales mejores**: Remplazar `window.prompt` y `window.confirm` por componentes accesibles Radix UI.
- **Limpieza de dummies**: Scripts de purga para tareas de desarrollo generadas localmente.

---

## X. Opciones Fase 3B

> ⚠️ NO IMPLEMENTAR NADA DE ESTO SIN PLAN APROBADO PREVIO.

- **Detalle UI de Resultados**: Expandir la UI para leer el `outputResult` cómodamente.
- **Agentes Internos Avanzados**: Desarrollar lógica real para el runner interno antes de requerir LLMs externos.
- **Nodos IA en LogicToop Flow**: Conectar el Canvas visual existente con la tabla `LogicToopAiTask`.
- **Paperclip Sidecar**: Comenzar el diseño de seguridad HTTP para conexión real a agentes remotos complejos.
- **Webhooks Entrantes**: Diseñar la especificación para recibir respuestas asíncronas de servicios LLM long-running.

---

## Y. Recomendación estratégica

1. **Corto plazo**: Consolidar la experiencia local del `Internal Agent Runner` y desarrollar componentes UI que permitan ver claramente el `outputResult` propuesto. Esto maximizará la eficacia del rol humano sin costos de API externa.
2. **Mediano plazo**: Integrar nodos básicos de creación de tasks IA dentro del Canvas LogicToop Flow.
3. **Largo plazo**: Diferir la conexión con **Paperclip real** hasta tener un caso de uso comercial irrefutable y haber diseñado por completo los esquemas de rate limit, firma de payloads, e idempotencia para los endpoints externos.

---

## Z. Historial de commits

```text
28f48b3 feat(ai): add internal logictoop task runner
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
