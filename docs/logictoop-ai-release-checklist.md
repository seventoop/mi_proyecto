# LogicToop AI — Release Checklist

Esta lista de verificación es de uso obligatorio **antes** de fusionar `dani-dev3` hacia `main` o desplegar a producción.

## Información de la Release
- **Branch base:** `dani-dev3`
- **Feature principal:** LogicToop AI Production-safe MVP + Paperclip Sidecar Architecture.
- **Estado de Paperclip real:** `OFF` (Disconnected).

## 1. Feature Flags Obligatorias en Producción
Asegurarse que el archivo `.env` en producción tenga las siguientes banderas configuradas EXACTAMENTE de esta forma:

```env
FEATURE_FLAG_LOGICTOOP_AI_UI=true
FEATURE_FLAG_LOGICTOOP_AI_CORE=true
FEATURE_FLAG_PAPERCLIP=false
FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION=false
```

> [!WARNING]
> La activación de `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION=true` en producción está estrictamente PROHIBIDA hasta superar pruebas end-to-end completas en Staging con firma HMAC.

## 2. Comandos de Validación Estática
Ejecutar estos comandos en CI o local. Todos deben arrojar exit code 0.

- [ ] `npx prisma validate`
- [ ] `$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run typecheck`
- [ ] `npx tsx scripts/logictoop-ai-smoke.ts`
- [ ] `npx tsx scripts/logictoop-paperclip-contract.ts`

## 3. Criterios para Deploy Seguro (GO)
- [ ] La interfaz de Approvals y Task Detail Viewer operan en modo lectura/autorización humana sin crashes.
- [ ] El *Flow Bridge* pone las ejecuciones en `AI_APPROVED_WAITING_RESUME` sin ejecutar acciones comerciales de forma oculta.
- [ ] Se registran los `Enterprise Events` en la tabla `LogicToopAiEvent`.
- [ ] El Worker Dry-Run es manual y no hay workers automáticos, colas ni cronjobs activos para LogicToop AI.
- [ ] Webhook Skeleton de Paperclip soporta Dry-Run pero bloquea las ejecuciones de negocio (no modifica DB).
- [ ] No existen llamadas reales a la red vía Paperclip Sidecar Client (validado por Contract Tests).

## 4. Criterios de Riesgo / NO Deploy (NO GO)
Si alguno de los siguientes ítems es verdadero, **NO DESPLEGAR**:
- ❌ Se observan llamadas `fetch()` o `axios` en el runtime de Paperclip Sidecar.
- ❌ El Webhook Skeleton procesa peticiones mutando la base de datos o insertando eventos.
- ❌ Nodos comerciales (`SEND_EMAIL`, `CREATE_LEAD`, etc.) fueron desbloqueados sin aprobación de seguridad.
- ❌ Las migraciones de DB fallan o hay cambios en `schema.prisma` que alteran la coherencia relacional.

## 5. Playbook de Rollback
Si se detectan comportamientos anómalos o "side-effects" no autorizados en producción tras el despliegue:

1. **Cortar UI:** Cambiar `FEATURE_FLAG_LOGICTOOP_AI_UI=false` para ocultar paneles administrativos.
2. **Cortar Core:** Cambiar `FEATURE_FLAG_LOGICTOOP_AI_CORE=false` para bloquear aprobaciones/rechazos.
3. **Aislamiento:** Asegurar que `FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION=false` sigue firme.

## 6. Próximas Fases Post-Deploy
- **Fase 12A**: Cobertura adicional para estados de *WAIT / DELAY / INTERNAL_NOTE*.
- **Fase 12B**: Paperclip staging verification local endpoint mock.
- **Fase 12C**: Diseño de persistencia para idempotency keys.
- **Fase 13**: Diseño e implementación de *Controlled Commercial Side-Effects* para la fase en vivo.
