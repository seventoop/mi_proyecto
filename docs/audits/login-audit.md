# Auditoría Técnica Completa: Autenticación y Autorización

**Proyecto:** SevenToop
**Stack:** Next.js 14 + NextAuth v4 + Prisma + PostgreSQL
**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Tipo:** Solo lectura — sin modificaciones

---

## Índice

- [A) Mapa del Login](#a-mapa-del-login)
- [B) Flujo Paso a Paso](#b-flujo-paso-a-paso)
- [C) Persistencia / DB](#c-persistencia--db)
- [D) Autorización — Qué protege y qué no](#d-autorización--qué-protege-y-qué-no)
- [E) Checklist de Seguridad](#e-checklist-de-seguridad)
- [F) Duplicados / Inconsistencias](#f-duplicados--inconsistencias)
- [G) Backlog Priorizado](#g-backlog-priorizado)

---

## A) Mapa del Login

| Componente | Archivo | Función | Proveedor |
|---|---|---|---|
| Página Login | `app/(auth)/login/page.tsx` | Formulario email/password, "recuérdame", redirect por rol | NextAuth `signIn()` |
| Página Register | `app/(auth)/register/page.tsx` | Selector de 4 roles → POST `/api/auth/register` | POST sin auth |
| Página Forgot Password | `app/(auth)/forgot-password/page.tsx` | Email → `requestPasswordReset()` | Server action + Resend |
| Página Reset Password | `app/(auth)/reset-password/page.tsx` | Token en query + nueva contraseña → `resetPassword()` | Server action |
| Layout Auth | `app/(auth)/layout.tsx` | Wrapper sin sidebar, centrado | — |
| Handler NextAuth | `app/api/auth/[...nextauth]/route.ts` | Enruta todas las peticiones al `authOptions` | NextAuth v4 |
| Endpoint Register | `app/api/auth/register/route.ts` | Valida, hash, crea User, demo 48h | POST público + rate limit |
| Auth Config | `lib/auth.ts` | `authOptions`: CredentialsProvider, JWT callback con DB re-fetch | NextAuth + bcrypt |
| Guards Principales | `lib/guards.ts` | `requireAuth/Role/AnyRole/Ownership`, `orgFilter`, `withAdminGuard` | `getServerSession` |
| Guards Secundarios | `lib/auth/guards.ts` | Versión duplicada con `redirect()` en lugar de `throw` | `getServerSession` |
| Middleware | `middleware.ts` | Protege `/dashboard/*`, `/onboarding/*`; KYC/demo enforcement; rate limit | `withAuth()` de NextAuth |
| Server Actions Auth | `lib/actions/auth-actions.ts` | `requestPasswordReset`, `resetPassword`, `activateDemoMode` | Prisma + Resend |
| Login Gate (incompleto) | `components/public/login-gate.tsx` | Modal de login para rutas públicas — **TODO, sin implementar** | — |
| Navbar Logout | `components/public/navbar.tsx` | Botón logout → `signOut()` de NextAuth | NextAuth |
| Rate Limit | `lib/rate-limit.ts` | In-memory rate limiter (IP-based) usado en middleware y API register | In-memory Map |

---

## B) Flujo Paso a Paso

### 1. Login

```
[Browser] Entra a /login
  ↓ Rellena email + password, click "Ingresar"
[UI - app/(auth)/login/page.tsx]
  ├─ Validación cliente: email regex, password ≥ 8 chars, ambos requeridos
  └─ Llama: signIn("credentials", { email, password })
    ↓
[NextAuth - app/api/auth/callback/credentials (automático)]
  ↓
[lib/auth.ts → CredentialsProvider.authorize()]
  ├─ Busca User en DB por email (Prisma)
  ├─ Si NO existe → lanza "Credenciales inválidas" (anti-enumeration ✓)
  ├─ Si existe → bcrypt.compare(password, user.password)
  │   ├─ Inválido → lanza "Credenciales inválidas"
  │   └─ Válido → retorna { id, email, name, role, orgId, kycStatus, demoEndsAt }
  ↓
[lib/auth.ts → callbacks.jwt()]
  ├─ Primera vez: almacena { id, role, orgId, kycStatus, demoEndsAt } en JWT
  └─ Siempre (cada request): re-fetch del DB → actualiza JWT con valores actuales
    ↓
[lib/auth.ts → callbacks.session()]
  └─ Copia JWT → session.user (exposición: id, role, orgId, kycStatus, demoEndsAt)
    ↓
[NextAuth]
  ├─ Emite cookie httpOnly, secure (prod), sameSite: lax
  └─ Session maxAge: 24 horas
    ↓
[UI - login/page.tsx]
  ├─ Lee session.user.role
  ├─ Redirect basado en rol:
  │   ADMIN/SUPERADMIN → /dashboard/admin
  │   DESARROLLADOR/VENDEDOR → /dashboard/developer
  │   INVERSOR/CLIENTE → /dashboard/portafolio
  └─ Guarda email en localStorage si "recuérdame" (no es secreto, aceptable)
    ↓
[middleware.ts - en cada request a /dashboard/*]
  ├─ Valida token JWT con withAuth()
  ├─ Verifica rol para subrutas /admin
  ├─ KYC/demo enforcement:
  │   kycStatus="NINGUNO" + demoEndsAt < now → /onboarding/kyc
  │   kycStatus="DEMO_EXPIRADO" → /demo-expired
  └─ Rate limit en intentos de login (10/15min por IP, in-memory)
```

**Errores cubiertos:** email inválido, password vacío, credenciales incorrectas
**Errores NO cubiertos:** account banned/disabled (no existe campo en schema), acceso desde IP bloqueada sin Redis

---

### 2. Registro

```
[Browser] Entra a /register
  ↓ Elige rol, rellena nombre/email/password/confirmación/terms
[UI - app/(auth)/register/page.tsx]
  ├─ Validación cliente: todos requeridos, password confirm match, terms checked
  └─ POST /api/auth/register
    ↓
[app/api/auth/register/route.ts]
  ├─ Rate limit: 5 registros/hora por IP (in-memory)
  ├─ Valida schema (Zod): nombre ≥ 2 chars, email válido, password ≥ 8 chars
  ├─ Bloquea roles: ADMIN, SUPERADMIN → 403
  ├─ Whitelist: DESARROLLADOR, VENDEDOR, INVERSOR aceptados; resto → CLIENTE
  ├─ Verifica email único → 400 si ya existe
  ├─ Hash: bcrypt(password, 10)
  └─ DB.user.create: { nombre, email, password:hash, rol, kycStatus:"NINGUNO", demoEndsAt: now+48h, demoUsed:false }
    ↓ 201 { message, userId }
[UI]
  └─ Redirect → /login?registered=true
```

**Riesgo:** Registro abierto → cualquiera puede crear cuenta con demo 48h. Sin email verification.

---

### 3. Forgot Password

```
[Browser] Entra a /forgot-password
  ↓ Entra email
[UI - app/(auth)/forgot-password/page.tsx]
  └─ Server action: requestPasswordReset(email)
    ↓
[lib/actions/auth-actions.ts → requestPasswordReset()]
  ├─ Valida email (Zod)
  ├─ Si RESEND_API_KEY no configurado → retorna mensaje manual a soporte
  ├─ Busca User por email
  ├─ Si NO existe → retorna SUCCESS "Si el email existe..." (anti-enumeration ✓)
  ├─ Si existe:
  │   ├─ token = crypto.randomBytes(32).toString("hex")
  │   ├─ expiry = now + 1 hora
  │   ├─ Intenta DB.user.update: { passwordResetToken, passwordResetExpires }
  │   │   └─ ⚠️ CAMPOS AUSENTES EN SCHEMA → catch silencioso con error "deshabilitado"
  │   └─ Envía email Resend: link /reset-password?token={token}
  └─ Retorna SUCCESS (siempre)
```

**Riesgo crítico:** `passwordResetToken` no está en `prisma/schema.prisma`. Reset falla silenciosamente.
**Riesgo medio:** Token en URL query parameter — visible en logs de proxy, Sentry, CDN, browser history.

---

### 4. Reset Password

```
[Browser] Llega a /reset-password?token=abc123...
[UI - app/(auth)/reset-password/page.tsx]
  ├─ Lee token de searchParams
  ├─ Si no hay token → muestra error "Token inválido o expirado"
  └─ Server action: resetPassword({ token, password })
    ↓
[lib/actions/auth-actions.ts → resetPassword()]
  ├─ Valida: token requerido, password ≥ 8 chars (Zod)
  ├─ DB.user.findFirst({ where: { passwordResetToken: token } })
  ├─ Si no existe O passwordResetExpires < now → 403 "Token inválido o expirado"
  ├─ Hash: bcrypt(newPassword, 10)
  ├─ DB.user.update: { password: hash, passwordResetToken: null, passwordResetExpires: null }
  └─ Retorna SUCCESS
[UI]
  └─ Redirect → /login (delay 3s)
```

---

### 5. Logout

```
[Browser] Click "Logout" en navbar
[components/public/navbar.tsx]
  └─ signOut() de NextAuth
    ↓
[NextAuth]
  ├─ DELETE cookie de sesión en cliente
  └─ NO hay invalidación de token en servidor
[⚠️] Si cookie fue robada antes del logout → sigue válida hasta expiración (24h)
```

---

## C) Persistencia / DB

### Modelo User (auth-critical)

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique          // Llave de login
  password        String                     // bcrypt(10), nunca plaintext
  nombre          String
  rol             String    @default("VENDEDOR")
  kycStatus       String    @default("PENDIENTE")
  demoEndsAt      DateTime?
  demoUsed        Boolean   @default(false)
  orgId           String?                    // Multi-tenant scope
  organization    Organization? @relation(fields: [orgId], references: [id])
  auditLogs       AuditLog[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // ⚠️ AUSENTES EN SCHEMA (usados en auth-actions.ts):
  // passwordResetToken    String?
  // passwordResetExpires  DateTime?
}
```

### Campos Críticos

| Campo | Tipo | Default | Roles en auth |
|---|---|---|---|
| `email` | String UNIQUE | — | Llave de login |
| `password` | String | — | bcrypt(10), compare en authorize() |
| `rol` | String | VENDEDOR | Controla acceso, redirect, guards |
| `kycStatus` | String | PENDIENTE | Enforcement en middleware |
| `demoEndsAt` | DateTime? | null | Demo 48h desde registro |
| `orgId` | String? | null | Multi-tenant scoping en todos los guards |

### Roles existentes (hardcodeados, sin enum)

`ADMIN`, `SUPERADMIN`, `DESARROLLADOR`, `VENDEDOR`, `INVERSOR`, `CLIENTE`

Definidos en:
- `app/api/auth/register/route.ts` (whitelist)
- `middleware.ts` (checks inline)
- `lib/guards.ts` (hardcoded en `withAdminGuard`)
- `lib/actions/kyc-actions.ts` (hardcoded en `requireAnyRole`)
- `app/(auth)/login/page.tsx` (redirect switch)

### Impacto Multi-Tenant

- `orgId` en `User` → `Organization` (1-many)
- `orgFilter(user)` en `lib/guards.ts`: ADMIN no filtra, user sin org ve nada, user con org solo ve su org
- Afecta: Proyecto, Lead, BlogPost, PipelineEtapa, Workflow
- JWT incluye `orgId` → re-fetched del DB en cada request

### Schema Faltante para Password Reset

`lib/actions/auth-actions.ts` usa `passwordResetToken` y `passwordResetExpires` que NO existen en `prisma/schema.prisma`. El código tiene un try/catch que captura el error de Prisma "Unknown column" y retorna "servicio temporalmente deshabilitado". El reset de contraseña está **efectivamente roto** a menos que se haya ejecutado una migración manual.

---

## D) Autorización — Qué protege y qué no

### Middleware (`middleware.ts`)

**Matcher:** `/dashboard/:path*`, `/onboarding/:path*`, `/demo-expired`

| Check | Qué hace | Gap |
|---|---|---|
| `withAuth` | Valida existencia de JWT token | No valida expiración custom |
| Admin routes | `/dashboard/admin/*` requiere ADMIN/SUPERADMIN | Redirect a `/dashboard`, no 403 |
| KYC enforcement | `kycStatus=NINGUNO + demoEndsAt < now` → `/onboarding/kyc` | Solo en dashboard, no en API |
| Demo expirado | `kycStatus=DEMO_EXPIRADO` → `/demo-expired` | Solo en dashboard |
| Rate limit login | 10 intentos / 15min por IP | **In-memory**: no persiste entre deploys/instancias |

### Guards en `lib/guards.ts` (uso real)

| Guard | Aplicado en | Comportamiento si falla |
|---|---|---|
| `requireAuth()` | Casi todas las server actions | Lanza `AuthError(401)` |
| `requireRole(role)` | Admin server actions | Lanza `AuthError(403)` |
| `requireAnyRole([...])` | Dev/Vendor/mixed actions | Lanza `AuthError(403)` |
| `requireProjectOwnership(id)` | Mutaciones de proyecto | Lanza `AuthError(403/404)` |
| `requireReservaPermission(id)` | Mutaciones de reserva | Lanza `AuthError(403/404)` |
| `requireNotificationOwnership(id)` | Delete notificación | Lanza `AuthError(403)` |
| `requireKYC()` | Inversiones, KYC-gated actions | Lanza `AuthError(403)` |
| `requireCronSecret(req)` | Endpoints CRON | Lanza `AuthError(401/405)` |
| `withAdminGuard(handler)` | API routes de admin | Retorna `NextResponse(403)` |
| `orgFilter(user)` | Prisma queries multi-tenant | Filtra por orgId |

### Server Actions públicas (sin auth)

| Acción | Archivo | Justificación |
|---|---|---|
| `requestPasswordReset(email)` | `lib/actions/auth-actions.ts` | Pública por diseño |
| `resetPassword(token, password)` | `lib/actions/auth-actions.ts` | Token como auth |
| `crearLeadLanding(data)` | `lib/actions/leads.ts` | Lead capture público |
| `crearConsultaContacto(data)` | `lib/actions/leads.ts` | Contacto público |
| `getTestimonios()` | `lib/actions/testimonios.ts` | Solo APROBADO, público OK |
| `createTestimonio(data)` | `lib/actions/testimonios.ts` | Público con rate limit por email |
| `getProyectosDestacados()` | `lib/actions/proyectos.ts` | Solo PUBLICADO, público OK |
| `getBannersLanding()` | `lib/actions/banners.ts` | Solo ACTIVO, público OK |
| `getSystemConfig(key)` | `lib/actions/configuration.ts` | Config pública, OK |

### Hallazgo: Admin API routes sin verificación confirmada

Las rutas en `app/api/admin/*` deben verificarse individualmente:
- `app/api/admin/config/route.ts`
- `app/api/admin/orgs/route.ts`
- `app/api/admin/plans/route.ts`
- (20+ rutas adicionales)

El patrón `withAdminGuard()` existe y debería usarse, pero no se puede confirmar sin leer cada archivo que todas lo implementan.

---

## E) Checklist de Seguridad

| # | Check | Severidad | Estado | Detalle |
|---|---|---|---|---|
| E1 | Rate limit en login | **ALTO** | ⚠️ PARCIAL | 10/15min por IP, pero in-memory — no persiste en serverless multi-instancia |
| E2 | Rate limit en register | **ALTO** | ⚠️ PARCIAL | 5/hora por IP, mismo problema in-memory |
| E3 | Schema para password reset | **CRÍTICO** | ❌ FALLA | `passwordResetToken/Expires` ausentes en schema Prisma — reset roto |
| E4 | Token reset en URL (GET) | **ALTO** | ❌ RIESGO | Token visible en browser history, proxy logs, Sentry, CDN logs |
| E5 | CSRF | **MEDIO** | ✓ PROTEGIDO | NextAuth maneja, Next.js valida origin en server actions |
| E6 | Cookies (httpOnly/secure/sameSite) | **ALTO** | ✓ OK | NextAuth defaults: httpOnly=true, secure=true(prod), sameSite=lax |
| E7 | Expiración de sesión | **MEDIO** | ✓ OK | JWT maxAge 24h, re-fetch DB en cada request |
| E8 | Revocación de JWT post-logout | **MEDIO** | ⚠️ AUSENTE | signOut() borra cookie cliente pero no invalida token en servidor |
| E9 | Mensajes anti-enumeration | **MEDIO** | ✓ OK | Login y forgot-password usan mensajes genéricos |
| E10 | Password hashing | **CRÍTICO** | ✓ OK | bcrypt(10 rounds) en registro y reset |
| E11 | Open redirect post-login | **BAJO** | ✓ OK | Redirect hardcoded por rol, no usa returnUrl de query |
| E12 | Brute force protection | **ALTO** | ⚠️ PARCIAL | Rate limit existe pero in-memory (ver E1) |
| E13 | CORS | **BAJO** | ✓ OK | App monolítica, no expone API pública cross-origin |
| E14 | Env secrets | **CRÍTICO** | ✓ OK | NEXTAUTH_SECRET, RESEND_API_KEY vía .env — no hardcodeados |
| E15 | SQL injection | **CRÍTICO** | ✓ OK | Prisma ORM parametrizado, raw queries con `Prisma.join` |
| E16 | Logs de eventos de auth | **MEDIO** | ❌ AUSENTE | No hay audit log para login/logout/cambios de rol |
| E17 | Email verification en registro | **MEDIO** | ❌ AUSENTE | Cuentas se crean sin verificar email |
| E18 | Multi-tenant isolation | **ALTO** | ⚠️ PARCIAL | `orgFilter` existe pero no todos los queries lo usan |
| E19 | Account lockout/banned | **MEDIO** | ❌ AUSENTE | No existe campo `banned`/`active` en User |
| E20 | KYC enforcement | **MEDIO** | ✓ OK | Middleware + `requireKYC()` guard multi-layer |

---

## F) Duplicados / Inconsistencias

### 1. Guards duplicados

**`lib/guards.ts`** (289 líneas) — completo, multi-tenant, throw AuthError
**`lib/auth/guards.ts`** (60 líneas) — subset, usa `redirect()` en lugar de `throw`

Diferencia clave:
```typescript
// lib/guards.ts — para server actions / API routes
throw new AuthError("No tienes permisos", 403);

// lib/auth/guards.ts — para page components
redirect("/dashboard");
```

Algunos archivos importan de `lib/guards.ts`, otros de `lib/auth/guards.ts`. No hay una convención documentada.

### 2. Roles hardcodeados en 5+ lugares

Sin enum central. Definidos inline en:
1. `app/api/auth/register/route.ts` — `ALLOWED_ROLES`, `BLOCKED_ROLES`
2. `middleware.ts` — `role !== "ADMIN" && role !== "SUPERADMIN"`
3. `app/(auth)/login/page.tsx` — switch(role) para redirect
4. `lib/actions/kyc-actions.ts` — `requireAnyRole(["DESARROLLADOR", "VENDEDOR"])`
5. `lib/guards.ts` — `withAdminGuard` verifica `["ADMIN", "SUPERADMIN"]`

Si se agrega un rol nuevo, hay que actualizar 5+ archivos.

### 3. Dirección de error en guards inconsistente

```typescript
// lib/guards.ts: correcto para API/actions
throw new AuthError("No tienes permisos", 403);  // capturado por handleGuardError()

// lib/auth/guards.ts: correcto para pages
redirect("/dashboard");  // no captura el status HTTP
```

Mezclar ambos puede llevar a que server actions de page components redireccionen en lugar de retornar error estructurado.

### 4. Token de reset en URL vs body

**Actual:** `/reset-password?token=abc...` (GET, query param)
**Mejor práctica:** POST con token en body o validación server-side antes de render

El token queda en:
- `document.referrer` si hay redirect posterior
- Logs del servidor (Next.js access logs)
- Sentry breadcrumbs si hay error en la página
- CDN/proxy access logs
- Browser history del usuario

### 5. JWT re-fetch en CADA request

```typescript
// lib/auth.ts - callbacks.jwt()
if (token.id) {
    const dbUser = await prisma.user.findUnique({ where: { id: token.id } });
    // actualiza token con valores de DB
}
```

Esto se ejecuta en **cada request**, incluso para recursos estáticos que pasan por middleware. Performance cost en alta concurrencia.

---

## G) Backlog Priorizado

### 🔴 CRÍTICO

| ID | Descripción | Archivos a tocar | Riesgo si no se hace |
|---|---|---|---|
| C1 | Agregar `passwordResetToken` y `passwordResetExpires` a schema Prisma + migración | `prisma/schema.prisma`, `npm run db:migrate:dev` | Reset de contraseña completamente roto |
| C2 | Implementar rate limiting con Redis/Upstash (reemplazar in-memory) | `lib/rate-limit.ts`, `middleware.ts`, `app/api/auth/register/route.ts` | Brute force bypass en Vercel serverless multi-instancia |

### 🟠 ALTO

| ID | Descripción | Archivos a tocar | Riesgo si no se hace |
|---|---|---|---|
| H1 | Mover token de reset de URL query a POST body (o validar server-side) | `app/(auth)/reset-password/page.tsx`, `lib/actions/auth-actions.ts` | Token visible en logs, browser history, proxies |
| H2 | Auditar y proteger todas las rutas en `app/api/admin/*` con `withAdminGuard` | `app/api/admin/**/*.ts` (20+ archivos) | Posible exposición de operaciones admin |
| H3 | Centralizar definición de roles en enum/constants | `types/roles.ts` (nuevo), 5+ archivos consumidores | Inconsistencias al agregar roles nuevos |
| H4 | Consolidar guards en un único archivo con convención documentada | `lib/guards.ts`, `lib/auth/guards.ts` | Confusión, mantenimiento riesgoso |

### 🟡 MEDIO

| ID | Descripción | Archivos a tocar | Riesgo si no se hace |
|---|---|---|---|
| M1 | Implementar audit logging para eventos de auth (login/logout/role change) | `prisma/schema.prisma` (AuditLog), `lib/auth.ts`, guards | Sin trazabilidad para incidentes |
| M2 | Agregar verificación de email en registro | `app/api/auth/register/route.ts`, `lib/actions/auth-actions.ts`, `lib/mail.ts` | Cuentas con emails inválidos/falsos |
| M3 | Agregar campo `active`/`banned` en User para account lockout | `prisma/schema.prisma`, `lib/auth.ts` callbacks | No se puede deshabilitar cuentas |
| M4 | Optimizar JWT re-fetch (cachear o solo re-fetch en cambios) | `lib/auth.ts` callbacks.jwt() | DB hit en cada request (performance) |
| M5 | Implementar `LoginGate` en rutas públicas que lo necesiten | `components/public/login-gate.tsx` | Feature bloqueada, TODO sin fecha |

### 🟢 BAJO

| ID | Descripción | Archivos a tocar | Riesgo si no se hace |
|---|---|---|---|
| L1 | Agregar session timeout UI (warning antes de expirar 24h) | Nuevo componente dashboard | UX — usuario pierde trabajo sin aviso |
| L2 | Implementar 2FA para ADMIN/SUPERADMIN | `lib/auth.ts`, new TOTP component | Riesgo bajo, solo afecta admins |
| L3 | Configurar cookies explícitamente (no depender de NextAuth defaults) | `lib/auth.ts` cookieOptions | Documentación y control explícito |
| L4 | Agregar CAPTCHA en registro (Google reCAPTCHA / hCaptcha) | `app/(auth)/register/page.tsx`, `app/api/auth/register/route.ts` | Spam/bots en registro |
| L5 | Documentar política de cookies y expiración (GDPR) | `docs/SECURITY.md` (nuevo) | Compliance |

---

## Resumen ejecutivo

### Fortalezas

- NextAuth v4 bien configurado con JWT y callbacks seguros
- bcrypt(10 rounds) para password hashing
- Anti-enumeration en login y forgot-password
- Multi-tenant aware con `orgId` scoping en guards
- Rate limiting en endpoints críticos (aunque limitado por ser in-memory)
- KYC + demo enforcement en middleware (multi-layer)
- Server actions con guards en lugar de endpoints abiertos
- Sin SQL injection (Prisma ORM)

### Debilidades críticas (acción inmediata)

1. **`passwordResetToken` ausente en schema Prisma** → reset de contraseña roto
2. **Rate limiting in-memory** → no funciona en Vercel serverless distribuido
3. **Token de reset en URL** → visible en logs externos

### Score estimado de seguridad

**7/10** — Arquitectura sólida con gaps operacionales concretos y corregibles.

Los issues críticos son solucionables en ≤1 semana sin refactors mayores.
