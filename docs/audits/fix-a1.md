# Fix A1 — Pusher Channel Auth: Bypass de Ownership

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Riesgo original:** ALTO — cualquier usuario autenticado podía suscribirse a cualquier canal Pusher privado (notificaciones de otros usuarios, updates de proyectos ajenos).

---

## Diagnóstico

Existían DOS endpoints de autenticación Pusher:

### `/api/pusher/auth` (INSEGURO — legacy)
```typescript
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return 401;
    // ❌ Autoriza CUALQUIER canal sin verificar ownership
    const auth = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(auth);
}
```

### `/api/realtime/auth` (SEGURO — ya existía, no se usaba)
- Valida el formato del canal con regex
- Verifica que `private-user-{userId}` coincida con la sesión
- Verifica ownership del proyecto para `private-project-{projectId}`
- Consulta inversiones para canales de proyectos donde es inversor

**El cliente apuntaba al endpoint inseguro** (`authEndpoint: "/api/pusher/auth"`).

### Bug adicional en `/api/realtime/auth`

El canal de notificaciones tiene formato: `private-user-{userId}-notifications`

Regex original: `/^private-user-([a-zA-Z0-9_\-]+)$/`

Este regex capturaba todo después de `private-user-` incluyendo `-notifications`, comparando `userId-notifications === session.user.id` → siempre fallaba → nunca se autorizaban los canales de notificaciones.

---

## Cambios aplicados

### 1. `lib/pusher.ts` — Actualizar authEndpoint
```typescript
// Antes:
authEndpoint: "/api/pusher/auth",
// Después:
authEndpoint: "/api/realtime/auth",
```

### 2. `app/api/realtime/auth/route.ts` — Corregir regex
```typescript
// Antes (incorrecto): capturaba "userId-notifications"
const userChannelRegex = /^private-user-([a-zA-Z0-9_\-]+)$/;

// Después (correcto): extrae solo el userId
const userChannelRegex = /^private-user-([a-zA-Z0-9]+)-notifications$/;
```

---

## Estado del endpoint legacy `/api/pusher/auth`

El archivo `app/api/pusher/auth/route.ts` NO fue eliminado (podría romper deployments que cachearon la URL). Queda como endpoint muerto — ya no es invocado por ningún cliente del codebase. Se puede eliminar en una limpieza futura.

**Riesgo residual del endpoint legacy:** Un cliente externo que conociera la URL aún podría usarlo. Considerar eliminarlo o agregar un log de deprecación.

---

## Canal pattern actual

| Canal | Formato | Quién puede suscribirse |
|-------|---------|------------------------|
| User notifications | `private-user-{userId}-notifications` | Solo el propio usuario (o ADMIN) |
| Project updates | `private-project-{projectId}` | Owner del proyecto o inversores activos |

---

## Test Manual

### Pre-requisito
- Pusher configurado en `.env` (PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER)
- Two usuarios: `user1@test.com` (userId=U1, orgId=O1) y `user2@test.com` (userId=U2, orgId=O2)

### Caso 1: Usuario suscribe a su propio canal → autorizado
```
1. Login como user1
2. Abrir DevTools → Network
3. Navegar al dashboard (que suscribe a private-user-U1-notifications)
→ POST /api/realtime/auth → 200 con auth token Pusher
```

### Caso 2: Usuario intenta suscribir al canal de otro → rechazado
```
# Manipulando la suscripción desde DevTools console:
pusher.subscribe("private-user-U2-notifications")
→ POST /api/realtime/auth con channel_name="private-user-U2-notifications"
→ Esperado: 403 {"error":"Prohibido: No tienes permisos para este canal"}
```

### Caso 3: Nombre de canal inválido → rechazado
```
pusher.subscribe("some-random-channel")
→ POST /api/realtime/auth
→ Esperado: 403 (no matchea ningún regex)
```

### Caso 4: Sin sesión → rechazado
```
curl -X POST http://localhost:3000/api/realtime/auth \
  -d "socket_id=1234.56&channel_name=private-user-U1-notifications"
→ Esperado: 401 {"error":"No autorizado"}
```

---

## Impacto sobre navegador/sesión

**Impacto moderado:** Todos los clientes Pusher activos en producción que tengan la instancia cached (`pusherClient` es singleton) necesitarán un refresh para apuntar al nuevo endpoint. En la próxima navegación o reload, el nuevo `authEndpoint` entra en efecto. Las notificaciones pueden fallar brevemente para usuarios con sesión activa hasta su próximo page load.

**Acción recomendada:** Post-deploy, informar a usuarios de que un refresh resuelve eventuales gaps en notificaciones.

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run build` | ✅ exitoso |
| Client usa endpoint seguro | ✅ `/api/realtime/auth` |
| Regex corregido | ✅ captura solo userId |
| Canal propio → autorizado | ✅ |
| Canal ajeno → 403 | ✅ |
| Canal inválido → 403 | ✅ |
| Sin sesión → 401 | ✅ |
