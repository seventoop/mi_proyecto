# System Overview

This overview describes Seventoop at a high level using repository evidence available in the current codebase and documentation. It is intentionally conservative: verify specific behavior in code before changing or relying on it.

Related sources: [`../00-index.md`](../00-index.md), [`../documentation-map.md`](../documentation-map.md), [`../../README.md`](../../README.md), [`../../REPO_RULES.md`](../../REPO_RULES.md), [`../../CLAUDE.md`](../../CLAUDE.md), [`mutation-and-lead-ingestion-rules.md`](mutation-and-lead-ingestion-rules.md).

## Stack Principal

The repository is a private Next.js application named `seventoop` according to [`../../package.json`](../../package.json). The confirmed core stack includes:

- Next.js `14.2.35` with App Router.
- React 18 and TypeScript.
- Tailwind CSS and Radix UI primitives.
- Prisma `5.22.0` with PostgreSQL.
- NextAuth.
- Vitest and Testing Library for tests.
- Pusher for realtime capabilities.
- AWS S3 SDK plus local storage support.
- Resend for email utilities.
- OpenAI and Anthropic SDKs for AI-related actions.
- Sentry configuration files for client, server, and edge runtime.

The canonical local environment is documented in [`../../REPO_RULES.md`](../../REPO_RULES.md): local app URL `http://localhost:5000`, Postgres host port `5433`, container port `5432`, database `seventoop`, and `.env.local` as the local source of truth.

## App Router And Route Groups

The `app/` directory is organized into major route groups and API routes:

- `app/(auth)/` for authentication pages such as login, registration, and password flows.
- `app/(public)/` for public-facing pages and project pages.
- `app/(dashboard)/dashboard/` for authenticated dashboard areas.
- `app/api/` for API routes.

[`../../CLAUDE.md`](../../CLAUDE.md) documents the page pattern currently expected by agents: `page.tsx` as a Server Component for auth guards and data loading, with `page-client.tsx` or `*-client.tsx` for interactive client islands.

## Authentication

Authentication is implemented with NextAuth according to repository dependencies and the architecture guide in [`../../CLAUDE.md`](../../CLAUDE.md). The auth runbook in [`../auth-runbook.md`](../auth-runbook.md) documents production-oriented auth operations and diagnostics.

The agent guide identifies `lib/guards.ts` as the canonical guard surface for authenticated access, role checks, project ownership, KYC checks, and API/Server Action guard error handling. Verify individual routes and Server Actions before assuming a guard is present.

## Roles

The documented dashboard role areas are:

- `ADMIN` under `/dashboard/admin/`.
- `DESARROLLADOR` under `/dashboard/developer/`.
- `INVERSOR` / `CLIENTE` in the main dashboard and portfolio areas.
- `VENDEDOR` appears as a dashboard subtree in the repository structure.

Roles are represented as strings in the Prisma `User.rol` field. [`../../CLAUDE.md`](../../CLAUDE.md) and several audit files discuss role usage and guard conventions, but a verified role-permission matrix is still missing.

## Multi-Tenancy

The data model includes `Organization` and many organization-scoped relations. `User` has optional `orgId`, and core business models such as `Proyecto`, `Lead`, `Workflow`, `LogicToopFlow`, `IntegrationConfig`, and `PipelineEtapa` include organization relationships or organization IDs.

[`../../CLAUDE.md`](../../CLAUDE.md) states that non-admin users should be scoped through organization filters and that admins bypass org scoping. Treat that as an architecture rule to verify at each query boundary before modifying tenant-sensitive code.

## Data Hierarchy

The core real-estate/project hierarchy in [`../../prisma/schema.prisma`](../../prisma/schema.prisma) is:

`Organization -> Proyecto -> Etapa -> Manzana -> Unidad`

Related models include:

- `Reserva` linked to `Unidad`, seller, buyer, and optionally `Lead`.
- `Inversion` linked to `Proyecto` and investor user.
- `Lead`, `PipelineEtapa`, `LeadMessage`, `Oportunidad`, and `Tarea` for CRM flows.
- `Tour360`, `TourScene`, and `Hotspot` for 360 tour features.
- `Workflow`, `WorkflowNodo`, `WorkflowRun`, and `WorkflowRunPaso` for workflow execution.
- `LogicToopFlow`, `LogicToopExecution`, `LogicToopJob`, `LogicToopTemplate`, and `LogicToopRecommendation` for LogicToop.

This overview does not define detailed business rules for these models; those should be verified in actions, API routes, and service modules before changes.

