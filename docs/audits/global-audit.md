# Auditoría Técnica Global — SevenToop

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL · NextAuth v4 · Zustand · Pusher · S3/Local · Radix UI · Tailwind · Framer Motion · Sentry
**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Tipo:** Solo lectura — sin modificaciones

---

## Índice

- [A) Mapa de Rutas Completo](#a-mapa-de-rutas-completo)
- [B) Mapa de Guards y Middleware](#b-mapa-de-guards-y-middleware)
- [C) Flujo End-to-End](#c-flujo-end-to-end)
- [D) Duplicados y Fuentes de Verdad](#d-duplicados-y-fuentes-de-verdad)
- [E) Issues Priorizados](#e-issues-priorizados)
- [F) Checklist de Smoke Tests por Rol](#f-checklist-de-smoke-tests-por-rol)

---

## A) Mapa de Rutas Completo

### Rutas Públicas — sin autenticación

| Ruta | Archivo | Guard | Server Actions / API | Notas |
|------|---------|-------|---------------------|-------|
| `/` | `app/(public)/page.tsx` | — | `getBannersLanding()`, `getProyectosDestacados()`, `getSystemConfig()` | Landing principal, lead capture |
| `/proyectos` | `app/(public)/proyectos/page.tsx` | — | `getProjects()` local (raw SQL count) | Solo PUBLICADO + demo válido |
| `/proyectos/[slug]` | `app/(public)/proyectos/[slug]/page.tsx` | — | `getProject()` local | visibilityStatus=PUBLICADO |
| `/proyectos/[slug]/unidades/[id]` | `app/(public)/proyectos/[slug]/unidades/[id]/page.tsx` | — | `getUnit()` local | ⚠️ Sin check proyecto.visibilityStatus |
| `/proyectos/[slug]/masterplan` | `app/(public)/proyectos/[slug]/masterplan/page.tsx` | — | `getProject()` | SVG paths no persistidos en DB |
| `/proyectos/[slug]/tour360` | `app/(public)/proyectos/[slug]/tour360/page.tsx` | — | `getProjectWithTour()` | ✓ Valida visibilityStatus |
| `/buscar` | `app/(public)/buscar/page.tsx` | — | — | Redirect a /proyectos |
| `/blog` | `app/(public)/blog/page.tsx` | — | `getNoticias()` | pageSize=20, sin paginación UI |
| `/blog/[slug]` | `app/(public)/blog/[slug]/page.tsx` | — | `getNoticia(slug)` | Sin metadata SEO dinámica |
| `/desarrolladores` | `app/(public)/desarrolladores/page.tsx` | — | — | 100% estático |
| `/contacto` | `app/(public)/contacto/page.tsx` | — | `crearConsultaContacto()` | ContactForm → server action |
| `/demo-expired` | `app/(public)/demo-expired/page.tsx` | — | — | Redirect destino del middleware |
| `/legal/terminos` | `app/(public)/legal/terminos/page.tsx` | — | — | Estático |
| `/legal/privacidad` | `app/(public)/legal/privacidad/page.tsx` | — | — | Estático |

### Rutas Auth — sin sesión requerida

| Ruta | Archivo | Guard | Notas |
|------|---------|-------|-------|
| `/login` | `app/(auth)/login/page.tsx` | — | Redirect por rol post-login; "recuérdame" en localStorage |
| `/register` | `app/(auth)/register/page.tsx` | — | Whitelist DESARROLLADOR/VENDEDOR/INVERSOR; resto → CLIENTE |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | — | `requestPasswordReset()` server action |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | — | Token en URL query param ⚠️; `resetPassword()` server action |

### Dashboard — autenticado

| Ruta | Archivo | Rol | Guard | Server Actions | Notas |
|------|---------|-----|-------|----------------|-------|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | ALL | `getServerSession()` | — | Dispatch por rol: ADMIN→/admin, DEV→/developer, CLIENTE/INVERSOR→/portafolio |

### Admin (`/dashboard/admin/*`)

| Ruta | Archivo | Guard | Server Actions | Notas |
|------|---------|-------|----------------|-------|
| `/dashboard/admin` | `admin/page.tsx` | `requireRole("ADMIN")` | `getAdminDashboardData()`, `getHealthStatus()` | Stats globales, audit logs, health checks |
| `/dashboard/admin/users` | `admin/users/page.tsx` | Middleware | — | Gestión usuarios |
| `/dashboard/admin/proyectos` | `admin/proyectos/page.tsx` | Middleware | — | ALL proyectos sin filtro org |
| `/dashboard/admin/proyectos/new` | `admin/proyectos/new/page.tsx` | Middleware | `createProyecto()` | — |
| `/dashboard/admin/proyectos/[id]` | `admin/proyectos/[id]/page.tsx` | Middleware | — | — |
| `/dashboard/admin/proyectos/[id]/inventario` | `inventario/page.tsx` | Middleware | — | — |
| `/dashboard/admin/proyectos/[id]/tour360` | `tour360/page.tsx` | Middleware | — | — |
| `/dashboard/admin/kyc` | `admin/kyc/page.tsx` | Middleware | `getPendingDeveloperKyc()`, `reviewDeveloperKyc()` | Aprobación KYC developers |
| `/dashboard/admin/crm/leads` | `admin/crm/leads/page.tsx` | Middleware | — | CRM admin global |
| `/dashboard/admin/pagos` | `admin/pagos/page.tsx` | Middleware | — | Gestión pagos |
| `/dashboard/admin/planes` | `admin/planes/page.tsx` | Middleware | `getOrgPlans()`, `createPlan()`, `updatePlan()` | SaaS plans |
| `/dashboard/admin/banners` | `admin/banners/page.tsx` | Middleware | — | Moderación banners |
| `/dashboard/admin/blog` | `admin/blog/page.tsx` | Middleware | — | Moderación blog |
| `/dashboard/admin/testimonios` | `admin/testimonios/page.tsx` | Middleware | — | Moderación testimonios |
| `/dashboard/admin/configuracion` | `admin/configuracion/page.tsx` | Middleware | — | SystemConfig key-values |
| `/dashboard/admin/riesgos` | `admin/riesgos/page.tsx` | Middleware | `updateUserRiskLevel()` | Evaluación riesgo |
| `/dashboard/admin/notifications` | `admin/notifications/page.tsx` | Middleware | — | Gestión notificaciones |

### Developer/Vendedor (`/dashboard/developer/*`)

| Ruta | Archivo | Guard | Server Actions | Notas |
|------|---------|-------|----------------|-------|
| `/dashboard/developer` | `developer/page.tsx` | Middleware | `getDeveloperDashboardData()`, `getOrgPlanWithUsage()` | Dashboard con stats y KYC status |
| `/dashboard/developer/proyectos` | `developer/proyectos/page.tsx` | Middleware | — | Proyectos propios (orgFilter) |
| `/dashboard/developer/proyectos/new` | `developer/proyectos/new/page.tsx` | Middleware | `createProyecto()` | — |
| `/dashboard/developer/proyectos/[id]` | `developer/proyectos/[id]/page.tsx` | Middleware | — | Detalle + tabs |
| `/dashboard/developer/proyectos/[id]/inventario` | `inventario/page.tsx` | Middleware | — | — |
| `/dashboard/developer/proyectos/[id]/tour360` | `tour360/page.tsx` | Middleware | — | — |
| `/dashboard/developer/leads` | `developer/leads/page.tsx` | Middleware | `getLeads()` (filtrado por asignadoAId) | — |
| `/dashboard/developer/crm/pipeline` | `developer/crm/pipeline/page.tsx` | Middleware | `getPipelineEtapas()`, `createPipelineEtapa()` | Kanban CRM |
| `/dashboard/developer/crm/metricas` | `developer/crm/metricas/page.tsx` | Middleware | — | Métricas CRM |
| `/dashboard/developer/oportunidades` | `developer/oportunidades/page.tsx` | Middleware | — | Oportunidades comerciales |
| `/dashboard/developer/reservas` | `developer/reservas/page.tsx` | Middleware | `getReservas()` | Reservas propias |
| `/dashboard/developer/banners` | `developer/banners/page.tsx` | Middleware | — | Banners propios |
| `/dashboard/developer/mi-perfil` | `developer/mi-perfil/page.tsx` | Middleware | — | Perfil usuario |
| `/dashboard/developer/mi-perfil/kyc` | `developer/mi-perfil/kyc/page.tsx` | Middleware | `getKycProfile()`, `saveKycProfile()`, `submitKycForReview()` | KYC wizard |
| `/dashboard/developer/planes` | `developer/planes/page.tsx` | Middleware | `getOrgPlans()` | Planes org |
| `/dashboard/developer/configuracion` | `developer/configuracion/page.tsx` | Middleware | — | Config org |

### Portafolio — Inversor/Cliente (`/dashboard/portafolio/*`)

| Ruta | Archivo | Guard | Server Actions | Notas |
|------|---------|-------|----------------|-------|
| `/dashboard/portafolio` | `portafolio/page.tsx` | `requireAuth()` + role check | `getInversorDashboardData()`, `getInvestmentOpportunities()` | Dashboard unificado inversor+cliente |
| `/dashboard/portafolio/inversiones` | `inversiones/page.tsx` | Middleware | `getInversiones()` | Mis inversiones |
| `/dashboard/portafolio/wallet` | `wallet/page.tsx` | Middleware | `getWallet()`, `requestWithdrawal()` | Wallet + movimientos |
| `/dashboard/portafolio/propiedades` | `propiedades/page.tsx` | Middleware | — | Unidades como responsable |
| `/dashboard/portafolio/propiedades/[id]` | `propiedades/[id]/page.tsx` | Middleware | — | Detalle propiedad |
| `/dashboard/portafolio/marketplace` | `marketplace/page.tsx` | Middleware | `getMarketplaceListings()` | Mercado secundario |
| `/dashboard/portafolio/favoritos` | `favoritos/page.tsx` | Middleware | `getFavoritos()` | Proyectos favoritos |
| `/dashboard/portafolio/kyc` | `kyc/page.tsx` | Middleware | `getInversorKycProfile()` | KYC inversor |
| `/dashboard/portafolio/configuracion` | `configuracion/page.tsx` | Middleware | — | Settings inversor |

### Shared Dashboard

| Ruta | Archivo | Guard | Server Actions | Notas |
|------|---------|-------|----------------|-------|
| `/dashboard/proyectos` | `dashboard/proyectos/page.tsx` | Middleware | `getProyectos()` (user scoped) | Según rol: DEV ve own, ADMIN ve all |
| `/dashboard/proyectos/[id]` | `dashboard/proyectos/[id]/page.tsx` | `creadoPorId === userId OR ADMIN` | — | — |
| `/dashboard/proyectos/[id]/inventario` | `inventario/page.tsx` | Middleware | — | — |
| `/dashboard/proyectos/[id]/tour360` | `tour360/page.tsx` | Middleware | — | — |
| `/dashboard/leads` | `dashboard/leads/page.tsx` | Middleware | `getLeads()` | Leads CRM central |
| `/dashboard/reservas` | `dashboard/reservas/page.tsx` | Middleware | `getReservas()` | Reservas centrales |
| `/dashboard/reservas/[id]` | `dashboard/reservas/[id]/page.tsx` | Middleware | — | Detalle reserva |
| `/dashboard/masterplan` | `dashboard/masterplan/page.tsx` | Middleware | — | Visor masterplan admin |
| `/dashboard/banners` | `dashboard/banners/page.tsx` | Middleware | — | — |
| `/dashboard/testimonios` | `dashboard/testimonios/page.tsx` | Middleware | — | — |
| `/dashboard/workflows` | `dashboard/workflows/page.tsx` | Middleware | `getWorkflows()`, `createWorkflow()` | Automation engine |
| `/dashboard/crm` | `dashboard/crm/page.tsx` | Middleware | — | CRM central |
| `/dashboard/kyc` | `dashboard/kyc/page.tsx` | Middleware | — | — |
| `/dashboard/configuracion` | `dashboard/configuracion/page.tsx` | Middleware | — | Settings user |
| `/dashboard/cliente` | `dashboard/cliente/page.tsx` | Middleware | — | **Deprecated** → redirect /portafolio |

---

## B) Mapa de Guards y Middleware

### Guards disponibles (`lib/guards.ts`)

| Guard | Propósito | Retorno si falla |
|-------|-----------|-----------------|
| `requireAuth()` | Valida JWT sesión, retorna AuthUser (id, email, role, orgId, kycStatus, demoEndsAt) | `AuthError(401)` |
| `requireRole(role)` | Rol exacto requerido | `AuthError(403)` |
| `requireAnyRole(roles[])` | Uno de varios roles | `AuthError(403)` |
| `requireProjectOwnership(projectId)` | creadoPorId === user.id + orgId match, ADMIN bypass | `AuthError(403/404)` |
| `requireNotificationOwnership(notifId)` | usuarioId === user.id, ADMIN bypass | `AuthError(403/404)` |
| `requireReservaPermission(reservaId)` | vendedorId === user.id OR project owner, multi-tenant check | `AuthError(403/404)` |
| `requireKYC()` | kycStatus === APROBADO OR VERIFICADO | `AuthError(403)` |
| `requireOrgAccess(orgId)` | user.orgId === orgId OR ADMIN/SUPERADMIN | `AuthError(403)` |
| `requireCronSecret(request)` | Header x-cron-secret === env.CRON_SECRET | `AuthError(401/405)` |
| `orgFilter(user)` | Helper Prisma WHERE: ADMIN→{}, sin org→nada, con org→{orgId:user.orgId} | N/A (helper) |
| `handleGuardError(error)` | Wraps AuthError → `{success:false, error}` para server actions | — |
| `handleApiGuardError(error)` | Wraps AuthError → NextResponse(status) para API routes | — |
| `withAdminGuard(handler)` | HOC: ADMIN/SUPERADMIN only, retorna NextResponse | `NextResponse(403)` |

### Guards alternativos (`lib/auth/guards.ts`) — **DUPLICADO**

Subset de `lib/guards.ts` con `redirect()` en vez de `throw`. Crea inconsistencia según contexto.

### Middleware (`middleware.ts`) — matcher: `/dashboard/*`, `/onboarding/*`, `/demo-expired`

| Protección | Trigger | Acción |
|-----------|---------|--------|
| JWT Auth | Sin token | `redirect("/login")` |
| Role-based `/admin` | role ≠ ADMIN/SUPERADMIN | `redirect("/dashboard")` |
| Rate limit login | >10 intentos/15min por IP (in-memory) | `429 Too Many Requests` |
| KYC enforcement | kycStatus=NINGUNO + demoEndsAt < now | `redirect("/onboarding/kyc")` |
| Demo expirado | kycStatus=DEMO_EXPIRADO | `redirect("/demo-expired")` |

### Endpoints / Actions expuestos o con guard insuficiente

| Severidad | Endpoint / Acción | Archivo | Problema |
|-----------|-------------------|---------|---------|
| 🔴 CRÍTICO | `PUT /api/proyectos/[id]` | `app/api/proyectos/[id]/route.ts` | Sin `requireProjectOwnership()` en PUT; GET sí lo tiene |
| 🔴 CRÍTICO | `GET /api/crm/leads/[id]` | `app/api/crm/leads/[id]/route.ts` | Solo valida sesión, no verifica ownership del lead |
| 🔴 CRÍTICO | `POST /api/leads/public` | `app/api/leads/public/route.ts` | Rate limit solo in-memory; sin CAPTCHA |
| 🔴 CRÍTICO | Reservas — race condition | `lib/actions/reservas.ts` | Sin SELECT FOR UPDATE en check de disponibilidad |
| 🟠 ALTO | `POST /api/pusher/auth` | `app/api/pusher/auth/route.ts` | Autoriza canales sin validar permisos de org/project |
| 🟠 ALTO | `GET /api/proyectos/[id]` | `app/api/proyectos/[id]/route.ts` | Sin validar visibilityStatus=PUBLICADO en endpoint público |
| 🟠 ALTO | Notificaciones API | `app/api/notifications/route.ts` | Sin rate limit para polling abuse |
| 🟠 ALTO | `GET/PUT /api/workflows/[id]` | `app/api/workflows/` | Sin verificación de orgId |
| 🟠 ALTO | `POST /api/crm/pipeline` | `app/api/crm/pipeline/` | Sin `requireOrgAccess()` |
| 🟡 MEDIO | `app/(public)/proyectos/[slug]/unidades/[id]/page.tsx` | Page | Sin check de `proyecto.visibilityStatus=PUBLICADO` |

---

## C) Flujo End-to-End

```
════════════════════════════════════════════════════════════════
1. CAPTURA DE LEAD — LANDING
════════════════════════════════════════════════════════════════

[Browser] GET /
  ↓
[Server] app/(public)/page.tsx
  ├─ getBannersLanding()     → DB.Banner {estado=ACTIVO}
  ├─ getProyectosDestacados() → DB.Proyecto {PUBLICADO, demo válido}  [raw SQL count]
  └─ getSystemConfig()       → DB.SystemConfig {HERO_TITLE, etc.}
  ↓
[Client] FormularioCaptura (components/public/formulario-captura.tsx)
  ├─ Schema: nombre, whatsapp, provincia, ciudad, zona, intencion,
  │          categoriaProyecto, subtipoProyecto, presupuesto min/max
  └─ crearLeadLanding() [lib/actions/leads.ts] (NO auth, NO rate limit)
      ├─ Busca proyecto relacionado por ubicación
      ├─ Genera mensaje formateado + JSON metadata {zona, intencion, presupuesto, ...}
      └─ DB.lead.create {nombre, telefono=whatsapp, origen="formulario_landing",
                         canalOrigen="WEB", mensaje, notas=JSON, estado="NUEVO"}
          ⚠️ Sin orgId  ⚠️ Sin pipelineEtapaId  ⚠️ Sin rate limit

[Client] ContactForm (components/public/contact-form.tsx) — usado en /proyectos y /contacto
  ├─ Schema: nombre, email, telefono, mensaje
  └─ crearConsultaContacto() [lib/actions/leads.ts]
      ├─ Rate limit: NINGUNO
      └─ DB.lead.create {nombre, email, telefono, proyectoId, origen, canalOrigen="WEB"}

════════════════════════════════════════════════════════════════
2. LEAD EN DB → SCORING IA → WORKFLOWS
════════════════════════════════════════════════════════════════

[DB] Lead {estado="NUEVO", asignadoAId=null|firstUser, orgId=null}
  ↓
[Async] aiLeadScoring(lead.id) [lib/actions/ai-lead-scoring.ts]
  ├─ Llama Anthropic/OpenAI con datos del lead
  ├─ Score 0-100 + summary
  └─ DB.lead.update {aiQualificationScore, lastAiSummary}
  ↓
[Async] runWorkflow("NEW_LEAD", lead.id) [lib/workflow-engine.ts]
  ├─ Busca workflows activos con trigger="NEW_LEAD" (org filter)
  └─ Ejecuta nodos: UPDATE_LEAD, CONDITION, WEBHOOK, WAIT

════════════════════════════════════════════════════════════════
3. DEVELOPER VE LEAD → CRM → OPORTUNIDAD
════════════════════════════════════════════════════════════════

[Auth] /dashboard/developer [middleware.ts]
  ├─ JWT válido
  └─ role ∈ {DESARROLLADOR, VENDEDOR}
  ↓
[Server] app/(dashboard)/dashboard/developer/page.tsx
  ├─ requireAuth() [lib/guards.ts]
  └─ getDeveloperDashboardData() → stats (leads, reservas, conversión, revenue)
  ↓
[Server] /dashboard/developer/leads
  └─ getLeads({page, pageSize, search}) [lib/actions/leads.ts]
      ├─ WHERE: asignadoAId=user.id OR proyecto.creadoPorId=user.id
      └─ Return: leads paginados con proyecto.nombre, asignadoA.nombre
  ↓
[Client] LeadDetailModal (components/crm/lead-detail-modal.tsx)
  ├─ Mostrar: datos, notas, AI score, oportunidades
  ├─ updateLead() → cambiar estado, notas, asignación
  └─ createOportunidad() → Oportunidad {leadId, proyectoId, unidadId, etapa, probabilidad}

[Client] KanbanBoard (components/crm/kanban-board.tsx)
  ├─ Columnas = PipelineEtapa del developer
  └─ Drag & drop → updateLead({pipelineEtapaId})

════════════════════════════════════════════════════════════════
4. RESERVA → CONFIRMACIÓN → PAGO
════════════════════════════════════════════════════════════════

[Server] createReserva(unidadId, leadId, montoSena) [lib/actions/reservas.ts]
  ├─ requireAuth() + requireKYC()   ← seller debe tener KYC APROBADO
  ├─ ⚠️ Check: unidad.estado === "DISPONIBLE"  (SIN transacción atómica)
  ├─ DB.reserva.create {unidadId, leadId, vendedorId, estado="ACTIVA"}
  ├─ DB.unidad.update {estado="RESERVADA"}
  ├─ DB.historialUnidad.create (audit trail)
  ├─ createNotification(user) [lib/notifications/send.ts]
  └─ getPusherServer().trigger("reservas", "reserva:created", data)
  ↓
[Server] confirmVenta(reservaId, precioFinal) [lib/actions/reservas.ts]
  ├─ requireAuth() + requireReservaPermission(reservaId)
  ├─ generatePDF() [lib/pdf-generator.ts]
  ├─ uploadFile() [lib/storage.ts] → S3 o local
  ├─ DB.reserva.update {estado="CONFIRMADA", documentoGenerado=url}
  └─ DB.pago.create {monto=montoSena, estado="PENDIENTE"}
      ⚠️ NO hay integración con pasarela de pagos

════════════════════════════════════════════════════════════════
5. ADMIN MONITOREA GLOBAL
════════════════════════════════════════════════════════════════

[Server] /dashboard/admin [requireRole("ADMIN")]
  └─ getAdminDashboardData()
      ├─ Counts: leads/week, reservas, inversiones, KYC queue, pagos
      ├─ Financials: globalVolume, platformRevenue, totalEscrow
      ├─ recentUsers (last 10), auditLogs (last 20)
      └─ healthStatus: DB, Storage, Pusher, WhatsApp connectivity

[Server] /dashboard/admin/kyc [requireRole("ADMIN")]
  ├─ getPendingDeveloperKyc() → KycProfile {estado=EN_REVISION}
  └─ reviewDeveloperKyc(kycId, decision)
      ├─ DB.kycProfile.update {estado}
      ├─ DB.user.update {kycStatus, developerVerified}
      └─ createNotification(developer)

════════════════════════════════════════════════════════════════
6. INVERSOR — PORTAFOLIO
════════════════════════════════════════════════════════════════

[Auth] /dashboard/portafolio [middleware.ts]
  └─ role ∈ {INVERSOR, CLIENTE} + requireKYC() (para inversiones)
  ↓
[Server] getInvestmentOpportunities() → Proyectos {invertible=true, PUBLICADO}
[Server] getInversiones()             → Inversion[] del user
[Server] getWallet()                  → saldo, movimientos
  ↓
[Client] InvestmentCheckout (components/dashboard/inversor/investment-checkout.tsx)
  └─ createInversion(proyectoId, m2) [lib/actions/inversiones.ts]
      ├─ requireAuth() + requireKYC()
      ├─ enforceLimit(orgId, "inversiones") [lib/saas/limits.ts]
      ├─ calculateInvestmentProjection(m2, precioCosto, precioMercado)
      └─ DB.inversion.create {userId, proyectoId, m2, montoInvertido, estado="ACTIVA"}
```

---

## D) Duplicados y Fuentes de Verdad

### Lógica duplicada

| Área | Duplicación | Archivos | Impacto |
|------|------------|---------|--------|
| Lead filtering | Filtrado por role/owner replicado en 3 lugares | `lib/actions/leads.ts`, `app/api/crm/leads/route.ts`, `leads-table.tsx` (client) | Inconsistencia en resultados |
| Proyecto queries | `getProyectos()` replicado en 4 lugares | `lib/actions/proyectos.ts`, `app/api/proyectos/route.ts`, `proyectos/page.tsx` (public), `proyectos/page.tsx` (dashboard) | N+1 risk, filtros inconsistentes |
| KYC status checks | Validación en 5 lugares | `middleware.ts`, `lib/guards.ts`, `lib/auth.ts`, `developer/page.tsx`, `portafolio/page.tsx` | N+1 DB hits |
| Reserva auth | `requireReservaPermission()` + WHERE inline en getReservas() | `lib/guards.ts`, `lib/actions/reservas.ts` | — |
| Zod leadSchema | Definido en 3 archivos | `app/api/leads/public/route.ts`, `lib/actions/leads.ts`, `app/api/crm/leads/[id]/route.ts` | Drift entre schemas |
| Guards | 2 archivos con implementaciones distintas | `lib/guards.ts` (throw), `lib/auth/guards.ts` (redirect) | Comportamiento inconsistente por contexto |

### Múltiples fuentes de verdad

| Entidad | Problema | Archivos |
|---------|---------|---------|
| **Roles** | Hardcodeados como strings en 5+ lugares | `register/route.ts`, `middleware.ts`, `login/page.tsx`, `kyc-actions.ts`, `guards.ts` |
| **KycStatus** | String libre, no Enum Prisma | `prisma/schema.prisma`, `middleware.ts`, `guards.ts`, `kyc-actions.ts`, `auth.ts` |
| **Unidad.estado** | String libre con valores inconsistentes ("RESERVADA" vs "RESERVADO") | `prisma/schema.prisma`, `lib/actions/reservas.ts`, `lib/actions/unidades.ts` |
| **Project visibility** | Tres flags: `visibilityStatus + deletedAt + isDemo + demoExpiresAt` | Queries en público y dashboard aplican distintas combinaciones |
| **Lead assignment** | Sin `Lead.orgId` — se deriva via JOIN a proyecto | `prisma/schema.prisma`, `lib/actions/leads.ts` |
| **Workflow triggers** | Strings hardcodeados: "NEW_LEAD", "NEW_INVESTMENT" | `lib/workflow-engine.ts`, `lib/actions/crm-actions.ts` |

### Inconsistencias detectadas

| Área | Inconsistencia | Archivos |
|------|---------------|---------|
| Paginación | `pageSize` max=100 en validations, pero endpoints admiten más | `lib/validations.ts`, varios `route.ts` |
| Email validation | Lenient en `/api/leads/public`, strict en `/auth/register` | Dos API routes |
| Timestamp format | `createdAt` a veces ISO string, a veces Date object en payloads | Múltiples actions |
| Error idioma | Mezcla español/inglés en mensajes de error | Guards, routes, actions |
| `session.user` typing | Múltiples `(session?.user as any)` casts | Múltiples pages del dashboard |

---

## E) Issues Priorizados

### 🔴 CRÍTICO

#### C1 — Sin ownership check en PUT `/api/proyectos/[id]`
- **Archivo:** `app/api/proyectos/[id]/route.ts`
- **Riesgo:** Cualquier usuario autenticado puede modificar proyectos de otros developers (nombre, presupuesto, estado, AI config)
- **Fix:** Agregar `await requireProjectOwnership(params.id)` al inicio del PUT handler
- **Esfuerzo:** 30 min

#### C2 — Sin ownership check en GET `/api/crm/leads/[id]`
- **Archivo:** `app/api/crm/leads/[id]/route.ts`
- **Riesgo:** IDOR — User A puede leer leads (emails, teléfonos, notas) de User B adivinando el ID (CUID)
- **Fix:** Verificar `lead.asignadoAId === user.id OR lead.proyecto.creadoPorId === user.id OR user.role === "ADMIN"`
- **Esfuerzo:** 45 min

#### C3 — Race condition en reservas
- **Archivo:** `lib/actions/reservas.ts`
- **Riesgo:** Dos vendedores pueden crear reservas simultáneas para la misma unidad (overbooking)
- **Fix:** Usar `prisma.$transaction` con verificación atómica de `unidad.estado === "DISPONIBLE"`
- **Esfuerzo:** 2-3 horas (+ load testing)

#### C4 — Lead capture sin CAPTCHA ni rate limit en server action
- **Archivos:** `lib/actions/leads.ts` (`crearLeadLanding()`), `components/public/formulario-captura.tsx`
- **Riesgo:** Spam bot puede crear miles de leads falsos; DB y CRM contaminados; sin rate limit en server action (solo en API route)
- **Fix:** Agregar rate limit por IP en `crearLeadLanding()` + hCaptcha/Turnstile en el form
- **Esfuerzo:** 4-6 horas

#### C5 — Raw SQL sin validación de input format
- **Archivo:** `app/(public)/proyectos/page.tsx` línea ~40
- **Riesgo:** Array `ids` de Proyecto IDs no validado como CUIDs antes del `Prisma.join(ids)`; valores malformados pueden escapar al SQL
- **Fix:** Filtrar `ids = projects.map(p => p.id).filter(id => /^[a-z0-9]{25}$/.test(id))`
- **Esfuerzo:** 1 hora

---

### 🟠 ALTO

#### A1 — Pusher channel auth sin verificar permisos
- **Archivo:** `app/api/pusher/auth/route.ts`
- **Riesgo:** User A puede suscribirse a `private-project-[UserBProjectId]` y recibir updates de inventario/reservas en tiempo real de otro developer
- **Fix:** Validar pattern del channel name y verificar ownership via DB
- **Esfuerzo:** 2-3 horas

#### A2 — Sin `Lead.orgId` desnormalizado
- **Archivo:** `prisma/schema.prisma`, `lib/actions/leads.ts`
- **Riesgo:** Queries de leads multi-tenant hacen 3+ table JOINs; N+1 en dashboards con muchos leads
- **Fix:** Agregar `Lead.orgId String? @index`, migration + backfill, actualizar queries
- **Esfuerzo:** 3-4 horas

#### A3 — `Unidad.estado` es String libre (no Enum)
- **Archivo:** `prisma/schema.prisma`
- **Riesgo:** Typos silenciosos ("RESERVADO" vs "RESERVADA") causan bugs de negocio; unidades nunca aparecen disponibles
- **Fix:** Crear `enum UnidadEstado { DISPONIBLE RESERVADA VENDIDA BLOQUEADO }` en schema
- **Esfuerzo:** 2 horas

#### A4 — Sin rate limit en endpoints protegidos
- **Archivos:** `app/api/notifications/route.ts`, `app/api/crm/leads/route.ts`, `app/api/crm/pipeline/route.ts`
- **Riesgo:** Usuarios autenticados pueden hacer polling masivo / DoS de sus propios endpoints
- **Fix:** Aplicar `checkRateLimit(user.id + "-" + endpoint, {limit: 100, windowMs: 60000})`
- **Esfuerzo:** 3-4 horas

#### A5 — Dos archivos de guards con comportamiento distinto
- **Archivos:** `lib/guards.ts` (throw AuthError) vs `lib/auth/guards.ts` (redirect)
- **Riesgo:** Comportamiento inconsistente; fácil mezclar ambos en el mismo contexto causando errors de UX o security holes
- **Fix:** Consolidar en `lib/guards.ts`, documentar cuándo usar `redirect()` vs `throw`; eliminar `lib/auth/guards.ts`
- **Esfuerzo:** 2-3 horas

#### A6 — Roles hardcodeados como strings en 5+ lugares
- **Archivos:** `app/api/auth/register/route.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `lib/actions/kyc-actions.ts`, `lib/guards.ts`
- **Riesgo:** Inconsistencia al agregar/renombrar roles; un lugar olvidado = bug de seguridad
- **Fix:** Crear `lib/constants/roles.ts` con `export const ROLES = { ADMIN: "ADMIN", ... } as const`
- **Esfuerzo:** 2 horas

---

### 🟡 MEDIO

#### M1 — Sin audit logging para acciones sensibles
- **Archivos:** `lib/actions/inversiones.ts`, `lib/actions/kyc-actions.ts`, `lib/actions/pagos.ts`
- **Riesgo:** Sin audit trail para compliance / resolución de disputas
- **Fix:** Extender uso de `createAuditLog()` a inversiones, KYC changes, y pagos
- **Esfuerzo:** 2-3 horas

#### M2 — Emails no implementados (varios TODOs)
- **Archivos:** `app/api/leads/public/route.ts` (línea 79-80), `lib/actions/reservas.ts`, `lib/actions/kyc-actions.ts`
- **Riesgo:** Vendedores no reciben notificación de nuevos leads; compradores no reciben confirmación de reserva
- **Fix:** Implementar con Resend (ya configurado en `lib/mail.ts`)
- **Esfuerzo:** 4-6 horas

#### M3 — KYC sin state machine de transiciones
- **Archivo:** `lib/actions/kyc-actions.ts`
- **Riesgo:** Transiciones inválidas permitidas (e.g., RECHAZADO → VERIFICADO directamente)
- **Fix:** Definir `KYC_VALID_TRANSITIONS` y validar antes de update
- **Esfuerzo:** 2 horas

#### M4 — Schema faltante para password reset
- **Archivo:** `prisma/schema.prisma`, `lib/actions/auth-actions.ts`
- **Riesgo:** `passwordResetToken` y `passwordResetExpires` no existen en schema; reset de contraseña falla silenciosamente
- **Fix:** Agregar campos al schema + migration
- **Esfuerzo:** 1 hora + migration

#### M5 — Feature flags no enforcement en rutas
- **Archivos:** `lib/saas/limits.ts`, páginas de tour360/masterplan/workflows
- **Riesgo:** Developer con plan FREE puede acceder a features de pago aunque feature=false en su plan
- **Fix:** Chequear `checkPlanLimit(orgId, "tour360")` en pages y mostrar upgrade CTA si blocked
- **Esfuerzo:** 3-4 horas

#### M6 — Sin pasarela de pagos integrada
- **Archivo:** `lib/actions/pagos.ts`, `lib/actions/reservas.ts`
- **Riesgo:** Pagos creados en estado PENDIENTE sin sistema de cobro real
- **Fix:** Integrar Stripe/MercadoPago, actualizar Pago.estado via webhook
- **Esfuerzo:** 1-2 semanas

---

### 🟢 BAJO

#### L1 — Mensajes de error en dos idiomas
- **Archivos:** múltiples (guards, routes, actions)
- **Fix:** Centralizar en `lib/errors.ts` con constantes en español
- **Esfuerzo:** 2 horas

#### L2 — `session.user` con casts `as any`
- **Archivos:** múltiples pages del dashboard
- **Fix:** Actualizar `types/next-auth.d.ts` y eliminar casts
- **Esfuerzo:** 3-4 horas

#### L3 — Rate limiting in-memory no funciona en Vercel multi-instancia
- **Archivo:** `lib/rate-limit.ts`
- **Fix:** Reemplazar con Upstash Redis
- **Esfuerzo:** 3-4 horas

#### L4 — `LoginGate` sin implementar
- **Archivo:** `components/public/login-gate.tsx`
- **Fix:** Implementar modal de login/register para rutas públicas
- **Esfuerzo:** 1-2 días

#### L5 — Token de reset en URL (visible en logs)
- **Archivos:** `app/(auth)/reset-password/page.tsx`, `lib/actions/auth-actions.ts`
- **Fix:** Validar token via server antes de render, no exponer en URL
- **Esfuerzo:** 3 horas

---

## F) Checklist de Smoke Tests por Rol

### Público (sin autenticación)

| # | Acción | Verificar |
|---|--------|-----------|
| 1 | `GET /` | Render: banners, hero, formulario captura, proyectos destacados, testimonios (DB) |
| 2 | Enviar FormularioCaptura | Lead creado en DB con campos correctos; mensaje de éxito mostrado |
| 3 | Enviar 11 veces en <10min (ContactForm) | 429 en el 11° (rate limit API) |
| 4 | Enviar FormularioCaptura 20 veces seguidas | Sin rate limit (⚠️ C4 — pendiente fix) |
| 5 | `GET /proyectos` | Solo proyectos PUBLICADO, demos válidos; search funciona |
| 6 | `GET /proyectos/[slug]` de proyecto DRAFT | 404 o redirect (no exponer draft) |
| 7 | `GET /proyectos/[slug]/unidades/[id]` de proyecto DRAFT | ⚠️ Actualmente expuesto — C5 pendiente |
| 8 | `GET /dashboard` sin sesión | Redirect a `/login` |
| 9 | `GET /dashboard/admin` sin sesión | Redirect a `/login` |
| 10 | `POST /api/leads/public` con HTML en nombre | Sanitizado (Zod + React escaping) |

### Login / Auth

| # | Acción | Verificar |
|---|--------|-----------|
| 1 | Login con credenciales válidas (ADMIN) | Redirect a `/dashboard/admin` |
| 2 | Login con credenciales válidas (DESARROLLADOR) | Redirect a `/dashboard/developer` |
| 3 | Login con credenciales válidas (INVERSOR) | Redirect a `/dashboard/portafolio` |
| 4 | Login con password incorrecto | "Credenciales inválidas" (genérico) |
| 5 | Login con email inexistente | "Credenciales inválidas" (anti-enum) |
| 6 | Register como ADMIN | Bloqueado: 403 |
| 7 | Register como DESARROLLADOR | Creado con rol=DESARROLLADOR, kycStatus=NINGUNO, demoEndsAt=now+48h |
| 8 | Login con cuenta recién registrada | Redirect correcto; demo activa; KYC prompt visible |
| 9 | Forgot password (RESEND configurado) | Email enviado; token guardado en DB |
| 10 | Forgot password (email inexistente) | Misma respuesta success (anti-enum) |
| 11 | Reset password con token válido | Password actualizado; token = null; redirect /login |
| 12 | Reset password con token expirado (>1h) | Error "Token inválido o expirado" |
| 13 | Logout | Cookie cleared; redirect /login; ruta dashboard → redirect /login |

### ADMIN / SUPERADMIN

| # | Acción | Verificar |
|---|--------|-----------|
| 1 | `GET /dashboard/admin` | Stats globales, health checks (DB/Storage/Pusher), audit logs recientes |
| 2 | `GET /dashboard/admin/users` | Lista ALL users sin filtro org |
| 3 | Cambiar rol de user | Rol actualizado; user ve nuevo dashboard en próximo request |
| 4 | `GET /dashboard/admin/kyc` | Listado KycProfile {estado=EN_REVISION} |
| 5 | Aprobar KYC | kycStatus→APROBADO, user notificado, developerVerified=true |
| 6 | Rechazar KYC | kycStatus→RECHAZADO, user notificado |
| 7 | `GET /dashboard/admin/proyectos` | ALL proyectos (todas las orgs) |
| 8 | `GET /dashboard/admin/crm/leads` | ALL leads globales |
| 9 | Crear plan SaaS | Plan creado; asignable a org |
| 10 | Asignar plan a org | Org.planId actualizado; features activas para esa org |
| 11 | Cambiar HERO_TITLE en configuración | Visible en landing en próximo load |
| 12 | Evaluar riesgo user | User.riskLevel actualizado; log en AuditLog |
| 13 | Admin intenta `GET /dashboard/developer` | ⚠️ Debería mostrar dashboard correcto según rol |

### DESARROLLADOR / VENDEDOR

| # | Acción | Verificar |
|---|--------|-----------|
| 1 | `GET /dashboard/developer` | Stats: leads del mes, conversión, reservas activas, KYC status |
| 2 | Ver KYC card sin completar | Muestra prompt "Completá tu perfil"; sin KYC no puede hacer reservas |
| 3 | Crear proyecto | Creado con creadoPorId=user.id y orgId=user.orgId |
| 4 | Acceder proyecto de OTRO dev | ⚠️ C2 — actualmente posible via API PUT; page debe bloquear |
| 5 | Crear unidad en su proyecto | Unidad creada, estado=DISPONIBLE |
| 6 | `GET /dashboard/developer/leads` | Solo leads asignadoAId=user.id o de sus proyectos |
| 7 | Buscar leads | Filtro nombre/email/telefono funciona |
| 8 | Crear reserva (KYC APROBADO) | Reserva creada, unidad→RESERVADA, notificación, Pusher event |
| 9 | Crear reserva (sin KYC) | Error: "Debes completar KYC para realizar esta acción" |
| 10 | Confirmar venta | PDF generado, subido a storage, Pago {PENDIENTE} creado |
| 11 | Crear pipeline etapa | PipelineEtapa creada para su orgId |
| 12 | Arrastrar lead entre etapas | Lead.pipelineEtapaId actualizado |
| 13 | Ver plan usage | Muestra: used/max para leads, proyectos, users |
| 14 | Crear workflow | Workflow creado con orgId=user.orgId |

### INVERSOR / CLIENTE

| # | Acción | Verificar |
|---|--------|-----------|
| 1 | `GET /dashboard/portafolio` | Inversiones, wallet saldo, propiedades, oportunidades |
| 2 | Ver oportunidades sin KYC | Visible pero bloquear al intentar invertir |
| 3 | Crear inversión sin KYC | Error 403 "Debes completar KYC" |
| 4 | Completar KYC (inversor) | KycProfile creado, kycStatus→EN_REVISION |
| 5 | Crear inversión con KYC APROBADO | Inversion creada, saldo descontado de wallet (si aplica) |
| 6 | Ver wallet | Saldo actual + movimientos (depósitos, retiros, inversiones) |
| 7 | Solicitar retiro | Withdrawal request creada |
| 8 | Agregar favorito | FavoritoProyecto creado, visible en /favoritos |
| 9 | Acceder a `/dashboard/admin` | Redirect a `/dashboard` o 403 |
| 10 | Acceder a `/dashboard/developer` | Redirect a `/dashboard` o 403 |

### Edge Cases / Security

| # | Test | Resultado esperado |
|---|------|--------------------|
| 1 | IDOR: User B → `GET /api/crm/leads/[UserA-leadId]` | 403 Forbidden (⚠️ C2: actualmente posible) |
| 2 | IDOR: User B → `PUT /api/proyectos/[UserA-proyectoId]` con body | 403 Forbidden (⚠️ C1: actualmente posible) |
| 3 | Privilege escalation: Register con body `{"rol":"ADMIN"}` | Ignorado; creado como CLIENTE |
| 4 | Race condition: 2 requests simultáneos reservar misma unidad | Solo 1 succeed (⚠️ C3: actualmente ambos pueden pasar) |
| 5 | Spam leads: 50 requests en <1min a `crearLeadLanding()` | Sin limit actual (⚠️ C4) |
| 6 | Pusher subscribe a `private-project-[otro-orgId]` | Debe ser rechazado (⚠️ A1: actualmente permitido) |
| 7 | Demo expirado: login + acceder dashboard | Redirect a `/onboarding/kyc` o `/demo-expired` |
| 8 | Cron sin header `x-cron-secret` | 401 Unauthorized |
| 9 | XSS en notas de lead | Contenido escapado por React (safe) |
| 10 | SQL injection en búsqueda | Sanitizado por Prisma (safe) |
| 11 | Reserva doble: mismo vendedor, misma unidad, 2 requests | Segunda debe retornar error "Unidad ya reservada" |
| 12 | Workflow trigger con payload malformado | Error controlado, no crash |

---

## Resumen Ejecutivo

### Score de madurez por área

| Área | Score | Observación |
|------|-------|-------------|
| Arquitectura general | 8/10 | Sólida, bien estructurada |
| Autenticación | 7/10 | NextAuth bien configurado; gaps en reset password y rate limit |
| Autorización | 5/10 | Guards existen pero incompletos en API routes |
| Multi-tenancy | 7/10 | orgFilter implementado; Lead sin orgId es gap |
| Performance | 6/10 | Raw SQL donde importa; N+1 en algunos paths |
| Seguridad | 5/10 | 5 issues CRÍTICOS pre-producción |
| CRM/Flujo de negocio | 7/10 | Completo en estructura; race condition y emails pendientes |
| SaaS/Planes | 6/10 | Infraestructura existe; enforcement parcial |

### Issues que bloquean producción

1. **C1** — PUT proyectos sin ownership check
2. **C2** — GET leads sin ownership check (IDOR)
3. **C3** — Race condition en reservas
4. **C4** — Lead spam sin CAPTCHA
5. **M4** — Schema faltante para password reset (feature rota)

### Próximos pasos sugeridos

```
Semana 1: C1, C2, C5 (hotfixes < 2h cada uno) + M4 (schema migration)
Semana 2: C3 (transaction), C4 (CAPTCHA), A1 (Pusher)
Semana 3: A3 (Unidad enum), A6 (roles constants), M1 (audit logs), M2 (emails)
Semana 4: A2 (Lead.orgId migration), A4 (rate limits), M3 (KYC state machine), M5 (feature flags)
Backlog:  L3 (Redis rate limit), L4 (LoginGate), M6 (payment gateway)
```
