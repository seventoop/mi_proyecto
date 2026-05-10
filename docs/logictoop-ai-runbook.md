# LogicToop AI — Runbook Operativo

> **Rama estable**: `dani-dev3`  
> **Último commit estable**: `69aa9d3 feat(ai): add safe one-step flow resume`  
> **Estado**: LogicToop AI Production-safe MVP / Safe Flow Resume Control Plane  
> **Fecha de actualización**: 2026-05-08  
> **Documento complementario**: `docs/logictoop-ai.md` (manual rector — no recortar ni reemplazar)

---

## 1. Commits relevantes recientes

```text
69aa9d3 feat(ai): add safe one-step flow resume
8a33745 feat(ai): add controlled manual flow resume
573e160 feat(ai): add safe resume preview planner
761eba8 feat(ai): add paused flow resume control center
46f3310 chore(ai): production hygiene and operational runbook
289e52a feat(ai): sync flow state after ai decision
2836d2a feat(ai): bridge logictoop flows to ai approvals
da63312 fix(ai): harden dry-run idempotency
4383d2a fix(ai): prevent duplicate dry-run triggers
09274dd feat(ai): add dry-run worker simulation
cb891f3 feat(ai): add enterprise task events
```

---

## 2. Qué está implementado

### 2.1 Flujos operativos

| # | Flujo | Estado |
|---|---|---|
| A | Creación de task IA (manual/gateway) | ✅ Operativo |
| B | Procesamiento local (mock runner) | ✅ Operativo |
| C | Aprobación/Rechazo humano | ✅ Operativo |
| D | Enterprise Events (auditoría) | ✅ Operativo |
| E | Dry-run worker (SUPERADMIN) | ✅ Operativo |
| F | Flow → AI Bridge (nodo AI_APPROVAL_TASK) | ✅ Operativo |
| G | Flow decision sync (approve/reject → flow) | ✅ Operativo |
| H | Paused flows control center | ✅ Operativo |
| I | Resume preview planner | ✅ Operativo |
| J | Controlled manual resume | ✅ Operativo |
| K | Safe one-step resume | ✅ Operativo |

---

## 3. Estados del sistema

### 3.1 Estados de LogicToopAiTask

| Estado | Significado | ¿Procesable? | ¿Aprobable/Rechazable? |
|---|---|---|---|
| `PENDING` | Tarea recién creada, esperando procesamiento | ✅ (Procesar) | ❌ |
| `NEEDS_APPROVAL` | Procesada por runner, esperando decisión humana | ❌ | ✅ |
| `APPROVED` | Aprobada por humano. Sin side-effects | ❌ | ❌ |
| `REJECTED` | Rechazada por humano. Terminal | ❌ | ❌ |

### 3.2 Estados de LogicToopExecution

| Estado | Significado |
|---|---|
| `WAITING_FOR_APPROVAL` | El flow encontró un nodo AI_APPROVAL_TASK y se pausó. |
| `AI_APPROVED_WAITING_RESUME` | La tarea IA fue aprobada. Listo para reanudación controlada. |
| `AI_REJECTED` | La tarea IA fue rechazada. Flow detenido permanentemente. |
| `MANUALLY_RESUMED_SAFE_REVIEW` | Marcado como "reanudado seguro", en inspección de nodos inofensivos. |
| `PAUSED_AFTER_SAFE_STEP` | Avanzó un único paso seguro y se volvió a pausar inmediatamente. |
| `COMPLETED_SAFE` | Flujo finalizado de forma segura al no quedar más nodos. |

---

## 4. Clasificación de nodos

El sistema utiliza `NODE_SAFETY_MAP` para dictar qué nodos pueden ejecutarse manualmente:

- **`SAFE_EXECUTABLE_NO_SIDE_EFFECT`**: Seguro para avanzar un paso ejecutando su lógica sin riesgos (ej. evaluar un payload).
- **`SAFE_REVIEW_ONLY`**: Inofensivo, pero no debe re-ejecutarse activamente en resume.
- **`UNSAFE_SIDE_EFFECT`**: Peligroso. Modifica negocio, envía mensajes o hace peticiones web. Bloqueado terminantemente.
- **`UNKNOWN`**: Nodo no mapeado. Por defecto se asume inseguro y se bloquea.
- **`NO_NEXT_NODE`**: Fin del flujo.