## Prisma And PostgreSQL

Prisma uses PostgreSQL with `url = env("DATABASE_URL")` in [`../../prisma/schema.prisma`](../../prisma/schema.prisma), matching [`../../REPO_RULES.md`](../../REPO_RULES.md). Local Docker Postgres is defined in [`../../docker-compose.yml`](../../docker-compose.yml) and matches the documented local canon.

Available package scripts include `db:migrate:dev`, `db:migrate:deploy`, `db:migrate:status`, `db:seed`, and `db:studio`. Do not run migrations, seeds, sync scripts, or production database operations without explicit authorization.

## Storage

[`../../CLAUDE.md`](../../CLAUDE.md) identifies `lib/storage.ts` as the storage abstraction and documents `STORAGE_TYPE=local` for development and `STORAGE_TYPE=s3` for production-style storage. AWS S3 dependencies are present in `package.json`.

Specific upload rules, public URL behavior, and cleanup expectations need a dedicated storage document.

## Realtime

Realtime support is confirmed through Pusher dependencies and `lib/pusher.ts`. [`../../CLAUDE.md`](../../CLAUDE.md) documents server/client helper behavior and known channel groups for reservations, units, and private user notifications.

Audit notes such as [`../audits/fix-a1.md`](../audits/fix-a1.md) discuss realtime auth hardening. Verify the current endpoint and channel authorization logic before changing realtime behavior.

## CRM And Leads

CRM-related models include `Lead`, `PipelineEtapa`, `LeadMessage`, `Oportunidad`, and `Tarea`. The dashboard has CRM/leads route areas, and [`mutation-and-lead-ingestion-rules.md`](mutation-and-lead-ingestion-rules.md) documents architectural rules for lead ingestion.

Historical audit notes such as [`../audits/fix-a2.md`](../audits/fix-a2.md) and [`../audits/fix-c2.md`](../audits/fix-c2.md) are useful leads for tenant scoping and IDOR verification, but current behavior should be checked in code before making claims.

## Reservations

Reservations are represented by the `Reserva` model and dashboard reservation areas. `Reserva` links units, sellers, buyers, optional leads, payment state, idempotency key, and reservation state.

Audit notes [`../audits/fix-c3.md`](../audits/fix-c3.md) and [`../audits/fix-c3-validation.md`](../audits/fix-c3-validation.md) document historical reservation concurrency work. Treat them as verification starting points, not a substitute for current code review.

## Investments

Investments are represented by `Inversion`, project funding fields on `Proyecto`, `EscrowMilestone`, `PriceHistory`, and investor-related dashboard/portfolio areas. A dedicated investment flow document is still missing.

## Workflows

The workflow engine is confirmed by Prisma workflow models and `lib/workflow-engine.ts`. [`../../CLAUDE.md`](../../CLAUDE.md) describes node-by-node execution and node types including `UPDATE_LEAD`, `CONDITION`, `WEBHOOK`, and `WAIT`.

Detailed trigger behavior, retry semantics, and failure handling should be verified before changing workflow behavior.

## LogicToop

LogicToop has dedicated Prisma models, `lib/logictoop/`, and docs under [`../logictoop/`](../logictoop/). [`../logictoop/architecture-v1.md`](../logictoop/architecture-v1.md) is a baseline document, and [`../logictoop/roadmap.md`](../logictoop/roadmap.md) is roadmap-oriented.

A current implementation map separated from roadmap and historical notes is still needed.

## Confirmed External Integrations

Confirmed by dependencies, config files, or docs:

- Vercel deployment expectations via docs and [`../../vercel.json`](../../vercel.json).
- PostgreSQL via Prisma and Docker Compose.
- NextAuth auth flows.
- Pusher realtime.
- AWS S3-compatible storage through `@aws-sdk/client-s3`.
- Resend email utilities.
- Sentry configuration files.
- Google APIs / Google Maps dependencies.
- OpenAI and Anthropic SDKs.
- Upstash Redis dependency, likely related to rate limiting or future distributed limits.

Presence of a dependency does not prove every integration is fully configured or active in every environment.

## Tests And CI

The repository includes tests under [`../../__tests__/`](../../__tests__/) and a CI workflow at [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml). CI currently runs dependency installation, Prisma Client generation where needed, typecheck, lint, security check, and build on pushes and pull requests targeting `main` or `master`.

Relevant scripts from `package.json` include:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run security:check`
- `npm run check-all`

Validation should be proportional to the change and should avoid database or deployment side effects unless explicitly authorized.
