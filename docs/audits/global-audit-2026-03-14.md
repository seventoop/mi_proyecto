# Auditoría Técnica Global — SevenToop
**Fecha:** 2026-03-14
**Rama:** daniel/landing-audit
**Tipo:** Solo lectura — sin modificaciones de código

---

## Índice
- [A) Mapa de Rutas Completo](#a-mapa-de-rutas-completo)
- [B) Mapa de API Routes](#b-mapa-de-api-routes)
- [C) Auth y Authorization](#c-auth-y-authorization)
- [D) Multi-tenancy / orgId](#d-multi-tenancy--orgid)
- [E) Flujos de negocio end-to-end](#e-flujos-de-negocio-end-to-end)
- [F) Duplicados y fuentes de verdad](#f-duplicados-y-fuentes-de-verdad)
- [G) Issues priorizados](#g-issues-priorizados)
- [H) Checklist de Smoke Tests por rol](#h-checklist-de-smoke-tests-por-rol)
- [I) Apéndice técnico](#i-apéndice-técnico)
- [J) Resultado de herramientas](#j-resultado-de-herramientas)

---

## A) Mapa de Rutas Completo

### A1 — Rutas Públicas (sin auth)

| Ruta | Archivo | Guard | Server Actions / API | Notas de riesgo |
|------|---------|-------|---------------------|-----------------|
| `/` | `app/(public)/page.tsx` | — | `getBannersLanding()`, `getProyectosDestacados()`, `getSystemConfig()` | Lead capture via `crearLeadLanding()` — tiene rate-limit en-acción |
| `/proyectos` | `app/(public)/proyectos/page.tsx` | — | Query local con `visibilityStatus=PUBLICADO` | Sin auth, correcto |
| `/proyectos/[slug]` | `app/(public)/proyectos/[slug]/page.tsx` | — | Query local | Chequea `visibilityStatus` |
| `/proyectos/[slug]/unidades/[id]` | `app/(public)/proyectos/[slug]/unidades/[id]/page.tsx` | — | Query local | ⚠️ NO valida `proyecto.visibilityStatus` — unidad accesible aunque proyecto no sea público |
| `/proyectos/[slug]/masterplan` | `app/(public)/proyectos/[slug]/masterplan/page.tsx` | — | Query local | SVG correcto |
| `/proyectos/[slug]/tour360` | `app/(public)/proyectos/[slug]/tour360/page.tsx` | — | Query local | Valida `visibilityStatus` |
| `/blog` | `app/(public)/blog/page.tsx` | — | `getNoticias()` | Sin paginación UI |
| `/blog/[slug]` | `app/(public)/blog/[slug]/page.tsx` | — | `getNoticia(slug)` | Sin metadata SEO dinámica |
| `/desarrolladores` | `app/(public)/desarrolladores/page.tsx` | — | — | 100% estático |
| `/contacto` | `app/(public)/contacto/page.tsx` | — | `crearConsultaContacto()` | Rate-limit aplicado |
| `/demo-expired` | `app/(public)/demo-expired/page.tsx` | — | — | Destino del middleware |
| `/legal/terminos`, `/legal/privacidad` | estáticas | — | — | Estáticas |

### A2 — Rutas Auth

| Ruta | Archivo | Guard | Notas de riesgo |
|------|---------|-------|-----------------|
| `/login` | `app/(auth)/login/page.tsx` | — | Rate-limit en middleware (in-memory, no distribuido) |
| `/register` | `app/(auth)/register/page.tsx` | — | Whitelist de roles |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | — | `requestPasswordReset()` |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | — | ⚠️ Token en query param URL |

### A3 — Dashboard ADMIN/SUPERADMIN

| Ruta | Archivo | Guard | Server Actions / API | Notas de riesgo |
|------|---------|-------|---------------------|-----------------|
| `/dashboard/admin` | `app/(dashboard)/dashboard/admin/page.tsx` | Middleware → ADMIN/SUPERADMIN | — | Guard correcto |
| `/dashboard/admin/users` | `app/(dashboard)/dashboard/admin/users/page.tsx` | Middleware | `prisma.user.findMany` directo | ✓ |
| `/dashboard/admin/kyc` | `app/(dashboard)/dashboard/admin/kyc/page.tsx` | Middleware | `getPendingKYC()`, `reviewDeveloperKyc()` | Audit log incluido |
| `/dashboard/admin/planes` | `app/(dashboard)/dashboard/admin/planes/page.tsx` | Middleware | `getPlans()`, `createPlan()` | ✓ |
| `/dashboard/admin/proyectos` | `app/(dashboard)/dashboard/admin/proyectos/page.tsx` | Middleware | `getProyectosAdmin()` | ✓ |
| `/dashboard/admin/proyectos/[id]` | `app/(dashboard)/dashboard/admin/proyectos/[id]/page.tsx` | Middleware | — | ✓ |
| `/dashboard/admin/crm/leads` | `app/(dashboard)/dashboard/admin/crm/leads/page.tsx` | Middleware | `GET /api/admin/crm/leads` | ✓ |
| `/dashboard/admin/configuracion` | `app/(dashboard)/dashboard/admin/configuracion/page.tsx` | Middleware | `getSystemConfig()`, `setSystemConfig()` | ✓ |
| `/dashboard/admin/banners` | `app/(dashboard)/dashboard/admin/banners/page.tsx` | Middleware | Banner actions | ✓ |
| `/dashboard/admin/blog` | `app/(dashboard)/dashboard/admin/blog/page.tsx` | Middleware | Blog actions | ✓ |
| `/dashboard/admin/logictoop/*` | `app/(dashboard)/dashboard/admin/logictoop/**` | Middleware | LogicToop actions | Gran superficie — ver F7 |
| `/dashboard/admin/riesgos` | `app/(dashboard)/dashboard/admin/riesgos/page.tsx` | Middleware | — | ✓ |

### A4 — Dashboard DEVELOPER/VENDEDOR

| Ruta | Archivo | Guard | Server Actions / API | Notas de riesgo |
|------|---------|-------|---------------------|-----------------|
| `/dashboard/developer` | `app/(dashboard)/dashboard/developer/page.tsx` | Middleware | `getDeveloperStats()` | Scoped a orgId |
| `/dashboard/developer/leads` | `app/(dashboard)/dashboard/developer/leads/page.tsx` | Middleware | `getLeads()` | Multi-tenant correcto via orgId |
| `/dashboard/developer/proyectos` | `app/(dashboard)/dashboard/developer/proyectos/page.tsx` | Middleware | `getProyectosByDeveloper()` | ✓ |
| `/dashboard/developer/proyectos/[id]` | `app/(dashboard)/dashboard/developer/proyectos/[id]/page.tsx` | Middleware | `requireProjectOwnership` | ✓ |
| `/dashboard/developer/reservas` | `app/(dashboard)/dashboard/developer/reservas/page.tsx` | Middleware | `getReservas()` | ⚠️ No usa orgFilter — filtra por vendedorId/creadoPorId solamente |
| `/dashboard/developer/mi-perfil/kyc` | `app/(dashboard)/dashboard/developer/mi-perfil/kyc/page.tsx` | Middleware | `getKycProfile()`, `saveKycProfile()` | ✓ |
| `/dashboard/developer/banners` | `app/(dashboard)/dashboard/developer/banners/page.tsx` | Middleware | `checkPlanLimit("banners")` | M5 plan check |
| `/dashboard/developer/planes` | `app/(dashboard)/dashboard/developer/planes/page.tsx` | Middleware | `getOrgPlanWithUsage()` | ✓ |
| `/dashboard/developer/oportunidades` | `app/(dashboard)/dashboard/developer/oportunidades/page.tsx` | Middleware | — | ✓ |
| `/dashboard/crm/pipeline` | `app/(dashboard)/dashboard/crm/pipeline/page.tsx` | Middleware | `getPipelineEtapas()` | ✓ |
| `/dashboard/crm/metricas` | `app/(dashboard)/dashboard/crm/metricas/page.tsx` | Middleware | — | ✓ |

### A5 — Dashboard PORTAFOLIO (INVERSOR/CLIENTE)

| Ruta | Archivo | Guard | Server Actions / API | Notas de riesgo |
|------|---------|-------|---------------------|-----------------|
| `/dashboard/portafolio` | `app/(dashboard)/dashboard/portafolio/page.tsx` | Middleware | `getPortafolioData()` | ✓ |
| `/dashboard/portafolio/inversiones` | `app/(dashboard)/dashboard/portafolio/inversiones/page.tsx` | Middleware | `crearInversion()` | KYC check via `isKycVerifiedOrDemoActive()` |
| `/dashboard/portafolio/kyc` | `app/(dashboard)/dashboard/portafolio/kyc/page.tsx` | Middleware | `getUserKYC()` | ✓ |
| `/dashboard/portafolio/wallet` | `app/(dashboard)/dashboard/portafolio/wallet/page.tsx` | Middleware | — | ✓ |
| `/dashboard/portafolio/marketplace` | `app/(dashboard)/dashboard/portafolio/marketplace/page.tsx` | Middleware | — | ✓ |
| `/dashboard/portafolio/propiedades` | `app/(dashboard)/dashboard/portafolio/propiedades/page.tsx` | Middleware | — | ✓ |
| `/dashboard/portafolio/propiedades/[id]` | `app/(dashboard)/dashboard/portafolio/propiedades/[id]/page.tsx` | Middleware | — | ✓ |
| `/dashboard/portafolio/favoritos` | `app/(dashboard)/dashboard/portafolio/favoritos/page.tsx` | Middleware | — | ✓ |

### A6 — Dashboard Shared

| Ruta | Archivo | Guard | Notas de riesgo |
|------|---------|-------|-----------------|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Middleware | Redirect por rol |
| `/dashboard/reservas` | `app/(dashboard)/dashboard/reservas/page.tsx` | Middleware | `getReservas()` — ⚠️ sin orgFilter explícito |
| `/dashboard/leads` | `app/(dashboard)/dashboard/leads/page.tsx` | Middleware | `getLeads()` — ✓ orgId scoped |
| `/dashboard/proyectos` | `app/(dashboard)/dashboard/proyectos/page.tsx` | Middleware | `getProyectos()` — sin auth guard explícito dentro |
| `/dashboard/kyc` | `app/(dashboard)/dashboard/kyc/page.tsx` | Middleware | ✓ |
| `/dashboard/configuracion` | `app/(dashboard)/dashboard/configuracion/page.tsx` | Middleware | ✓ |
| `/dashboard/workflows` | `app/(dashboard)/dashboard/workflows/page.tsx` | Middleware | `GET /api/workflows` — plan check |

### A7 — Rutas deprecated / overlapping

| Ruta | Archivo | Solapamiento con | Acción recomendada |
|------|---------|-----------------|-------------------|
| `/dashboard/proyectos/[id]/inventario` | `app/(dashboard)/dashboard/proyectos/[id]/inventario/page.tsx` | `/dashboard/developer/proyectos/[id]/inventario` y `/dashboard/admin/proyectos/[id]/inventario` | Tres rutas con inventario — ver F3 |
| `/dashboard/proyectos/[id]/tour360` | `app/(dashboard)/dashboard/proyectos/[id]/tour360/page.tsx` | `/dashboard/developer/proyectos/[id]/tour360` y `/dashboard/admin/proyectos/[id]/tour360` | Tres rutas tour360 duplicadas |
| `/dashboard/mi-perfil/kyc` | `app/(dashboard)/dashboard/mi-perfil/kyc/page.tsx` | `/dashboard/developer/mi-perfil/kyc` | Duplicado — validar cuál es el canónico |

---

## B) Mapa de API Routes

| Método | Endpoint | Auth | Modelos Prisma | Riesgos |
|--------|----------|------|----------------|---------|
| GET/POST | `/api/crm/leads` | Session check manual (`getServerSession`) | Lead, Oportunidad | ⚠️ No usa `requireAuth()` canónico; usa `session.user as any` |
| GET/PUT | `/api/crm/leads/[id]` | Session check manual | Lead | `hasLeadAccess()` función local — duplica lógica de guards |
| POST | `/api/leads/public` | Ninguno (público) | Lead, User | 🔴 Crea lead sin orgId; `asignadoAId` = primer usuario (`findFirst`) — MUY INSEGURO |
| GET/POST | `/api/proyectos` | POST: ninguno | Proyecto | 🔴 `POST /api/proyectos` sin autenticación — cualquiera puede crear proyectos |
| GET/PUT/DELETE | `/api/proyectos/[id]` | GET: `requireAuth()`, PUT: `requireProjectOwnership()`, DELETE: via action | Proyecto, Lead, Oportunidad | ✓ GET no hace orgFilter |
| GET/POST | `/api/reservas` | `requireAuth()` / `requireKYC()` | Reserva, Unidad | ⚠️ GET sin orgFilter; POST sin orgFilter en reserva creada |
| GET/PUT | `/api/reservas/[id]` | `requireAuth()` | Reserva | Verificar que orgFilter aplica |
| GET | `/api/reservas/[id]/documento` | `requireAuth()` | Reserva | ✓ |
| GET/POST | `/api/workflows` | `requireAnyRole(["ADMIN","DESARROLLADOR"])` | Workflow | M5 plan check ✓ |
| GET/PUT/DELETE | `/api/workflows/[id]` | `requireAnyRole` | Workflow | ✓ |
| POST | `/api/workflows/[id]/run` | `requireAnyRole` | Workflow, WorkflowRun | ✓ |
| GET/POST | `/api/tours` | `requireAuth()` | Tour360 | M5 plan check `checkPlanLimit("tour360")` ✓ |
| GET/PUT/DELETE | `/api/tours/[id]` | `requireAuth()` | Tour360 | ✓ |
| GET/POST | `/api/unidades` | Session check via `getServerSession` | Unidad | ⚠️ No usa canónico `requireAuth()` |
| GET/PUT/DELETE | `/api/unidades/[id]` | NINGUNO | Unidad, HistorialUnidad | 🔴 CRÍTICO: sin autenticación |
| GET/POST | `/api/developments` | NINGUNO | Proyecto | 🔴 CRÍTICO: sin autenticación en GET y POST |
| GET/PUT/DELETE | `/api/developments/[id]` | NINGUNO | Proyecto | 🔴 CRÍTICO: sin autenticación en todos los métodos |
| GET/POST | `/api/etapas/[id]` | NO CONFIRMADO | Etapa | Pendiente revisar |
| GET/POST | `/api/manzanas/[id]` | NO CONFIRMADO | Manzana | Pendiente revisar |
| POST | `/api/leads/public` | Ninguno | Lead | 🔴 `asignadoAId` = `findFirst()` sin criterios |
| GET | `/api/admin/health` | `requireAnyRole(["ADMIN","SUPERADMIN"])` | — | ✓ |
| GET/POST | `/api/admin/plans` | `withAdminGuard` | Plan | ✓ |
| GET/PUT/DELETE | `/api/admin/plans/[id]` | `withAdminGuard` | Plan | ✓ |
| GET | `/api/admin/orgs` | `requireAnyRole(["ADMIN","SUPERADMIN"])` | Organization | ✓ |
| PUT | `/api/admin/orgs/[id]/plan` | `requireAnyRole(["ADMIN","SUPERADMIN"])` | Organization, Plan | ✓ |
| GET/PUT | `/api/admin/config` | `requireAnyRole` | SystemConfig | ✓ |
| GET/PATCH | `/api/admin/crm/leads` | `requireAnyRole(["ADMIN","SUPERADMIN"])` | Lead | ✓ |
| POST | `/api/pusher/auth` | Session check manual | — | ⚠️ Duplicado con `/api/realtime/auth` — dos endpoints Pusher auth |
| POST | `/api/realtime/auth` | `getServerSession` | Proyecto, Inversion | ✓ Más completo que `/api/pusher/auth` |
| GET/POST | `/api/webhooks/meta` | HMAC signature | Lead | ⚠️ Crea lead sin orgId |
| POST | `/api/webhooks/tiktok` | NO CONFIRMADO | — | NO CONFIRMADO |
| POST | `/api/webhooks/whatsapp` | NO CONFIRMADO | — | NO CONFIRMADO |
| POST | `/api/cron/*` | `requireCronSecret` | varios | ✓ |
| POST | `/api/logictoop/webhook/[orgId]/[flowId]` | NO CONFIRMADO | LogicToopFlow | NO CONFIRMADO — requiere revisión |
| POST | `/api/upload` | NO CONFIRMADO | — | NO CONFIRMADO |
| POST | `/api/upload/360` | NO CONFIRMADO | — | NO CONFIRMADO |
| POST | `/api/upload/masterplan` | NO CONFIRMADO | — | NO CONFIRMADO |
| GET | `/api/export/projects/[id]/gallery-zip` | NO CONFIRMADO | — | NO CONFIRMADO |
| POST | `/api/upscale` | `requireAuth()` | — | ✓ |
| GET/POST | `/api/crm/pipeline` | NO CONFIRMADO | PipelineEtapa | 1 TODO encontrado en el archivo |
| POST | `/api/crm/tasks` | NO CONFIRMADO | Tarea | NO CONFIRMADO |
| GET/PUT | `/api/proyectos/[id]/etapas` | NO CONFIRMADO | Etapa | NO CONFIRMADO |
| POST | `/api/proyectos/[id]/blueprint/sync` | NO CONFIRMADO | — | NO CONFIRMADO |
| GET/PUT | `/api/proyectos/[id]/overlay` | NO CONFIRMADO | — | NO CONFIRMADO |
| POST | `/api/set-language` | NO CONFIRMADO | — | NO CONFIRMADO |

---

## C) Auth y Authorization

### C1 — NextAuth config

**Archivo:** `lib/auth.ts`

- Provider: `CredentialsProvider` únicamente
- Session: JWT, maxAge 24h
- **PROBLEMA**: El callback `jwt` hace un `prisma.user.findUnique` en CADA request (incluyendo verificación de CRON, Pusher auth, etc.). Esto genera una consulta DB extra en todas las peticiones autenticadas. Para requests muy frecuentes (polling de notificaciones, Pusher auth), esto puede ser un cuello de botella.
- Seguridad positiva: errores genéricos ("Credenciales inválidas") para evitar user enumeration
- La sesión incluye `role`, `orgId`, `kycStatus`, `demoEndsAt` — todos tipados en `types/next-auth.d.ts`

### C2 — Middleware

**Archivo:** `middleware.ts`

- Usa `withAuth` de NextAuth — correcto
- Rate limiting in-memory en middleware para `/api/auth/signin` — ⚠️ no funciona en entornos multi-instancia (Vercel, etc.)
- Guard ADMIN: `pathname.startsWith("/dashboard/admin")` — correcto
- KYC/Demo enforcement: lógica presente para `kycStatus === "NINGUNO"` y `"DEMO_EXPIRADO"`
- El middleware solo protege `/dashboard/:path*`, `/onboarding/:path*`, `/demo-expired` — las rutas `/api/*` dependen de guards internos

### C3 — Guards

Existen DOS sistemas de guards — uno canónico y uno para páginas:

| Archivo | Tipo | Uso correcto | Notas |
|---------|------|-------------|-------|
| `lib/guards.ts` | Server Actions + API Routes | Lanza `AuthError` → `handleGuardError()` / `handleApiGuardError()` | **Fuente de verdad** |
| `lib/auth/guards.ts` | Server Components / page.tsx | Llama `redirect()` en fallo | Diseño correcto — uso separado confirmado |

**Problema detectado**: Varios API routes NO usan `lib/guards.ts` sino que implementan su propio check con `getServerSession()` directo (ver sección B). Esto crea inconsistencias en el manejo de errores y la propagación de orgId.

### C4 — Matriz de permisos por rol

| Recurso | ADMIN/SUPERADMIN | DESARROLLADOR | VENDEDOR | INVERSOR | CLIENTE |
|---------|------------------|---------------|----------|----------|---------|
| Ver todos los proyectos | ✓ | Solo propios | Solo asignados | Solo publicados | Solo publicados |
| Crear proyecto | ✓ | ✓ (plan check) | ✗ | ✗ | ✗ |
| Ver todos los leads | ✓ | Solo org | Solo asignados | ✗ | ✗ |
| Crear lead (CRM) | ✓ | ✓ | ✓ | ✗ | ✗ |
| Aprobar reserva | ✓ | Solo propios | ✗ | ✗ | ✗ |
| Cancelar reserva | ✓ | Si es dueño/vendedor | Si es vendedor | ✗ | ✗ |
| Confirmar venta | ✓ ADMIN sólo | ✗ | ✗ | ✗ | ✗ |
| Invertir | ✓ | ✗ | ✗ | ✓ (KYC) | ✓ (KYC) |
| Aprobar KYC | ✓ | ✗ | ✗ | ✗ | ✗ |
| Gestionar workflows | ✓ | ✓ (plan check) | ✗ | ✗ | ✗ |
| Gestionar LogicToop | ✓ ADMIN sólo | ✗ | ✗ | ✗ | ✗ |
| Acceder API /developments | TODOS (sin auth) | TODOS | TODOS | TODOS | TODOS |

### C5 — Inconsistencias auth

1. **`/api/developments` + `/api/developments/[id]`**: Completamente sin autenticación. Exposición masiva de datos de proyectos, leads y oportunidades.
2. **`/api/unidades/[id]`**: GET, PUT y DELETE sin autenticación. Cualquiera puede modificar o eliminar unidades.
3. **`/api/proyectos` POST**: Sin autenticación — cualquiera puede crear proyectos.
4. **`/api/leads/public` POST**: Sin autenticación + `asignadoAId = findFirst()` — asigna al primer usuario de la DB.
5. **`/api/pusher/auth`**: Duplicado de `/api/realtime/auth` con lógica de autorización más débil (no valida canal con regex).
6. **`getReservas()` action**: No usa `orgFilter` — filtra solo por `vendedorId`/`creadoPorId`. Un desarrollador en org B podría ver reservas de org A si comparte vendedorId (improbable pero posible en migración de datos).
7. **`getAllUnidades()` action**: Usa `getServerSession` directo en lugar de `requireAuth()` canónico.

---

## D) Multi-tenancy / orgId

### D1 — Modelos con orgId (con @index)

| Modelo | Tiene orgId | @index en orgId | Notas |
|--------|-------------|-----------------|-------|
| Organization | — (es el root) | N/A | Root |
| User | ✓ | ✓ (`@@index([orgId])`) | ✓ |
| Proyecto | ✓ | ✓ (`@@index([orgId])`) | ✓ |
| Lead | ✓ | ✓ (`@@index([orgId])`) | ✓ |
| PipelineEtapa | ✓ | ✓ (`@@index([orgId])`) | ✓ |
| Workflow | ✓ | ✓ (`@@index([orgId])`) | ✓ |
| BlogPost | ✓ | ✗ (sin @index) | ⚠️ Falta índice |
| LogicToopFlow | ✓ | ✓ | ✓ |
| LogicToopJob | ✓ (orgId) | ✓ | ✓ |
| IntegrationConfig | ✓ | ✓ (`@@unique([orgId, provider])`) | ✓ |
| LogicToopRecommendation | ✓ | ✓ | ✓ |

### D2 — Modelos sin orgId que potencialmente deberían tenerlo

| Modelo | Situación | Riesgo |
|--------|-----------|--------|
| Reserva | Sin orgId directo — scoped vía `unidad→manzana→etapa→proyecto→orgId` | Lento (N+1 en joins), difícil de filtrar directo |
| Inversion | Sin orgId directo | Similar a Reserva |
| Oportunidad | Sin orgId directo | Scoped vía proyecto |
| KycProfile | Sin orgId — 1:1 con User | OK (userId es suficiente) |
| Banner | Sin orgId directo | Banners son plataforma-level? Verificar |
| Tarea | Sin orgId | ⚠️ Tasks de un vendedor de org A pueden ser vistas si se filtra por proyectoId |
| HistorialUnidad | Sin orgId | Scoped vía unidad |
| Notificacion | Sin orgId | OK — scoped por usuarioId |
| Documentacion | Sin orgId | Scoped vía usuarioId/proyectoId |

### D3 — Queries sin orgFilter detectadas

| Archivo | Función | Problema |
|---------|---------|---------|
| `app/api/unidades/[id]/route.ts` | GET/PUT/DELETE | Sin auth, sin orgFilter |
| `app/api/developments/route.ts` | GET/POST | Sin auth, sin orgFilter |
| `app/api/developments/[id]/route.ts` | GET/PUT/DELETE | Sin auth, sin orgFilter |
| `app/api/leads/public/route.ts` | POST | Sin auth, sin orgId asignado al lead |
| `lib/actions/reservas.ts` → `getReservas()` | Query | Filtra por `vendedorId/creadoPorId` pero no por `orgId` explícito |
| `lib/actions/reservas.ts` → `getUsuariosParaReserva()` | Query | Devuelve TODOS los usuarios de todos los roles sin filtro de org |
| `lib/actions/inversiones.ts` → `crearInversion()` | Query | No verifica que el proyecto pertenezca a la org del inversor |
| `app/api/webhooks/meta/route.ts` | POST | Crea lead con `orgId: null` (sin lookup de org por ad) |

### D4 — Riesgos de performance / N+1

| Archivo | Problema |
|---------|---------|
| `lib/auth.ts` jwt callback | DB query en CADA request autenticado — sin caché |
| `lib/actions/reservas.ts` → `getReservas()` | include profundo: `unidad→manzana→etapa→proyecto` en cada reserva |
| `lib/actions/reservas.ts` → `approveReserva()` | Include completo de reserva + generación de PDF dentro de transaction — PDF en transacción es un anti-patrón |
| `app/api/proyectos/[id]/route.ts` | `flatMap` en memoria para calcular stats — sin aggregation DB |
| `lib/actions/leads.ts` → `bulkCreateLeads()` | Loop con `findFirst` + `create` por cada lead — sin batch insert |

---

## E) Flujos de negocio end-to-end

### E1 — Lead capture → CRM

**Landing público**: `crearLeadLanding()` (lib/actions/leads.ts) → rate-limit (in-memory) → crea Lead con `orgId = SEVENTOOP_MAIN_ORG_ID` (env var) → ⚠️ Si env var no está configurada, `orgId = null`.

**Contacto proyecto**: `crearConsultaContacto()` → hereda `orgId` del proyecto si `proyectoId` presente → fallback a `SEVENTOOP_MAIN_ORG_ID`.

**CRM POST (autenticado)**: `POST /api/crm/leads` → session check manual → hereda orgId de proyecto o sesión → dispara `aiLeadScoring()` (fire-and-forget) → dispara Workflows y LogicToop (fire-and-forget).

**Meta Ads webhook**: `POST /api/webhooks/meta` → HMAC verification ✓ → crea Lead con `orgId: null` ⚠️ → dispara `aiLeadScoring()`.

**Endpoint público legacy**: `POST /api/leads/public` → sin auth → crea lead con `asignadoAId = findFirst()` (primer usuario en DB) → sin orgId.

### E2 — Scoring IA / Workflows / LogicToop

**AI Scoring** (`lib/actions/ai-lead-scoring.ts`): Llamada fire-and-forget desde varios puntos. Usa `@anthropic-ai/sdk`. No tiene plan check.

**Workflows** (`lib/workflow-engine.ts`): Engine lineal. Soporta nodos: `AI_ACTION`, `UPDATE_LEAD`, `CONDITION`, `WEBHOOK`, `WAIT`. El nodo `WAIT` pausa el run pero no hay mecanismo visible de reanudación automática. El WEBHOOK hace `fetch()` directo con datos del lead — sin timeout configurado.

**LogicToop** (`lib/logictoop/dispatcher.ts`): Sistema paralelo más complejo. Dispatcher fire-and-forget con `dispatchTrigger()`. Usa `(db as any).logicToopFlow` — cast inseguro al modelo. Sistema completamente paralelo a Workflows — dos engines de automatización coexistiendo.

### E3 — Reservas → documentos → pagos

1. **Crear reserva**: `createReserva()` o `iniciarReserva()` — dos funciones con lógica similar (ver F7). Transaction atómica que bloquea unidad.
2. **Aprobar reserva**: `approveReserva()` → genera PDF con `generateReservaPDF()` → sube a storage → actualiza DB. ⚠️ La generación de PDF ocurre DENTRO de `$transaction` — si la generación falla después de actualizar la unidad, hay un estado inconsistente difícil de revertir.
3. **Cancelar reserva**: `cancelReserva()` / `cancelarReserva()` (alias) — transaction correcta.
4. **Confirmar venta**: `confirmarVenta()` — solo ADMIN/SUPERADMIN.
5. **Avanzar estado**: `avanzarEstadoReserva()` — cualquier usuario autenticado puede llamarlo sin verificación de propiedad.

**⚠️ Riesgo crítico**: `avanzarEstadoReserva()` en `lib/actions/reservas.ts` (línea 551) solo verifica `requireAuth()` — cualquier usuario autenticado puede cambiar el estado de CUALQUIER reserva.

### E4 — KYC (developer e inversor)

**KYC Developer**: `lib/actions/kyc-actions.ts` — flujo completo con audit log. `submitKycForReview()` → admin usa `reviewDeveloperKyc()` → aprueba/rechaza → notifica vía Pusher + email.

**KYC Inversor**: `lib/actions/kyc.ts` — `getUserKYC()`, `isKycVerifiedOrDemoActive()`. Usa `kycStatus` del usuario directamente.

**Dos archivos KYC de actions**: `lib/actions/kyc.ts` y `lib/actions/kyc-actions.ts` — funcionalidad superpuesta.

### E5 — Realtime (Pusher)

**DOS endpoints de auth Pusher**:
- `/api/pusher/auth` (`app/api/pusher/auth/route.ts`): Instancia Pusher directamente con `PUSHER_KEY` (no `NEXT_PUBLIC_PUSHER_KEY`). Sin validación de canal con regex.
- `/api/realtime/auth` (`app/api/realtime/auth/route.ts`): Usa `getPusherServer()` canónico. Valida canales con regex. Verifica permisos de proyecto e inversión.

**Cliente Pusher**: `authEndpoint: "/api/realtime/auth"` en `lib/pusher.ts` — apunta al correcto.
El endpoint `/api/pusher/auth` parece ser código legacy no usado activamente por el cliente.

**DOS sistemas de notificación**:
- `lib/notifications/send.ts` → `sendNotification()` (función genérica)
- `lib/actions/notifications.ts` → `createNotification()` (con email opcional)
Ambos crean en DB + triggean Pusher. Funcionalidad duplicada.

### E6 — Storage

`lib/storage.ts` — abstracción correcta S3/local. Bloquea local en producción. Usa randomUUID para filenames. La clave de storage puede colisionar teóricamente (UUID + nombre truncado) pero la probabilidad es negligible. No hay validación de MIME type antes de upload — el `contentType` viene del caller.

---

## F) Duplicados y fuentes de verdad

### F1 — Guards duplicados

| Items | Archivos | Diferencia | Impacto | Fuente de verdad recomendada |
|-------|---------|------------|---------|------------------------------|
| `requireAuth()` | `lib/guards.ts` vs `lib/auth/guards.ts` | En guards.ts lanza AuthError; en auth/guards.ts llama `redirect()` | Bajo — separación intencional por tipo de uso | `lib/guards.ts` para actions/APIs; `lib/auth/guards.ts` para pages |
| `withAdminGuard()` | `lib/guards.ts` vs `lib/auth/guards.ts` | `lib/guards.ts` es HOC para API routes (NextRequest); `lib/auth/guards.ts` es genérico para Server Actions | ⚠️ Medio — la versión en auth/guards.ts no devuelve NextResponse | `lib/guards.ts` para APIs |
| `requireRole()` | `lib/guards.ts` (toma `string`) vs `lib/auth/guards.ts` (toma `string[]`) | Firmas diferentes — la de auth/guards acepta array de roles | 🔴 Alto — confusión y mal uso potencial | `lib/guards.ts` para actions |
| Session check manual | `app/api/crm/leads/route.ts`, `lib/actions/unidades.ts`, `lib/actions/inversiones.ts` | Usan `getServerSession(authOptions)` directo en lugar de `requireAuth()` | Medio — no propagan orgId correctamente a veces | Migrar a `requireAuth()` de `lib/guards.ts` |

### F2 — Schemas Zod duplicados

| Contexto | Archivos | Diferencia | Impacto | Fuente de verdad recomendada |
|----------|---------|------------|---------|------------------------------|
| Schema de Lead (crear) | `lib/actions/leads.ts` (`leadSchema`) vs `app/api/crm/leads/route.ts` (`createLeadSchema`) vs `app/api/leads/public/route.ts` (`leadSchema`) | Campos distintos: validaciones de email diferentes, `origen` como enum en uno y string libre en otro | 🔴 Alto — inconsistencia de validación entre action y API | Centralizar en `lib/validations.ts` |
| Schema de Lead (update) | `lib/actions/leads.ts` (`leadUpdateSchema`) vs `app/api/crm/leads/[id]/route.ts` (`updateLeadSchema`) | Campos distintos | Medio | Centralizar |
| Schema de Proyecto (crear) | `lib/actions/proyectos.ts` (`proyectoCreateSchema`) vs `app/api/proyectos/route.ts` (`proyectoCreateSchema`) | Diferente set de campos; API no tiene validación de URL para imagenPortada | Medio | `lib/actions/proyectos.ts` |
| Schema de Plan | `lib/actions/plans.ts` (`planCreateSchema`) vs schema implícito en `lib/actions/plan-actions.ts` | Distintos campos de features (`plan-actions` menciona `ai_scoring`, `importacion_leads` que no están en `plans.ts`) | 🔴 Alto — divergencia de features entre admin y user view | Centralizar `planCreateSchema` y `FREE_FEATURES` |

### F3 — Queries duplicadas

| Contexto | Archivos | Diferencia | Impacto |
|----------|---------|------------|---------|
| Listar proyectos para admin | `lib/actions/proyectos.ts` → `getProyectos()` vs múltiples queries directas en page.tsx | `getProyectos()` filtra PUBLICADO; pages de admin necesitan todos los estados | Medio |
| Listar leads | `lib/actions/leads.ts` → `getLeads()` vs `GET /api/crm/leads` | Diferente paginación (API hardcoded `take: 50`), diferente orgId scoping | Alto |
| Reservas por proyecto | `lib/actions/reservas.ts` tiene `getReservasByProyecto()` Y `getReservasProyecto()` | Misma query, diferente serialización del resultado | 🔴 Alto — código duplicado en el mismo archivo |
| Inventario de unidades (3 páginas) | `app/(dashboard)/dashboard/proyectos/[id]/inventario/page.tsx` vs `developer/proyectos/[id]/inventario/page.tsx` vs `admin/proyectos/[id]/inventario/page.tsx` | Similar funcionalidad con ligeras variaciones de guard | Medio |

### F4 — Constantes duplicadas (roles, estados, triggers)

| Contexto | Archivos | Diferencia | Impacto |
|----------|---------|------------|---------|
| Roles de usuario | Hardcoded como strings en múltiples archivos ("ADMIN", "DESARROLLADOR", etc.) | Sin enum centralizado | Medio — typo en string = bug silencioso |
| Estados de Reserva | Hardcoded como strings ("ACTIVA", "CANCELADA", "VENDIDA", "PENDIENTE_APROBACION", "VENCIDA") | Sin enum centralizado | 🔴 Alto — `check-reservas` cron usa "ACTIVA" pero `createReserva` guarda "PENDIENTE_APROBACION" |
| Estados de Unidad | Hardcoded como strings ("DISPONIBLE", "RESERVADA", "RESERVADA_PENDIENTE", "VENDIDA") | `createReserva()` usa "RESERVADA_PENDIENTE" pero `iniciarReserva()` usa "RESERVADA" directamente | 🔴 Alto — inconsistencia de estado |
| Triggers de Workflow | `lib/workflow-engine.ts` vs `app/api/workflows/route.ts` (schema Zod) | `lib/workflow-engine.ts` acepta cualquier string; schema Zod limita a 4 valores | Medio |
| Features de Plan | `lib/saas/limits.ts` (`FREE_FEATURES`) vs `lib/actions/plan-actions.ts` (features hardcoded) | `plan-actions.ts` lista `ai_scoring`, `importacion_leads` — no están en `FREE_FEATURES` | Alto |

### F5 — Componentes UI duplicados

No confirmados — NO CONFIRMADO sin revisar `components/` completo. Se observa que existen tres páginas de inventario y tres de tour360 posiblemente compartiendo componentes.

### F6 — Endpoints overlapping

| Par de endpoints | Archivos | Solapamiento |
|-----------------|---------|-------------|
| `POST /api/proyectos` vs `POST /api/developments` | `app/api/proyectos/route.ts` vs `app/api/developments/route.ts` | Ambos crean proyectos con schemas distintos — `/api/developments` sin auth |
| `GET /api/proyectos/[id]` vs `GET /api/developments/[id]` | ambos archivos | Ambos devuelven proyectos — `/api/developments/[id]` sin auth |
| `POST /api/pusher/auth` vs `POST /api/realtime/auth` | ambos archivos | Dos endpoints de auth Pusher — legacy vs canónico |
| `POST /api/crm/leads` vs `POST /api/leads/public` | ambos archivos | Ambos crean leads — uno autenticado, otro público (legacy) |

### F7 — Lógica de negocio replicada

| Contexto | Archivos | Diferencia | Impacto |
|----------|---------|------------|---------|
| Crear reserva | `lib/actions/reservas.ts` → `createReserva()` vs `iniciarReserva()` | `createReserva()`: estado unidad="RESERVADA_PENDIENTE", reserva="PENDIENTE_APROBACION". `iniciarReserva()`: estado unidad="RESERVADA", reserva="ACTIVA". Diferente flujo de aprobación. | 🔴 CRÍTICO — dos flujos de reserva en producción |
| Crear reserva (API vs Action) | `lib/actions/reservas.ts` vs `app/api/reservas/route.ts` | POST /api/reservas también crea reservas con transaction similar pero estado diferente | 🔴 CRÍTICO — tres paths para crear una reserva |
| Notificaciones | `lib/notifications/send.ts` → `sendNotification()` vs `lib/actions/notifications.ts` → `createNotification()` | Ambas crean en DB + Pusher. `createNotification` adiciona email opcional. | Alto — duplicado funcional |
| KYC actions | `lib/actions/kyc.ts` vs `lib/actions/kyc-actions.ts` | `kyc.ts`: funciones generales de KYC para inversores. `kyc-actions.ts`: flujo completo de KYC para developers. Funciones de query similares. | Medio |
| Engines de automatización | `lib/workflow-engine.ts` vs `lib/logictoop/dispatcher.ts` | Dos sistemas de automatización paralelos. `runWorkflow()` es simple y lineal. LogicToop es más complejo con condiciones, agentes, etc. | Alto — confusión arquitectural |
| Leads count para plan | `lib/actions/plan-actions.ts` → `getOrgPlanWithUsage()` | Cuenta leads con `{ proyecto: { orgId } }` en lugar de `{ orgId }` directamente — diferente semántica | Alto — puede dar numbers incorrectos |

---

## G) Issues priorizados

### CRÍTICO

| ID | Archivo(s) | Riesgo | Cómo reproducir | Fix recomendado | Esfuerzo | Bloquea prod |
|----|-----------|--------|----------------|-----------------|----------|--------------|
| **SEC-1-new** | `app/api/unidades/[id]/route.ts` | GET/PUT/DELETE sin autenticación — cualquier usuario anónimo puede leer, modificar y eliminar unidades con precio, estado, reservas | `curl -X DELETE https://app.com/api/unidades/{id}` | Agregar `requireAuth()` y orgFilter (via proyecto) en todos los métodos | Bajo | ✓ SÍ |
| **SEC-2-new** | `app/api/developments/route.ts`, `app/api/developments/[id]/route.ts` | Sin autenticación en todos los métodos — expone lista de proyectos con leads y oportunidades, permite crear/editar/eliminar proyectos libremente | `curl https://app.com/api/developments` | Agregar auth guard o deprecar el endpoint en favor de `/api/proyectos` | Bajo | ✓ SÍ |
| **SEC-3-new** | `app/api/proyectos/route.ts` POST | Sin autenticación — cualquiera puede crear proyectos | `curl -X POST https://app.com/api/proyectos -d '{"nombre":"hack"}'` | Agregar `requireAnyRole(["ADMIN","DESARROLLADOR"])` | Bajo | ✓ SÍ |
| **SEC-4-new** | `app/api/leads/public/route.ts` | `asignadoAId = await db.user.findFirst()` — asigna leads al primer usuario de la DB (probablemente admin) sin criterio. Sin orgId en el lead creado. | POST público al endpoint | Reemplazar con `crearConsultaContacto()` server action; eliminar este endpoint o agregar orgId | Bajo | ✓ SÍ |
| **SEC-5-new** | `lib/actions/reservas.ts` → `avanzarEstadoReserva()` | Solo requiere `requireAuth()` — cualquier usuario autenticado puede cambiar el estado de CUALQUIER reserva (incluyendo cancelar ventas o revertir a disponible) | Llamar la acción con ID de reserva ajena | Agregar `requireReservaPermission(reservaId)` o verificación de ownership | Bajo | ✓ SÍ |
| **BUG-1-new** | `lib/actions/reservas.ts` → `createReserva()` vs `iniciarReserva()` | Dos funciones de reserva con estados inconsistentes: `createReserva` → unidad "RESERVADA_PENDIENTE" + reserva "PENDIENTE_APROBACION"; `iniciarReserva` → unidad "RESERVADA" + reserva "ACTIVA". El cron `check-reservas` solo busca `estado: "ACTIVA"` — las reservas creadas con `createReserva` nunca vencerán. | Ver reservas vencidas que no se procesan en cron | Consolidar en una sola función y alinear estados con el cron | Medio | ✓ SÍ |

### ALTO

| ID | Archivo(s) | Riesgo | Fix recomendado | Esfuerzo | Bloquea prod |
|----|-----------|--------|-----------------|----------|--------------|
| **AUTH-1-new** | `lib/auth.ts` jwt callback | DB query en CADA request — cuello de botella en alta carga | Agregar TTL de 30-60s al refetch (solo refetch si `token.iat` > N segundos) | Medio | No |
| **MT-1-new** | `app/api/webhooks/meta/route.ts` | Leads de Meta se crean sin orgId — invisibles para todos los orgs | Agregar `orgId` lookup por `pageId` o configurar `SEVENTOOP_MAIN_ORG_ID` | Bajo | Parcial |
| **MT-2-new** | `lib/actions/reservas.ts` → `getUsuariosParaReserva()` | Devuelve TODOS los usuarios (ADMIN, VENDEDOR, DESARROLLADOR) de TODOS los orgs — fuga de datos cross-tenant | Agregar filtro `orgId: user.orgId` | Bajo | ✓ SÍ |
| **DUP-1-new** | `app/api/pusher/auth/route.ts` | Endpoint legacy de auth Pusher sin validación de canal con regex — permite subscribe a cualquier canal privado con solo tener sesión | Eliminar `/api/pusher/auth`; usar exclusivamente `/api/realtime/auth` | Bajo | No |
| **DUP-2-new** | `lib/actions/reservas.ts` | `getReservasByProyecto()` y `getReservasProyecto()` son cuasi-idénticas en el mismo archivo | Eliminar uno (conservar el que serializa mejor) | Bajo | No |
| **PERF-1-new** | `lib/actions/reservas.ts` → `approveReserva()` | Generación de PDF (`generateReservaPDF()`) ocurre DENTRO de `$transaction` — si la generación tarda >5s, la transaction puede expirar y dejar la unidad en estado inconsistente | Mover `generateReservaPDF()` + `uploadFile()` fuera de la transaction; actualizar DB solo después | Medio | No |
| **PERF-2-new** | `lib/actions/leads.ts` → `bulkCreateLeads()` | Loop N con `findFirst` (dedup check) + `create` por cada lead — O(N) queries. Con 1000 leads = 2000 queries | Usar `prisma.lead.createMany()` con upsert o dedup previo | Bajo | No |
| **SCHEMA-1-new** | Múltiples archivos | Estados de Reserva y Unidad como strings hardcoded sin enum centralizado — `createReserva` usa "RESERVADA_PENDIENTE" pero `iniciarReserva` usa "RESERVADA"; cron busca "ACTIVA" | Crear `lib/constants/estados.ts` con enums | Bajo | No |

### MEDIO

| ID | Archivo(s) | Riesgo | Fix recomendado | Esfuerzo |
|----|-----------|--------|-----------------|----------|
| **SCHEMA-2-new** | `lib/saas/limits.ts` vs `lib/actions/plan-actions.ts` | `FREE_FEATURES` en limits.ts no incluye `ai_scoring` e `importacion_leads` que aparecen en plan-actions.ts | Unificar definición de features | Bajo |
| **SEC-6-new** | `app/(auth)/reset-password/page.tsx` | Token de reseteo en query param URL — puede quedar en logs de servidor, historial de browser, headers `Referer` | Usar campo hidden en form POST o body | Bajo |
| **API-1-new** | `app/api/proyectos/[id]/route.ts` GET | `requireAuth()` sin orgFilter — un usuario de org B con token válido puede leer el detalle completo de proyectos de org A | Agregar orgFilter o verificar `proyecto.orgId === user.orgId` | Bajo |
| **ARCH-1-new** | `lib/workflow-engine.ts` vs `lib/logictoop/` | Dos engines de automatización paralelos sin documentación de cuándo usar cada uno — LogicToop crece en complejidad (agentes, AI, Google Calendar) mientras Workflow es simple | Documentar estrategia; plan de migración Workflow → LogicToop o definir casos de uso separados | Alto |
| **MT-3-new** | `app/api/crm/leads/route.ts` | Usa `session.user as any` para acceder a `orgId` — si el tipo de sesión cambia, bug silencioso | Usar guards canónicos | Bajo |
| **PERF-3-new** | `app/api/proyectos/[id]/route.ts` | Stats calculadas en memoria con flatMap en lugar de COUNT/SUM en DB | Agregar campo `where` con estado y usar `_count` de Prisma | Bajo |
| **BLOG-1-new** | `prisma/schema.prisma` → BlogPost | `BlogPost.orgId` sin `@@index([orgId])` | Agregar `@@index([orgId])` | Bajo |

### BAJO

| ID | Archivo(s) | Riesgo | Fix recomendado |
|----|-----------|--------|-----------------|
| **LINT-1-new** | 1434 warnings en todo el proyecto | `as any` (131 ocurrencias en lib/actions), `no-unused-vars` — acumulación de deuda técnica | Plan incremental de tipado |
| **AUTH-2-new** | `middleware.ts` | Rate limiting in-memory no funciona en multi-instancia (Vercel) | Migrar a Redis/Upstash para rate limit distribuido |
| **WEBHOOK-1-new** | `lib/workflow-engine.ts` → nodo WEBHOOK | `fetch()` sin timeout — un webhook lento puede bloquear el workflow run indefinidamente | Agregar `AbortController` con timeout de 10s |
| **CRON-1-new** | `app/api/cron/check-reservas/route.ts` | El cron historial registra estado anterior como "RESERVADO" (hardcoded) pero el estado real puede ser diferente | Leer estado actual antes de actualizar |
| **TODO-1-new** | `app/api/leads/public/route.ts` | 2 TODOs: "Send email notification to sales rep", "Send confirmation email to lead" | Implementar o eliminar |
| **TODO-2-new** | `app/api/crm/pipeline/route.ts` | 1 TODO encontrado | Revisar |

---

## H) Checklist de Smoke Tests por rol

### ADMIN
- [ ] Login con rol ADMIN → redirect a `/dashboard/admin`
- [ ] Ver lista de organizaciones en `/dashboard/admin`
- [ ] Crear plan en `/dashboard/admin/planes`
- [ ] Asignar plan a org en `/dashboard/admin/orgs/{id}/plan`
- [ ] Ver leads sin orgId en `/dashboard/admin/crm/leads`
- [ ] Aprobar/rechazar KYC developer en `/dashboard/admin/kyc`
- [ ] Confirmar venta (única acción reservada a ADMIN) vía reservas
- [ ] Acceder a `/dashboard/admin/logictoop` (LogicToop builder)
- [ ] Verificar que `/api/admin/health` responde 200

### DESARROLLADOR
- [ ] Login → redirect a `/dashboard/developer`
- [ ] Crear proyecto → verificar plan limit aplicado
- [ ] Ver leads de su org únicamente (no de otras orgs)
- [ ] Crear lead desde CRM
- [ ] Ver pipeline kanban en `/dashboard/crm/pipeline`
- [ ] Crear reserva para una unidad DISPONIBLE
- [ ] Aprobar reserva propia → PDF generado → URL guardado
- [ ] Cancelar reserva propia
- [ ] Verificar que NO puede ver reservas de otra org
- [ ] Completar KYC developer en `/dashboard/developer/mi-perfil/kyc`
- [ ] Crear workflow → verificar plan check `workflows`
- [ ] Importar leads en bulk

### VENDEDOR
- [ ] Login → verificar redirect correcto
- [ ] Ver leads asignados
- [ ] Crear lead
- [ ] Iniciar reserva
- [ ] Verificar que NO puede confirmar venta (solo ADMIN)

### INVERSOR
- [ ] Login → redirect a `/dashboard/portafolio`
- [ ] Ver proyectos disponibles para invertir
- [ ] Intentar invertir sin KYC → recibir error 403
- [ ] Completar KYC inversor
- [ ] Invertir en proyecto con KYC aprobado
- [ ] Ver cartera en `/dashboard/portafolio`

### CLIENTE
- [ ] Login → redirect a `/dashboard` o cliente
- [ ] Ver proyectos públicos
- [ ] NO poder acceder a `/dashboard/admin` → redirect a dashboard
- [ ] NO poder acceder a `/dashboard/developer` (si aplica)

### ANÓNIMO (pruebas de seguridad)
- [ ] `GET /api/developments` → 🔴 ACTUALMENTE EXPUESTO — debería ser 401
- [ ] `PUT /api/unidades/{id}` → 🔴 ACTUALMENTE EXPUESTO — debería ser 401
- [ ] `DELETE /api/unidades/{id}` → 🔴 ACTUALMENTE EXPUESTO — debería ser 401
- [ ] `POST /api/proyectos` → 🔴 ACTUALMENTE EXPUESTO — debería ser 401
- [ ] `POST /api/leads/public` → público intencional — verificar que orgId sea null y no asigne admin
- [ ] Acceder a `/dashboard/admin` sin sesión → redirect a login

---

## I) Apéndice técnico

### I1 — Modelos Prisma y jerarquía

```
Organization
├── User (orgId?)
├── Proyecto (orgId?)
│   ├── Etapa
│   │   └── Manzana
│   │       └── Unidad
│   │           ├── Reserva (+ Lead, Vendedor/User)
│   │           └── Hotspot (TourScene)
│   ├── Tour360
│   │   └── TourScene
│   │       └── Hotspot
│   ├── Lead (orgId? — directo, redundante con Proyecto)
│   ├── Oportunidad (Lead + Proyecto + Unidad?)
│   ├── Inversion (User inversor)
│   ├── Banner (via Pago)
│   ├── ProjectFeatureFlags (1:1)
│   └── proyecto_archivos
├── Lead (orgId? — plataforma level)
├── PipelineEtapa
├── Workflow
│   ├── WorkflowNodo
│   └── WorkflowRun → WorkflowRunPaso
├── LogicToopFlow
│   ├── LogicToopExecution → LogicToopJob
│   └── LogicToopRecommendation (sourceFlow)
├── LogicToopTemplate (sin orgId — global)
├── IntegrationConfig
├── BlogPost (orgId?)
└── Plan (global)
```

**Enums de facto (sin enum Prisma declarado)**:
- `User.rol`: ADMIN, SUPERADMIN, DESARROLLADOR, VENDEDOR, INVERSOR, CLIENTE
- `User.kycStatus`: PENDIENTE, EN_REVISION, APROBADO, RECHAZADO, VERIFICADO, NINGUNO, DEMO_EXPIRADO
- `Unidad.estado`: DISPONIBLE, RESERVADA, RESERVADA_PENDIENTE, VENDIDA, BLOQUEADA
- `Reserva.estado`: ACTIVA, PENDIENTE_APROBACION, CANCELADA, VENDIDA, VENCIDA
- `LogicToopFlow.status`: DRAFT, TESTING, ACTIVE, PAUSED, ARCHIVED (único enum tipado en schema)

### I2 — Integraciones y estado

| Integración | Estado | Notas |
|-------------|--------|-------|
| NextAuth (Credentials) | ✓ Productivo | JWT con DB refetch en cada request |
| Prisma + PostgreSQL | ✓ Productivo | Port 5433 en dev |
| Pusher | ✓ Graceful degradation | Dos endpoints auth (legacy + canónico) |
| AWS S3 / local | ✓ Productivo | Local block en producción |
| Resend (email) | ✓ Con feature flag | Fallback log si deshabilitado |
| Anthropic AI | ✓ Fire-and-forget | Sin plan check en scoring |
| OpenAI | NO CONFIRMADO | Importado en `lib/actions/ai*.ts` |
| Meta Webhook | ✓ Con HMAC | ⚠️ Lead sin orgId |
| TikTok Webhook | NO CONFIRMADO | Archivo existe |
| WhatsApp Webhook | NO CONFIRMADO | Archivo existe |
| Google Calendar | ✓ Parcial | `lib/actions/google-calendar-actions.ts`, `IntegrationConfig` model |
| LogicToop (interno) | En desarrollo | Docs no públicos; muchos as any |
| Sentry | NO CONFIRMADO en código | Mencionado en stack |

### I3 — TODOs críticos encontrados

| Archivo | Línea | Contenido |
|---------|-------|-----------|
| `app/api/leads/public/route.ts` | ~80 | `// TODO: Send email notification to sales rep` |
| `app/api/leads/public/route.ts` | ~81 | `// TODO: Send confirmation email to lead` |
| `app/api/crm/pipeline/route.ts` | ~1 | TODO encontrado (contenido no confirmado) |
| `lib/logictoop/scheduler.ts` | ~1 | @ts-ignore encontrado |

---

## J) Resultado de herramientas

### TypeScript (`npm run typecheck`)
**Resultado: ✅ PASA — 0 errores**
```
> tsc --noEmit --skipLibCheck
(sin output — compilación exitosa)
```

### ESLint (`npm run lint`)
**Resultado: ⚠️ WARNINGS SOLAMENTE — 0 errores, ~1434 warnings**

Categorías de warnings:
- `@typescript-eslint/no-explicit-any`: 131 ocurrencias en `lib/actions/` — mayor concentración en `lib/actions/ai.ts` (17), `lib/actions/reservas.ts` (10), `lib/actions/proyectos.ts` (12)
- `@typescript-eslint/no-unused-vars`: Múltiples archivos — catch blocks con `error` no usado
- `@typescript-eslint/no-unused-vars` en imports: `lib/upload-utils.ts` (`z` importado sin usar)
- Concentración más alta en `lib/logictoop/` — sistema más nuevo con mayor deuda técnica

### Build (`npm run build`)
**Resultado: ✅ PASA — build exitoso**

Todas las rutas compiladas correctamente. Build produce bundle dinámico (SSR on demand). Sin errores de compilación. Solo warnings de ESLint incluidos en el output del build.
