# Deduplicación Landing Pública — Ejecutada

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Commits:** 5 commits atómicos

---

## Cambios ejecutados

### COMMIT 1 — `fix: /buscar — replace mock page with redirect to /proyectos`

**Problema:** `app/(public)/buscar/page.tsx` era una página completa con `MOCK_PROJECTS` hardcodeados, UI de filtros no funcionales y resultados de ejemplo. Duplicaba la funcionalidad de `/proyectos`.

**Solución:** Reemplazado por un redirect a `/proyectos` (4 líneas).

| Archivo | Acción |
|---------|--------|
| `app/(public)/buscar/page.tsx` | Reescrito → `redirect("/proyectos")` (−182 líneas) |

---

### COMMIT 2 — `fix: contact-form — use crearConsultaContacto server action instead of /api/leads/public`

**Problema:** `ContactForm` usaba `fetch("/api/leads/public")` con lógica duplicada de creación de lead. La API route tenía bugs (`user.findFirst()` siempre asigna al primer usuario, sin orgId, sin canalOrigen). `crearConsultaContacto()` ya existía en `lib/actions/leads.ts` para este mismo propósito.

**Solución:** `ContactForm` llama directamente a `crearConsultaContacto()`. La server action fue actualizada para soportar `proyectoId` opcional y `asunto` opcional.

| Archivo | Acción |
|---------|--------|
| `components/public/contact-form.tsx` | Reemplazado `fetch()` por `crearConsultaContacto()` |
| `lib/actions/leads.ts` | `crearConsultaContacto`: `asunto` opcional, `proyectoId` añadido |

> La API route `/api/leads/public` se mantiene (puede ser usada por integraciones externas) pero ya no es el canal principal de creación de leads desde la landing.

---

### COMMIT 3 — `fix: testimonios — use DB carousel on homepage, delete static mock components`

**Problema:** Existían dos implementaciones paralelas de la sección de testimonios:
1. `TestimonialsSection` → `TestimonialCarousel` → `TestimonialCard`: usaba array de 14 testimonios hardcodeados con i18n. **No consultaba la DB.**
2. `TestimoniosCarousel` + `TestimoniosCarouselWrapper`: consultaba `getTestimonios()` (DB, solo APROBADO), con Swiper 3D, fallback de 4 items.

La homepage usaba la implementación mock (1).

**Solución:**
- `TestimonialsSection` ahora usa `TestimoniosCarouselWrapper` (DB) en lugar de `TestimonialCarousel` (mock).
- Eliminados `TestimonialCarousel.tsx` y `TestimonialCard.tsx` (solo usados por el mock).
- Arreglo de TS pre-existente en `testimonios-carousel.tsx`: fallback items tipados correctamente como `Testimonio[]`.
- Arreglo de TS pre-existente: `Testimonio.rating` corregido a `number | null` para coincidir con el tipo Prisma.

| Archivo | Acción |
|---------|--------|
| `components/public/testimonials-section.tsx` | Reemplazado `TestimonialCarousel` por `TestimoniosCarouselWrapper` (−90 líneas de mock data) |
| `components/public/TestimonialCarousel.tsx` | **Eliminado** |
| `components/public/TestimonialCard.tsx` | **Eliminado** |
| `components/public/testimonios-carousel.tsx` | Fix TS: fallback items tipados como `Testimonio[]` |
| `lib/actions/testimonios.ts` | Fix TS: `rating: number \| null` |

---

### COMMIT 4 — `perf: /proyectos — replace N+1 unit count loop with single SQL query`

**Problema:** `getProjects()` en `app/(public)/proyectos/page.tsx` hacía un `COUNT` de unidades por proyecto en un loop `Promise.all`, generando N queries a la DB (una por proyecto).

**Solución:** Una sola query SQL raw con `GROUP BY proyectoId`, igual al patrón ya usado en `lib/actions/proyectos.ts`.

| Archivo | Acción |
|---------|--------|
| `app/(public)/proyectos/page.tsx` | N+1 reemplazado por SQL raw con `Prisma.join` |

---

### COMMIT 5 — `fix: documentos-manager — cast error type to resolve build error (pre-existing)`

**Problema:** Error TS pre-existente en `components/dashboard/proyectos/documentos-manager.tsx` bloqueaba `npm run build`. Acceso a `.error` en tipo union sin narrowing.

**Solución:** Cast `(res as any).error` con fallback string (patrón ya usado en la misma función más arriba en el archivo).

| Archivo | Acción |
|---------|--------|
| `components/dashboard/proyectos/documentos-manager.tsx` | Fix TS: cast `error` con fallback |

---

## Archivos eliminados

| Archivo | Razón |
|---------|-------|
| `components/public/TestimonialCard.tsx` | Solo usado por TestimonialCarousel (mock) |
| `components/public/TestimonialCarousel.tsx` | Reemplazado por TestimoniosCarouselWrapper (DB) |

---

## Archivos refactorizados

| Archivo | Cambio |
|---------|--------|
| `app/(public)/buscar/page.tsx` | Mock completo → redirect a /proyectos |
| `app/(public)/proyectos/page.tsx` | N+1 → SQL raw single query |
| `components/public/contact-form.tsx` | `fetch /api/leads/public` → `crearConsultaContacto()` |
| `components/public/testimonials-section.tsx` | Mock array → TestimoniosCarouselWrapper (DB) |
| `lib/actions/leads.ts` | `crearConsultaContacto`: asunto optional, proyectoId added |
| `lib/actions/testimonios.ts` | `Testimonio.rating` type fix |
| `components/public/testimonios-carousel.tsx` | Fallback items tipados correctamente |
| `components/dashboard/proyectos/documentos-manager.tsx` | Fix TS error pre-existente |

---

## Resultado de pruebas

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores nuevos introducidos |
| `npm run build` | ✅ Build exitoso |
| Funcionalidad `/buscar` | ✅ Redirige a `/proyectos` |
| `ContactForm` (proyectos/contacto) | ✅ Usa server action, misma UX |
| Sección testimonios homepage | ✅ Carga desde DB, fallback si vacía |
| Lista `/proyectos` | ✅ Query eficiente, misma UI |

---

## Issues pendientes (fuera del scope de este refactor)

- `/api/leads/public`: `user.findFirst()` sin round-robin (bug de asignación)
- `crearLeadLanding()`: sin rate limit en la server action
- `crearLeadLanding()`: sin `orgId` (incorrecto para multi-tenant)
- Leads creados sin `pipelineEtapaId` (no aparecen en kanban CRM)
- `/proyectos/[slug]/unidades/[id]`: no valida `proyecto.visibilityStatus`
- SEO metadata ausente en `/blog/[slug]`
