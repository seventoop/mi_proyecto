# Seventoop - Real Estate Platform

## Overview
Next.js 14 real estate platform with dashboard for managing loteo (subdivisions) projects. Features public showcase pages, masterplan editing (SVG + Google Maps overlay), unit/lot management, 360 tours, lead capture, and admin tools.

## Architecture
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth (credentials provider)
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Leaflet + Google Satellite tiles (masterplan overlay)
- **Port**: 5000 (`next dev -p 5000 -H 0.0.0.0`)

## Key Files & Directories
- `app/(public)/proyectos/[slug]/page.tsx` — Public project landing page (SSR)
- `components/public/project-detail-showcase.tsx` — Public showcase component (gallery, masterplan map, plan viewer, lot table, stages, contact)
- `components/masterplan/masterplan-map.tsx` — Leaflet map with SVG polygon overlay (admin + public modes)
- `components/masterplan/masterplan-viewer.tsx` — SVG-only plan viewer (zoom/pan)
- `components/masterplan/overlay-editor.tsx` — Blueprint image overlay editor (admin)
- `lib/project-showcase.ts` — Centralized data fetching for showcase (SSR payload builder)
- `lib/actions/unidades.ts` — Unit/lot CRUD + public blueprint data fetch
- `app/(dashboard)/dashboard/proyectos/[id]/page.tsx` — Dashboard project page (view/edit modes)

## Public Showcase Sections
1. **Hero** — Cover image, project name, location
2. **Gallery** — Image grid + lightbox with navigation
3. **Stats Strip** — Disponible/Reservado/Vendido/Ticket medio
4. **Masterplan Map** (if overlayBounds present) — Leaflet + Google satellite with SVG polygon overlay
5. **Plan Viewer** — SVG-only masterplan viewer
6. **Lot Listing Table** — Sortable/filterable table of all lots
7. **Location** — Google Maps embed
8. **Stages** — Project development stages
9. **Documents** — Legal documentation
10. **Contact** — Lead capture form

## Branch
Working on `juani-dev2` — push to `origin juani-dev2`

## Config Notes
- `typescript.ignoreBuildErrors: true` in next.config
- `MasterplanMap` dynamically imported (no SSR) due to Leaflet
- Overlay config passed server-side through `getProjectShowcasePayload` to avoid auth-protected API calls in public mode
