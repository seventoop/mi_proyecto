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

## Recent Changes
- Replaced `bcrypt` with `bcryptjs` for Vercel compatibility
- Added email normalization in auth flows
- Migrated data from Replit to Neon production (12 users, 7 projects, 322 units, 10 banners)
- Breadcrumbs now show project name instead of CUID ID
- Replaced all browser `alert()` calls with sonner toasts in blueprint engine
- Removed dead unreachable code block in handleSync

## Slug Migration Note
Projects already have a `slug` field populated (e.g., `barrio-capinota`). A future improvement could migrate routes from `/proyectos/[id]` to `/proyectos/[slug]` for cleaner URLs. This would require updating all links, API routes, and the breadcrumb logic. Assess impact before proceeding.