### 4.1 Nodos seguros validados
- `CONDITION`: Validado funcionalmente.
- `WAIT`, `DELAY`, `INTERNAL_NOTE`: Clasificados como seguros según mapa (pendientes de test funcional de cobertura).

### 4.2 Nodos bloqueados y prohibidos en esta fase
- `SEND_EMAIL`
- `WEBHOOK`
- `ASSIGN_LEAD`
- `CREATE_LEAD`
- `UPDATE_LEAD`
- `PROJECT_UPDATE`
- `BANNER_UPDATE`
- Cualquier otro no especificado (`UNKNOWN`)

---

## 5. Validación real completada (Fase 8B)

- Camino **UNSAFE** (con `SEND_EMAIL`): Probado y bloqueado correctamente por el Control Center.
- Camino **SAFE** (con `CONDITION`): 
  - Ejecutado exitosamente un único paso.
  - Eventos `FLOW_SAFE_STEP_STARTED` y `FLOW_SAFE_STEP_COMPLETED` registrados.
  - El índice (`currentStepIndex`) avanzó de manera unitaria y controlada.
  - El estado de la tarea de IA (`task.status`) se mantuvo inalterado en `APPROVED`.
  - Cero *side-effects* ejecutados.

---

## 6. Qué NO hace todavía

Para prevenir comportamientos fuera de diseño, se deja explícito lo que NO se ejecuta:

- **No ejecuta el dispatcher completo.**
- **No ejecuta cadenas de nodos.** Avanza estrictamente paso a paso por acción manual de SUPERADMIN.
- **No ejecuta nodos comerciales.**
- **No tiene Paperclip real activo.**
- **No lanza webhooks.**
- **No envía correos.**
- **No realiza modificaciones** en leads, proyectos, banners, reservas o unidades.

---

## 7. Reglas de producción

1. **Cualquier nuevo nodo debe agregarse a `NODE_SAFETY_MAP`.**
2. Si un nodo no figura explícitamente en el mapa de seguridad, el sistema debe tratarlo como `UNKNOWN` y bloquearlo al instante.
3. **No habilitar `executeFlow` automático** sin una fase exhaustiva de diseño y aprobación posterior.
4. **No habilitar nodos comerciales** para reanudación a menos que posean idempotencia estricta, registro absoluto de auditoría, y plan de rollback probado.

---

## 8. Eventos enterprise relevantes

Los eventos se registran en `logictoop_ai_events`.

| Evento | Fuente |
|---|---|
| `TASK_CREATED` / `TASK_PROCESSED_LOCALLY` | GATEWAY / INTERNAL_RUNNER |
| `TASK_NEEDS_APPROVAL` / `TASK_APPROVED` / `TASK_REJECTED` | SYSTEM / SERVER_ACTION |
| `WORKER_DRY_RUN_STARTED` / `WORKER_DRY_RUN_COMPLETED` | SYSTEM |
| `FLOW_AI_TASK_CREATED` / `FLOW_WAITING_FOR_AI_APPROVAL` | SYSTEM |
| `FLOW_AI_TASK_APPROVED` / `FLOW_AI_TASK_REJECTED` | SYSTEM |
| `FLOW_WAITING_MANUAL_RESUME` | SYSTEM |
| `FLOW_RESUME_PREVIEW_REQUESTED` / `FLOW_RESUME_PREVIEW_COMPLETED` | SERVER_ACTION |
| `FLOW_MANUAL_RESUME_STARTED` / `COMPLETED` / `BLOCKED` | SERVER_ACTION |
| `FLOW_SAFE_STEP_STARTED` / `COMPLETED` / `BLOCKED` / `FAILED` | SERVER_ACTION |

---

## 9. Próximas fases recomendadas

