# SevenToop — Gestión Inmobiliaria

## Overview
Next.js 14 real estate management platform with Prisma ORM and PostgreSQL (Neon for production, local for dev).

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth.js with credentials provider (bcryptjs for Vercel compatibility)
- **ORM**: Prisma
- **Database**: Neon PostgreSQL (production), local PostgreSQL (dev)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Notifications**: sonner (toasts), Pusher (real-time)
- **i18n**: Custom dictionary-based system (es/en)

## Key Files
- `lib/auth.ts` — NextAuth config
- `lib/db.ts` — Prisma client singleton
- `prisma/schema.prisma` — Database schema
- `middleware.ts` — Auth middleware
- `components/dashboard/header.tsx` — Dashboard header with smart breadcrumbs (resolves project IDs to names)
- `components/masterplan/blueprint-engine.tsx` — Blueprint processor with sync (uses sonner toasts)
- `app/layout.tsx` — Root layout (includes Toaster from sonner)

## Production
- **URL**: https://seventoop.com
- **DB**: Neon PostgreSQL (sa-east-1)
- **Deployment**: Vercel
- **Admin**: dany76162@gmail.com (ADMIN role)

## Landing Page (One-Page)
- **Structure**: `app/(public)/page.tsx` assembles all sections
- **Sections order (IDs)**: `#inicio` (banner+hero) → `#proyectos` (search+cards) → `#desarrolladores` → `#como-funciona` (with `#oportunidades` nested) → `#noticias` → `#testimonios` (comunidad+testimonials) → `#contacto` (footer)
- **Navigation**: Navbar items are anchor links (`#section`); FloatingNav provides fixed bottom-right navigation buttons
- **FloatingNav** (`components/public/floating-nav.tsx`): Single floating component with scroll-based section detection. Shows ↑/↓/↓↓/↑↑ buttons depending on position. Replaces old inline SectionArrows and ScrollToTop.
- **MediaBanner** (`components/public/media-banner.tsx`): CSS opacity transitions (no framer-motion), `object-cover` fill, responsive height `h-[50vh] sm:h-[65vh] lg:h-[75vh]`, auto-advance 8s images / 25s video.
- **Components**: `components/public/` — navbar, hero, floating-nav, media-banner, noticias, footer, scroll-animation-wrapper, etc.
- **Removed from landing**: framer-motion (AnimatePresence), inline section-arrows, scroll-to-top. Old files `section-arrows.tsx` and `scroll-to-top.tsx` still exist but are unused.
- **i18n**: `lib/i18n/dictionaries/es.json` and `en.json` — keys: nav, news, footer.links.news, mediaBanner

## Recent Changes
- Replaced `bcrypt` with `bcryptjs` for Vercel compatibility
- Added email normalization in auth flows
- Migrated data from Replit to Neon production (12 users, 7 projects, 322 units, 10 banners)
- Breadcrumbs now show project name instead of CUID ID
- Replaced all browser `alert()` calls with sonner toasts in blueprint engine
- Landing converted to full one-page navigation with scrollspy
- FloatingNav replaces all inline SectionArrows + ScrollToTop with single fixed bottom-right component
- MediaBanner rewritten: removed framer-motion, object-cover (no black bars), CSS opacity transitions
- ScrollAnimationWrapper, Hero, ComoFunciona migrated from framer-motion to CSS+IntersectionObserver
- Added `lib/svg-strip-labels.ts` to strip `<text>`/`<tspan>` and neutralize fills (attribute, single-quoted, and inline `style="fill:..."`) on path/polygon/polyline/rect/circle/ellipse from masterplan SVGs. Applied at both `/proyectos/[slug]` and `/proyectos/[slug]/masterplan` so the SVG only contributes structural outlines and never duplicates the colored unit polygons drawn on top of it.

## Slug Migration Note
Projects already have a `slug` field populated (e.g., `barrio-capinota`). A future improvement could migrate routes from `/proyectos/[id]` to `/proyectos/[slug]` for cleaner URLs. This would require updating all links, API routes, and the breadcrumb logic. Assess impact before proceeding.
