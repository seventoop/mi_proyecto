# LogicToop AI ↔ Paperclip Sidecar — Security Design Spec

> **Estado**: Stub implemented, real runtime disabled. (Fases 10A-10D completadas)  
> **Rama**: `dani-dev3`  
> **Fecha**: 2026-05-10  
> **Autor**: Daniel (Arquitectura), Antigravity (Documentación)  
> **Documento complementario**: `docs/logictoop-ai.md` (manual rector — no recortar ni reemplazar)

---

## 1. Principios Fundamentales

1. **SevenToop es el dueño absoluto** de Autenticación, `orgId`, Roles, UI, flujo de aprobaciones y auditoría. Paperclip nunca reemplaza a SevenToop.
2. **Paperclip nunca decide side-effects finales** sin aprobación humana previa registrada en `LogicToopAiApproval`.
3. **Paperclip opera como executor/sidecar opcional**: Recibe tareas delegadas, las procesa, y devuelve resultados para revisión humana.
4. **Todas las acciones deben ser auditables**: Cada interacción con Paperclip genera eventos en `LogicToopAiEvent`.
5. **Todo debe ser idempotente**: Reintentos no deben generar duplicación de efectos.
6. **Fail-safe por defecto**: Si Paperclip falla, el sistema vuelve al Internal Runner sin pérdida de datos.

---

## 2. Arquitectura Propuesta

