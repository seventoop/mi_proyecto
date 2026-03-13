# Fix M4 — passwordResetToken / passwordResetExpires: Missing Prisma Schema Fields

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Riesgo original:** MEDIO — la función de recuperación de contraseña estaba completamente rota en prod. El `prisma.user.update()` fallaba con "Unknown column" o el `findUnique({ where: { passwordResetToken } })` nunca encontraba resultados porque los campos no existían en la DB. El código usaba `as any` para suprimir los errores de TypeScript.

---

## Raíz del problema

`lib/actions/auth-actions.ts` usaba dos campos (`passwordResetToken`, `passwordResetExpires`) que no estaban declarados en `prisma/schema.prisma`. Consecuencias:

1. Prisma Client no los conocía → TypeScript error → código usaba `as any` para compilar.
2. Los campos no existían en la DB → el `update()` fallaba silenciosamente con catch genérico.
3. El flujo de reset estaba 100% roto en producción sin error visible para el usuario (anti-enumeration response igual al success).

---

## Cambios

### 1. `prisma/schema.prisma` — User model

Campos agregados:
```prisma
passwordResetToken    String?   @unique
passwordResetExpires  DateTime?
```

`@unique` en `passwordResetToken` porque:
- Permite `findUnique({ where: { passwordResetToken } })` sin índice manual.
- Garantiza que no existan dos tokens activos para distintos usuarios.
- PostgreSQL permite múltiples `NULL` en columnas `UNIQUE`, por lo que los usuarios sin token no se ven afectados.

### 2. DB push

```
npx prisma db push --accept-data-loss
# → Your database is now in sync with your Prisma schema.
# → Generated Prisma Client (v5.22.0)
```

La advertencia de "data loss" era falsa: PostgreSQL no tiene duplicados en una columna con todos valores `NULL`.

### 3. `lib/actions/auth-actions.ts` — Limpieza de workarounds

**`requestPasswordReset`**: eliminado el `try/catch` con mensaje de error "schema out of sync":
```ts
// Antes
const data: any = {};
try {
    data.passwordResetToken = token;
    data.passwordResetExpires = expiry;
    await prisma.user.update({ where: { id: user.id }, data });
} catch (e: any) {
    if (e.message?.includes("Unknown column")) { ... }
    throw e;
}

// Después
await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expiry },
});
```

**`resetPassword`**: eliminado el cast `(prisma.user as any)` y el try/catch de fallback:
```ts
// Antes
user = await (prisma.user as any).findUnique({ where: { passwordResetToken: token } });

// Después
const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });
```

**`prisma.user.update` final**: eliminado `as any` del objeto `data`:
```ts
// Antes
data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null } as any

// Después
data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null }
```

---

## Test Manual

### Pre-requisitos
- Dev local con DB conectada
- Usuario `test@example.com` registrado con contraseña conocida
- `RESEND_API_KEY` y `NEXTAUTH_URL` configurados en `.env` (o mockear en dev)

### Flujo completo de recuperación

#### 1. Solicitar reset → token guardado en DB
```
POST /forgot-password → ingresar test@example.com
→ Verificar en DB: SELECT "passwordResetToken", "passwordResetExpires" FROM users WHERE email = 'test@example.com';
→ Esperado: token hex de 64 chars, expiry = now + 1h
```

#### 2. Usar token válido → contraseña actualizada
```
GET /reset-password?token=<TOKEN_DE_LA_DB>
→ Ingresar nueva contraseña
→ Submit

Verificar en DB:
SELECT "passwordResetToken", "passwordResetExpires" FROM users WHERE email = 'test@example.com';
→ Esperado: ambos campos = NULL

Verificar login:
POST /login con nueva contraseña
→ Esperado: 200 + redirect a /dashboard
```

#### 3. Token expirado → error
```sql
-- Forzar expiración en DB:
UPDATE users SET "passwordResetExpires" = NOW() - INTERVAL '1 hour' WHERE email = 'test@example.com';
```
```
GET /reset-password?token=<TOKEN>
→ Esperado: error "Token inválido o expirado"
```

#### 4. Token inválido → error
```
GET /reset-password?token=tokeninvalido123
→ Esperado: error "Token inválido o expirado"
```

#### 5. Email inexistente → misma respuesta (anti-enumeration)
```
POST /forgot-password → ingresar noexiste@example.com
→ Esperado: "Si el email existe, se enviarán las instrucciones." (igual que email válido)
```

---

## Resultado

| Check | Estado |
|-------|--------|
| `npx prisma db push` | ✅ schema aplicado |
| `npm run typecheck` | ✅ 0 errores (sin `as any` en paths de reset) |
| `npm run build` | ✅ exitoso |
| Campo `passwordResetToken` en DB | ✅ con índice UNIQUE |
| Campo `passwordResetExpires` en DB | ✅ `DateTime?` |
| Flujo requestPasswordReset | ✅ tipado correcto, sin workarounds |
| Flujo resetPassword | ✅ `findUnique` tipado, sin cast |

---

## Deuda pendiente (fuera de scope)

- `schema.prisma` debería tener una migración formal (`prisma migrate dev`) en lugar de `db push`. En un proyecto con historial de migraciones, crear la migración con `prisma migrate dev --name add-password-reset-fields` genera el archivo SQL versionado en `prisma/migrations/`. El `db push` aplicado es equivalente para dev/staging, pero en prod se recomienda `prisma migrate deploy` con el archivo de migración.