- **Fase 9A**: UI final polishing / badges visuales / adición de filtros por resume status en el dashboard.
- **Fase 9B**: Safe-node test coverage (cobertura total de validación funcional) para `WAIT`, `DELAY` e `INTERNAL_NOTE`.
- **Fase 10A**: Paperclip sidecar design only (solo arquitectura de seguridad, firmas HMAC, spec HTTP, sin implementación real en código base).
- **Fase 10B**: Controlled commercial side-effects (apertura milimétrica de nodos comerciales específicos, solo con roles dedicados y *guards* de rollback).

## 10. Paperclip Sidecar Stub

En preparación para la integración futura con Paperclip, se han implementado las bases técnicas en un estado 100% desconectado y seguro:

- **Stub client existe:** `lib/logictoop/paperclip-sidecar-client.ts`
- **Security utility HMAC/idempotency existe:** `lib/logictoop/paperclip-security.ts`
- **Webhook skeleton disabled:** `app/api/logictoop/paperclip/webhook/route.ts`

**Reglas actuales:**
- Paperclip real sigue desconectado.
- No se hacen llamadas externas de ningún tipo (`fetch` o `axios`).
- Para activar Paperclip real hace falta una fase futura con aprobación explícita.
- **NO habilitar** `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION` en producción sin HMAC + webhook verification + staging.

### Paperclip Sandbox y Contract Checks

Se ha habilitado la posibilidad de simular el contrato técnico de Paperclip sin red:
- **SANDBOX mode:** Simula respuestas ricas sin hacer red real. Requiere `FEATURE_FLAG_PAPERCLIP_SANDBOX=true`.
- **Contract Tests:** Validan la integración localmente. Ejecutar con: `npx tsx scripts/logictoop-paperclip-contract.ts`
- **Smoke Script:** Ejecutar con: `npx tsx scripts/logictoop-ai-smoke.ts`
- **Webhook Dry-Run:** Solo valida headers/firma y retorna status simulado. No muta DB ni eventos. Requiere header `x-paperclip-dry-run: true`.
- La conexión `REAL` sigue estrictamente bloqueada.

### Paperclip Staging Readiness

En preparación para un posible pase a staging real:
- **Readiness gate:** Se validan todos los flags de seguridad antes de permitir modo real.
- **Dry-run webhook hardened:** Validación robusta de firmas, body size y headers, sin afectar DB.
- **Event bridge preview:** Mapeo de eventos (ej: `PAPERCLIP_RUN_ACCEPTED`) sin generar Side-Effects reales.
- No hay mutaciones en base de datos.
- No hay mutaciones en eventos.
- La conexión `REAL` sigue estrictamente bloqueada.
- **Obligatorio:** Ejecutar el contract script antes de cualquier despliegue a staging.

---

## 11. Feature Flags de control

| Variable | Valor actual | Efecto si se desactiva |
|---|---|---|
| `FEATURE_FLAG_LOGICTOOP_AI_UI` | `true` | Oculta páginas del orchestrator IA |
| `FEATURE_FLAG_LOGICTOOP_AI_CORE` | `true` | Bloquea procesar/aprobar/rechazar (modo lectura) |
| `FEATURE_FLAG_PAPERCLIP` | `false` | Control general de Paperclip |
| `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION` | `false` | Bloquea cualquier HTTP externo hacia Paperclip |

---

## 11. Smoke test operativo

Para validar el estado de salud del sistema LogicToop AI sin modificar datos:

```bash
npx tsx scripts/logictoop-ai-smoke.ts
```

El script verifica:
- Feature flags esperados (`AI_UI`, `AI_CORE`, `PAPERCLIP`, `REAL_CONNECTION`).
- Conectividad Prisma.
- Existencia de tablas/modelos principales.
- Conteos por estado de ejecución IA.
- Que Paperclip real esté desconectado.
- Consistencia básica de datos (orgId, paperclipRunId, statuses).

Resultados posibles:
- `✅` Check OK
- `⚠️` Warning (no bloqueante)
- `❌` Blocker (requiere acción)

> **Nota**: El script es read-only. No modifica, crea ni borra registros.

