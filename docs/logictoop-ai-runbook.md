# LogicToop AI — Runbook Operativo

> **Rama estable**: `dani-dev3`  
> **Último commit estable**: `289e52a feat(ai): sync flow state after ai decision`  
> **Estado**: Flow ↔ AI Human-in-the-loop con Enterprise Events y Dry-run  
> **Fecha de creación**: 2026-05-07  
> **Documento complementario**: `docs/logictoop-ai.md` (manual rector — no recortar ni reemplazar)

---

## 1. Commits relevantes recientes

```text
289e52a feat(ai): sync flow state after ai decision
2836d2a feat(ai): bridge logictoop flows to ai approvals
da63312 fix(ai): harden dry-run idempotency
4383d2a fix(ai): prevent duplicate dry-run triggers
09274dd feat(ai): add dry-run worker simulation
cb891f3 feat(ai): add enterprise task events
f620a02 feat(ai): add approvals status filters
890dc4c fix(ai): polish approvals display
018e825 feat(ai): add logictoop task detail viewer
```

---

## 2. Qué está implementado

### 2.1 Flujos operativos

| # | Flujo | Archivo principal | Estado |
|---|---|---|---|
| A | Creación de task IA (manual/gateway) | `lib/logictoop/ai-gateway.ts` | ✅ Operativo |
| B | Procesamiento local (mock runner) | `lib/logictoop/internal-ai-runner.ts` | ✅ Operativo |
| C | Aprobación/Rechazo humano | `lib/actions/logictoop-ai.ts` | ✅ Operativo |
| D | Enterprise Events (auditoría) | `lib/logictoop/ai-events.ts` | ✅ Operativo |
| E | Dry-run worker (SUPERADMIN) | `lib/logictoop/ai-worker.ts` | ✅ Operativo |
| F | Flow → AI Bridge (nodo AI_APPROVAL_TASK) | `lib/logictoop/flow-ai-bridge.ts` | ✅ Operativo |
| G | Flow decision sync (approve/reject → flow) | `lib/actions/logictoop-ai.ts` | ✅ Operativo |

### 2.2 Archivos del módulo

**Backend:**
- `lib/actions/logictoop-ai.ts` — Server Actions (getAiTasks, approveAiTask, rejectAiTask, processAiTaskLocally, getAiTaskDetail)
- `lib/actions/logictoop-ai-worker.ts` — Server Action para dry-run manual
- `lib/logictoop/ai-gateway.ts` — Gateway de validación y creación de tasks
- `lib/logictoop/internal-ai-runner.ts` — Motor de ejecución local (mock)
- `lib/logictoop/ai-events.ts` — Sistema de eventos enterprise
- `lib/logictoop/ai-worker.ts` — Worker de dry-run post-aprobación
- `lib/logictoop/flow-ai-bridge.ts` — Bridge para crear tasks desde flows
- `lib/logictoop/dispatcher.ts` — Dispatcher con soporte para AI_APPROVAL_TASK
- `lib/logictoop/nodes/definitions/ai.ts` — Definición del nodo AI_APPROVAL_TASK
- `lib/logictoop/nodes/index.ts` — Registro del nodo en nodeRegistry

**Frontend:**
- `app/(dashboard)/dashboard/admin/logictoop/orchestrator/page.tsx` — Página principal
- `app/.../orchestrator/orchestrator-client.tsx` — Client component del orchestrator
- `app/.../orchestrator/approvals/page.tsx` — Página de aprobaciones
- `app/.../approvals/_components/approvals-client.tsx` — Tabla interactiva
- `app/.../approvals/_components/task-detail-dialog.tsx` — Detalle con payloads, eventos y dry-run

**DB:**
- `prisma/schema.prisma` — Modelos LogicToopAiAgent, LogicToopAiTask, LogicToopAiApproval, LogicToopAiEvent
- `prisma/migrations/20260503110000_add_logictoop_ai_foundations/` — Migración base
- `prisma/migrations/20260504221906_add_logictoop_ai_events/` — Migración de eventos

---

## 3. Estados del sistema

### 3.1 Estados de LogicToopAiTask (tabla logictoop_ai_tasks)

| Estado | Significado | ¿Procesable? | ¿Aprobable/Rechazable? |
|---|---|---|---|
| `PENDING` | Tarea recién creada, esperando procesamiento | ✅ (Procesar) | ❌ |
| `NEEDS_APPROVAL` | Procesada por runner, esperando decisión humana | ❌ | ✅ |
| `APPROVED` | Aprobada por humano. Sin side-effects en esta fase | ❌ | ❌ |
| `REJECTED` | Rechazada por humano. Terminal | ❌ | ❌ |

### 3.2 Estados de LogicToopExecution relacionados con IA (tabla logic_toop_executions)