```text
┌─────────────────────────────────────────────────────────────┐
│                    SevenToop (Control Plane)                 │
│                                                             │
│  ┌───────────────┐    ┌──────────────────────┐              │
│  │  AI Gateway   │───▶│  LogicToopAiTask     │              │
│  │  (validación) │    │  - status: PENDING   │              │
│  └───────┬───────┘    │  - paperclipRunId    │              │
│          │            └──────────┬───────────┘              │
│          │                       │                          │
│          ▼                       ▼                          │
│  ┌───────────────┐    ┌──────────────────────┐              │
│  │ Internal      │    │  LogicToopAiEvent    │              │
│  │ Runner (Mock) │    │  (Auditoría)         │              │
│  └───────────────┘    └──────────────────────┘              │
│          │                       │                          │
│          ▼                       ▼                          │
│  ┌───────────────┐    ┌──────────────────────┐              │
│  │  Approval     │───▶│  LogicToopAiApproval │              │
│  │  Workflow     │    │  (Decisión humana)   │              │
│  └───────────────┘    └──────────────────────┘              │
│                                                             │
├─────────────────────────── BOUNDARY ────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────┐                │
│  │         Paperclip Sidecar API           │                │
│  │  (Servicio externo opcional)            │                │
│  │                                         │                │
│  │  POST /tasks/execute                    │                │
│  │  POST /tasks/cancel                     │                │
│  │  GET  /tasks/:id/status                 │                │
│  │                                         │                │
│  │  Webhook callback (firmado con HMAC):   │                │
│  │  POST /api/paperclip/callback           │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
│  ⚠️ FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION                  │
│     debe ser "true" para habilitar cualquier HTTP externo.  │
│     Default: "false" (bloqueado).                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Seguridad Obligatoria

### 3.1 Autenticación y Autorización

| Mecanismo | Descripción | Obligatorio |
|---|---|:---:|
| **HMAC Request Signing** | Cada request hacia Paperclip debe firmarse con HMAC-SHA256 usando un secreto compartido por organización. | ✅ |
| **idempotencyKey** | Cada request debe incluir un UUID único para evitar duplicación en reintentos. | ✅ |
| **Tenant Isolation** | `orgId` es obligatorio en cada request. Paperclip no debe procesar tareas cross-org. | ✅ |
| **actorUserId** | El usuario que originó la tarea debe propagarse. Si es automático, usar el admin fallback de la org. | ✅ |
| **taskId** | Cada request referencia un `LogicToopAiTask.id` existente y validado. | ✅ |

### 3.2 Resiliencia

| Mecanismo | Descripción | Obligatorio |
|---|---|:---:|
| **Timeout** | Requests hacia Paperclip: máximo 30 segundos. Si excede, marcar como `PAPERCLIP_FAILED`. | ✅ |
| **Retry Policy** | Máximo 3 reintentos con backoff exponencial (5s, 15s, 45s). Cada reintento usa el mismo idempotencyKey. | ✅ |
| **Circuit Breaker** | Tras 5 fallos consecutivos por org, pausar llamadas por 5 minutos. | ✅ |
| **Rate Limits** | Máximo 10 requests/minuto por organización. | ✅ |

### 3.3 Datos y Payloads

| Mecanismo | Descripción | Obligatorio |
|---|---|:---:|
| **Payload Size Limits** | Máximo 50KB por request (consistente con AI Gateway actual). | ✅ |
| **Metadata Sanitization** | No enviar emails personales, contraseñas, tokens JWT ni claves API en payloads hacia Paperclip. | ✅ |
| **No Secrets in Events** | Nunca guardar secretos, tokens de Paperclip ni payloads crudos en `LogicToopAiEvent.metadata`. | ✅ |
| **Action Allowlist** | Paperclip solo puede ejecutar acciones pre-aprobadas en un registro estático de tipos permitidos. | ✅ |

### 3.4 Callbacks (Webhooks)

| Mecanismo | Descripción | Obligatorio |
|---|---|:---:|
| **Webhook Signature Verification** | Callbacks de Paperclip deben incluir firma HMAC-SHA256 en header `X-Paperclip-Signature`. | ✅ |
| **Replay Protection** | Cada callback incluye `timestamp` y `nonce`. Rechazar si timestamp > 5 minutos. | ✅ |
| **Cross-Org Validation** | Verificar que el `orgId` del callback coincide con el `orgId` de la task referenciada. | ✅ |
| **Audit Logging** | Cada callback recibido (válido o rechazado) genera un `LogicToopAiEvent`. | ✅ |

---

## 4. Estados Propuestos (Solo Diseño)

Estos estados se agregarían a `LogicToopAiTask.status` cuando Paperclip real se active:

| Estado | Descripción | Implementado |
|---|---|:---:|
| `PAPERCLIP_QUEUED` | Tarea encolada para envío a Paperclip. | ❌ |
| `PAPERCLIP_RUNNING` | Paperclip confirmó recepción y está procesando. | ❌ |
| `PAPERCLIP_NEEDS_APPROVAL` | Paperclip devolvió resultado. Esperando revisión humana. | ❌ |
| `PAPERCLIP_FAILED` | Paperclip falló (timeout, error, circuit breaker). | ❌ |
| `PAPERCLIP_COMPLETED_NO_SIDE_EFFECTS` | Resultado de Paperclip aprobado sin ejecutar side-effects comerciales. | ❌ |

> ⚠️ **Estos estados son solo diseño.** No agregar al schema ni al código sin un plan aprobado.

---

## 5. Reglas de Operación

1. **No habilitar Paperclip real** si `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION !== "true"`.
2. **No ejecutar side-effects comerciales** directamente desde resultados de Paperclip.
3. **No ejecutar nodos comerciales** sin un allowlist explícito y aprobado.
4. **No aceptar callbacks** sin firma HMAC válida.
5. **No procesar callbacks cross-org**: Si `orgId` del callback ≠ `orgId` de la task, rechazar y loggear.
6. **No guardar payloads sensibles** en eventos de auditoría.
7. **No confiar en Paperclip** como fuente de verdad: SevenToop siempre valida estado internamente.

---

## 6. Plan de Rollback

Si se detecta un problema con Paperclip en cualquier fase:

1. **Apagar** `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION` → vuelve a `"false"`.
2. **Mantener Internal Runner** como fallback funcional (ya operativo).
3. **Ignorar callbacks** no firmados automáticamente.
4. **No borrar** tasks ni events generados durante la integración.
5. **Revertir** tareas en estado `PAPERCLIP_*` a `PENDING` si es necesario (con evento de auditoría).

---

## 7. Fases Futuras Recomendadas

| Fase | Objetivo | Requiere DB | Requiere HTTP |
|---|---|:---:|:---:|
| **10B** | Stub client: clase TypeScript que simula llamadas sin red real | ❌ | ❌ |
| **10C** | HMAC signing library: utilidad para firmar y verificar requests | ❌ | ❌ |
| **10D** | Webhook verification endpoint: ruta `/api/paperclip/callback` deshabilitada por default | ✅ (ruta) | ❌ |
| **10E** | Paperclip sandbox mode: conexión real a un entorno de prueba aislado | ❌ | ✅ (sandbox) |
| **11A** | Controlled real connection: conexión a Paperclip productivo en staging only | ❌ | ✅ (staging) |

### Detalle por fase:

#### Fase 10B — Stub Client (✅ Completada)
- **Objetivo**: Crear una clase `PaperclipClient` que simule las llamadas HTTP sin salir de la red.
- **Archivos creados**: `lib/logictoop/paperclip-sidecar-client.ts`
- **Estado**: Implementado.

#### Fase 10C — HMAC Signing Library (✅ Completada)
- **Objetivo**: Utilidad compartida para firmar requests salientes y verificar callbacks entrantes.
- **Archivos creados**: `lib/logictoop/paperclip-security.ts`
- **Estado**: Implementado.

#### Fase 10D — Webhook Verification Endpoint (✅ Completada)
- **Objetivo**: Crear ruta API que reciba callbacks de Paperclip.
- **Archivos creados**: `app/api/logictoop/paperclip/webhook/route.ts`
- **Estado**: Implementado (esqueleto), pero `Disabled by design`. Rechaza todas las peticiones con 403 o 501.

#### Fase 10E — Paperclip Sandbox Mode (✅ Completada)
- **Objetivo**: Primer contacto con entorno simulado.
- **Implementado**: Simulación local en `lib/logictoop/paperclip-sidecar-client.ts`. No hace red real.

#### Fase 10F — Contract Tests (✅ Completada)
- **Objetivo**: Tests del contrato de Paperclip sin frameworks externos.
- **Implementado**: `scripts/logictoop-paperclip-contract.ts` valida modo, idempotency, HMAC y mock de envío.

#### Fase 10G — Webhook Verification Dry-Run (✅ Completada)
- **Objetivo**: Validar el proceso del Webhook localmente sin afectar DB.
- **Implementado**: El Webhook acepta header `x-paperclip-dry-run` para verificar firmas pero no guarda nada ni desencadena eventos.

#### Fase 11A — Paperclip Staging Readiness Gate (✅ Completada)
- **Objetivo**: Función central que determina si es seguro pasar a staging.
- **Implementado**: `lib/logictoop/paperclip-readiness.ts`. Revisa flags y variables de entorno críticas.

#### Fase 11B — Webhook Verification Hardening (✅ Completada)
- **Objetivo**: Fortalecer el webhook dry-run validando tamaño, método, headers estrictos y event types.
- **Implementado**: `app/api/logictoop/paperclip/webhook/route.ts` incluye validaciones de 50KB, `POST` unicamente, y todos los headers mandatorios.

#### Fase 11C — Paperclip Event Bridge Dry-Run (✅ Completada)
- **Objetivo**: Mapear eventos webhook a acciones de LogicToop sin mutar estado.
- **Implementado**: `lib/logictoop/paperclip-event-bridge.ts`.

#### Fase 11D — Controlled Real Connection (⏳ Pendiente)
- **Objetivo**: Paperclip productivo en staging.
- **Riesgo**: Alto. REAL runtime sigue NO implementado.
- **Requisitos antes de real**:
  - staging environment.
  - real Paperclip endpoint.
  - HMAC secret management.
  - callback retry policy.
  - audit event integration.
  - kill switch tested.

---

## 8. Qué Partes de LogicToop AI Ya Son Equivalentes o Superiores a Paperclip

| Capacidad | LogicToop AI | Paperclip |
|---|---|---|
| Tenant Isolation (`orgId`) | ✅ Nativo | Depende de implementación |
| Human-in-the-loop (Approvals) | ✅ Completo | Variable |
| Auditoría Enterprise (Events) | ✅ Completo | Variable |
| Node Safety Classification | ✅ `NODE_SAFETY_MAP` | No aplica |
| Safe Step-by-Step Resume | ✅ Manual controlado | No aplica |
| Rollback inmediato (Feature Flag) | ✅ `PAPERCLIP_REAL_CONNECTION=false` | Depende |

---

## 9. Nota Final

> ⚠️ **Este documento es solo diseño.** No se ha implementado código de Paperclip real.
> No se han creado endpoints, webhooks, clients HTTP ni conexiones externas.
> Todo código de Paperclip futuro debe pasar por el proceso obligatorio descrito en `docs/logictoop-ai.md` sección B.