| Estado | Significado | Quién lo setea | Auto-resume |
|---|---|---|---|
| `WAITING_FOR_APPROVAL` | El flow encontró un nodo AI_APPROVAL_TASK y se pausó | `dispatcher.ts` al ejecutar el nodo | **NO** |
| `AI_APPROVED_WAITING_RESUME` | La tarea IA fue aprobada. El flow está listo para reanudación manual futura | `approveAiTask` en `logictoop-ai.ts` | **NO** |
| `AI_REJECTED` | La tarea IA fue rechazada. El flow está detenido | `rejectAiTask` en `logictoop-ai.ts` | **NO** |

> ⚠️ **CRÍTICO**: Estos estados son strings flexibles en la DB (no enums de Prisma). La integridad depende exclusivamente del código.

### 3.3 Significado operativo

- **`WAITING_FOR_APPROVAL`**: El dispatcher ejecutó el nodo `AI_APPROVAL_TASK`, creó una tarea IA vía el bridge, y se detuvo. El `currentStepIndex` apunta al siguiente nodo a ejecutar. El flow no avanzará hasta que se implemente un mecanismo de resume futuro.

- **`AI_APPROVED_WAITING_RESUME`**: Un administrador aprobó la tarea IA vinculada. El flow ha sido marcado como "listo para continuar" pero **NO se reanuda automáticamente**. No se llama al dispatcher. No se ejecutan nodos siguientes. Es un estado de espera seguro.

- **`AI_REJECTED`**: Un administrador rechazó la tarea IA. El flow queda permanentemente detenido en este punto. No hay retroceso automático.

---

## 4. Eventos enterprise relevantes

Los eventos se registran en la tabla `logictoop_ai_events` y son visibles en la pestaña "Eventos" del detalle de cada tarea.

| Evento | Fuente | Cuándo se registra |
|---|---|---|
| `TASK_CREATED` | GATEWAY | Al crear una tarea vía ai-gateway |
| `TASK_PROCESSED_LOCALLY` | INTERNAL_RUNNER | Al procesar con el runner mock |
| `TASK_NEEDS_APPROVAL` | SYSTEM | Al cambiar status a NEEDS_APPROVAL |
| `TASK_APPROVED` | SERVER_ACTION | Al aprobar la tarea |
| `TASK_REJECTED` | SERVER_ACTION | Al rechazar la tarea |
| `WORKER_DRY_RUN_STARTED` | SYSTEM | Al iniciar dry-run (SUPERADMIN) |
| `WORKER_DRY_RUN_COMPLETED` | SYSTEM | Al completar dry-run exitosamente |
| `WORKER_DRY_RUN_FAILED` | SYSTEM | Si falla el dry-run |
| `FLOW_AI_TASK_CREATED` | SYSTEM | Al crear tarea desde un flow (bridge) |
| `FLOW_WAITING_FOR_AI_APPROVAL` | SYSTEM | Al pausar flow esperando aprobación |
| `FLOW_AI_TASK_APPROVED` | SYSTEM | Al aprobar tarea vinculada a flow |
| `FLOW_AI_TASK_REJECTED` | SYSTEM | Al rechazar tarea vinculada a flow |
| `FLOW_WAITING_MANUAL_RESUME` | SYSTEM | Al marcar flow como listo para resume manual |

---

## 5. Qué NO hace todavía

| Funcionalidad | Estado | Razón |
|---|---|---|
| **Resume real de flows** | ❌ No implementado | Requiere Fase 6B/6C con diseño de seguridad |
| **Paperclip real** | ❌ Desconectado | `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION=false` |
| **Webhooks** | ❌ No existen | Sin infraestructura de callbacks |
| **Side-effects comerciales** | ❌ Cero | No toca proyectos, leads, banners, emails, reservas, unidades |
| **Worker automático** | ❌ Solo manual | Dry-run requiere click de SUPERADMIN |
| **Nodos IA en Canvas** | ❌ No integrado | Solo existe la definición del nodo |
| **Marketplace de Agentes** | ❌ No existe | Fuera de scope |
| **Post-ejecución real** | ❌ No implementada | El estado terminal es APPROVED/REJECTED |

---

## 6. Procedimiento de validación manual

### 6.1 Requisitos previos

1. Servidor local corriendo: `npm run dev` (puerto 5000)
2. Feature flags en `.env.local`:
   ```
   FEATURE_FLAG_LOGICTOOP_AI_UI="true"
   FEATURE_FLAG_LOGICTOOP_AI_CORE="true"
   FEATURE_FLAG_PAPERCLIP="false"
   FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION="false"
   ```
3. Usuario con rol `ADMIN` o `SUPERADMIN` en la org `seventoop-main`

### 6.2 Flujo de validación

1. **Navegar** a `/dashboard/admin/logictoop/orchestrator`
2. **Verificar** que el enlace "Bandeja de Aprobaciones IA" está visible
3. **Abrir** la bandeja de aprobaciones: `/dashboard/admin/logictoop/orchestrator/approvals`
4. **Crear** una tarea PENDING (vía script local o seed)
5. **Procesar** la tarea con el botón "Procesar" → debe cambiar a `NEEDS_APPROVAL`
6. **Abrir detalle** con el botón "ojo" → verificar payloads, input/output
7. **Aprobar** la tarea → debe cambiar a `APPROVED`
8. **Verificar** en pestaña "Eventos" los registros de auditoría
9. **Si SUPERADMIN**: verificar botón de dry-run disponible → ejecutar → verificar idempotencia
10. **Verificar** filtros por estado (ALL, PENDING, NEEDS_APPROVAL, APPROVED, REJECTED)

### 6.3 Validación de flow bridge

1. Crear un flow con nodo `AI_APPROVAL_TASK` configurado con agentId válido
2. Disparar la ejecución del flow
3. Verificar que la ejecución queda en `WAITING_FOR_APPROVAL`
4. Verificar que la tarea IA aparece en la bandeja con `executionId`
5. Aprobar la tarea → verificar que la ejecución pasa a `AI_APPROVED_WAITING_RESUME`
6. Verificar eventos: `FLOW_AI_TASK_APPROVED` + `FLOW_WAITING_MANUAL_RESUME`

### 6.4 Auditoría de events

1. Abrir detalle de cualquier tarea
2. Pestaña "Eventos" → verificar cronología completa
3. Verificar que no hay emails, passwords ni tokens en la metadata
4. Verificar que `actorUserId` apunta a usuarios reales (no `"SYSTEM"`)

---

## 7. Próximas fases recomendadas

### Fase 6B — UI de Flows Pausados

- Crear vista de ejecuciones en estado `AI_APPROVED_WAITING_RESUME`
- Mostrar: flow name, fecha de pausa, tarea vinculada, currentStepIndex
- Solo lectura. Sin acciones.
- Accesible desde el orchestrator.

### Fase 6C — Manual Resume Dry-Run

- Crear Server Action `resumeFlowDryRun` (SUPERADMIN only)
- Simular la reanudación sin ejecutar nodos reales
- Registrar eventos `FLOW_RESUME_DRY_RUN_STARTED` / `COMPLETED`
- Validar que `currentStepIndex` se recupera correctamente
- No ejecutar side-effects ni nodos de negocio

### Fase 6D — Resume Real Controlado

- Ejecutar el siguiente nodo del flow tras aprobación
- Solo nodos seguros (NOTIFY_INTERNAL, ADD_AUDIT_LOG)
- Bloquear nodos peligrosos (SEND_EMAIL, ASSIGN_LEAD, etc.)
- Guard de nodos permitidos configurable

---

## 8. Riesgos y prohibiciones

### 8.1 Riesgos conocidos

| Riesgo | Severidad | Mitigación actual |
|---|---|---|
| Estados de execution como strings flexibles | Baja | Solo escritos desde código controlado |
| `currentStepIndex` perdido en resume futuro | Media | Guardado correctamente, pero resume no implementado |
| `"SYSTEM"` como userId en audit log legacy | Media | Solo en dispatcher legacy, no en módulo AI |
| Duplicate approve/reject | Baja | Guards con `findFirst` antes de actuar |

### 8.2 Prohibiciones vigentes

- **NO** ejecutar side-effects comerciales sin fase aprobada
- **NO** conectar Paperclip real sin diseño de seguridad
- **NO** crear webhooks sin firma, idempotencia y rate limiting
- **NO** tocar Canvas ni Marketplace
- **NO** correr migraciones o db push sin aprobación explícita
- **NO** implementar resume automático de flows
- **NO** ejecutar nodos de negocio post-aprobación
- **NO** borrar feature flags legacy
- **NO** recortar ni reemplazar el manual rector (`docs/logictoop-ai.md`)

---

## 9. Rollback conceptual

Si se necesita revertir a un estado anterior:

1. **Revertir código**: `git revert` de los commits relevantes
2. **No se requiere rollback de DB**: Los modelos AI son independientes y no afectan tablas comerciales
3. **Feature flags**: Apagar `FEATURE_FLAG_LOGICTOOP_AI_CORE="false"` deshabilita todas las operaciones de escritura
4. **Feature flags UI**: Apagar `FEATURE_FLAG_LOGICTOOP_AI_UI="false"` oculta completamente las páginas del módulo
5. **Las tablas AI pueden coexistir vacías** sin afectar el resto del sistema

---

## 10. Feature Flags de control

| Variable | Valor actual | Efecto si se desactiva |
|---|---|---|
| `FEATURE_FLAG_LOGICTOOP_AI_UI` | `true` | Oculta páginas del orchestrator IA |
| `FEATURE_FLAG_LOGICTOOP_AI_CORE` | `true` | Bloquea procesar/aprobar/rechazar (modo lectura) |
| `FEATURE_FLAG_PAPERCLIP` | `false` | Control general de Paperclip |
| `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION` | `false` | Bloquea cualquier HTTP externo hacia Paperclip |
