# Documentation Map

This map inventories the current Seventoop documentation. Status labels are conservative:

- `FUENTE ACTUAL`: should be treated as a current source of truth for its stated scope.
- `REFERENCIA`: useful supporting context, but verify implementation before relying on it for decisions.
- `HISTORICO/POR VALIDAR`: historical or audit material that may still be useful, but must be checked against current code before acting on it.
- `INCOMPLETO`: useful but intentionally partial.

## Root Documentation

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`../REPO_RULES.md`](../REPO_RULES.md) | Environment canon: local URL, Docker, Postgres, env files, Prisma, Vercel separation. | `FUENTE ACTUAL` | Mandatory source for environment-related decisions; referenced by `README.md`, `CLAUDE.md`, and `AGENTS.md`. |
| [`../README.md`](../README.md) | Local setup summary and environment quick start. | `FUENTE ACTUAL` | Summarizes `REPO_RULES.md`; if conflict appears, `REPO_RULES.md` wins. |
| [`../CLAUDE.md`](../CLAUDE.md) | Agent-facing commands and architecture guide. | `FUENTE ACTUAL` | Main operational architecture note for agents; complements this vault. |
| [`../TECH_DEBT.md`](../TECH_DEBT.md) | Technical debt tracker. | `REFERENCIA` | Should be reconciled with audit files before prioritizing work. |
| [`../AUDIT_UNIFICATION_REPORT.md`](../AUDIT_UNIFICATION_REPORT.md) | Investor/client panel unification audit. | `HISTORICO/POR VALIDAR` | Related to dashboard and portfolio work; verify against current routes before acting. |
| [`../prisma/BOOTSTRAP_CHECKLIST.md`](../prisma/BOOTSTRAP_CHECKLIST.md) | Bootstrap checklist for tenant initialization. | `REFERENCIA` | Related to environment and database setup; check against `REPO_RULES.md` before running commands. |

## Vault Entry Points

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`00-index.md`](00-index.md) | Main vault index. | `FUENTE ACTUAL` | Entry point for repository documentation and Obsidian navigation. |
| [`documentation-map.md`](documentation-map.md) | Inventory of current docs and gaps. | `FUENTE ACTUAL` | Should be updated when documentation is added, consolidated, or reclassified. |
| [`architecture/system-overview.md`](architecture/system-overview.md) | High-level architecture overview based on repository evidence. | `FUENTE ACTUAL` | Connects root guides, Prisma, route groups, docs, tests, and CI. |
| [`architecture/auth-and-authorization.md`](architecture/auth-and-authorization.md) | Authentication, session contents, middleware, guard families, and authorization surfaces. | `FUENTE ACTUAL` | Verified against NextAuth config, middleware, guards, API routes, and existing auth docs. |
| [`architecture/roles-and-permissions.md`](architecture/roles-and-permissions.md) | Role vocabulary, configurable permission matrix, project-level permissions, and KYC/demo access. | `FUENTE ACTUAL` | Verified against Prisma, role constants, permission helpers, and project access helpers. |
| [`architecture/multi-tenancy.md`](architecture/multi-tenancy.md) | Organization scoping, tenant enforcement patterns, IDOR defenses, and cross-tenant risk areas. | `FUENTE ACTUAL` | Verified against Prisma, guards, project access helpers, API routes, and security docs. |

## Architecture

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`architecture/mutation-and-lead-ingestion-rules.md`](architecture/mutation-and-lead-ingestion-rules.md) | Rules for domain mutations and lead ingestion. | `REFERENCIA` | Related to CRM/leads, public forms, and Server Actions. Verify current entry points before changing ingestion. |
| [`architecture/system-overview.md`](architecture/system-overview.md) | Overall stack, route groups, auth, data, integrations, tests, CI. | `FUENTE ACTUAL` | High-level index, not a replacement for code inspection. |
| [`architecture/auth-and-authorization.md`](architecture/auth-and-authorization.md) | Current auth flow and authorization layers. | `FUENTE ACTUAL` | Documents confirmed behavior and drift versus older auth docs. |
| [`architecture/roles-and-permissions.md`](architecture/roles-and-permissions.md) | Current roles and permission systems. | `FUENTE ACTUAL` | Separates role strings, runtime permission overrides, and project relation permissions. |
| [`architecture/multi-tenancy.md`](architecture/multi-tenancy.md) | Current Organization isolation model. | `FUENTE ACTUAL` | Documents positive patterns and risk areas for cross-tenant access. |

## Security

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`security/security-guardrails.md`](security/security-guardrails.md) | Security guardrail system and prohibited patterns. | `REFERENCIA` | Related to `npm run security:check` and CI. Verify guardrail implementation before relying on coverage. |
| [`security/security-architecture.md`](security/security-architecture.md) | Rate limiting strategy and storage phases. | `REFERENCIA` | Related to [`audits/fix-a4.md`](audits/fix-a4.md) and `lib/rate-limit.ts`. |
| [`security/authz-risk-review.md`](security/authz-risk-review.md) | Focused authorization risk review for project stages, debug routes, workflow AI scoring, and news actions. | `FUENTE ACTUAL` | Created from code audit after `35385c5`; documents findings only, without fixes. |
| [`security/pull-request-security-checklist.md`](security/pull-request-security-checklist.md) | PR security checklist. | `REFERENCIA` | Useful for review; should be applied proportionally to risky changes. |
| [`security/id-strategy.md`](security/id-strategy.md) | Identifier strategy / enumeration defense. | `REFERENCIA` | Related to Prisma IDs and security audit findings. |

## LogicToop

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`logictoop/architecture-v1.md`](logictoop/architecture-v1.md) | LogicToop v1 architecture baseline. | `HISTORICO/POR VALIDAR` | Useful baseline; verify against `lib/logictoop/`, `lib/workflow-engine.ts`, and Prisma models before changes. |
| [`logictoop/roadmap.md`](logictoop/roadmap.md) | LogicToop v2 roadmap and conceptual components. | `REFERENCIA` | Product/architecture direction, not proof of implementation. |

## Project Landing

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`project-landing/04-data-model.md`](project-landing/04-data-model.md) | Public project landing contract and simulation CRM storage. | `REFERENCIA` | Related to `lib/project-landing/` and public project pages. |
| [`project-landing/05-landing-blocks.md`](project-landing/05-landing-blocks.md) | Landing block architecture and component responsibilities. | `REFERENCIA` | Related to public landing UI components. |
| [`project-landing/06-implementation-phases.md`](project-landing/06-implementation-phases.md) | Completed phase notes, risks, and next steps. | `HISTORICO/POR VALIDAR` | Useful for roadmap and debt; verify current code before assuming status. |

## Authentication

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`auth-runbook.md`](auth-runbook.md) | Production auth runbook, Google login diagnostics, password setup/reset operations. | `REFERENCIA` | Related to `app/(auth)/`, NextAuth, email, Sentry, and operator scripts. Do not run production commands without authorization. |

## Audits And Fix Notes

| Location | Topic | Estimated status | Relationship |
|---|---|---|---|
| [`audits/global-audit-2026-03-14.md`](audits/global-audit-2026-03-14.md) | Global technical audit snapshot. | `HISTORICO/POR VALIDAR` | Broad route/API/security/data map; use as a lead for verification. |
| [`audits/global-audit.md`](audits/global-audit.md) | Earlier global audit snapshot. | `HISTORICO/POR VALIDAR` | May overlap with the dated global audit; compare before acting. |
| [`audits/security-audit-2026-03-14.md`](audits/security-audit-2026-03-14.md) | Security audit snapshot. | `HISTORICO/POR VALIDAR` | Related to security docs and guardrails. |
| [`audits/login-audit.md`](audits/login-audit.md) | Authentication and authorization audit. | `HISTORICO/POR VALIDAR` | Related to `auth-runbook.md`, `lib/guards.ts`, and NextAuth config. |
| [`audits/deduplicacion-ejecutada.md`](audits/deduplicacion-ejecutada.md) | Executed public landing deduplication notes. | `HISTORICO/POR VALIDAR` | Useful change history for public landing and `/proyectos`. |
| [`audits/fix-c1.md`](audits/fix-c1.md) | Ownership guard for `PUT /api/proyectos/[id]`. | `HISTORICO/POR VALIDAR` | Verify against current API route before relying on it. |
| [`audits/fix-c2.md`](audits/fix-c2.md) | IDOR/org check for CRM lead API. | `HISTORICO/POR VALIDAR` | Related to CRM lead API and tenant scoping. |
| [`audits/fix-c3.md`](audits/fix-c3.md) | Reservation race-condition audit. | `HISTORICO/POR VALIDAR` | Related to reservation logic and transaction behavior. |
| [`audits/fix-c3-validation.md`](audits/fix-c3-validation.md) | Reservation concurrency validation and type fix notes. | `HISTORICO/POR VALIDAR` | Companion to `fix-c3.md`. |
| [`audits/fix-c4.md`](audits/fix-c4.md) | Public lead capture spam/rate-limit fix. | `HISTORICO/POR VALIDAR` | Related to rate limiting and public lead intake. |
| [`audits/fix-a1.md`](audits/fix-a1.md) | Pusher channel auth fix. | `HISTORICO/POR VALIDAR` | Related to realtime auth and Pusher config. |
| [`audits/fix-a2.md`](audits/fix-a2.md) | `Lead.orgId` multi-tenant hardening. | `HISTORICO/POR VALIDAR` | Related to lead ingestion and tenant scoping. |
| [`audits/fix-a2-strategy.md`](audits/fix-a2-strategy.md) | Lead org migration strategy. | `HISTORICO/POR VALIDAR` | Strategy companion to `fix-a2.md`. |
| [`audits/fix-a4.md`](audits/fix-a4.md) | Rate limiting status and upgrade plan. | `REFERENCIA` | Related to `security/security-architecture.md`. |
| [`audits/fix-a5-a6.md`](audits/fix-a5-a6.md) | Guards consolidation and role constants notes. | `HISTORICO/POR VALIDAR` | Related to role constants and guard files. |
| [`audits/fix-m1.md`](audits/fix-m1.md) | Audit logs in sensitive actions. | `HISTORICO/POR VALIDAR` | Related to audit logging coverage. |
| [`audits/fix-m4.md`](audits/fix-m4.md) | Password reset fields and flow notes. | `HISTORICO/POR VALIDAR` | Related to Prisma `User` fields and auth actions. |

## Missing Or Incomplete Documentation

These are gaps, not existing files:

| Area | Need |
|---|---|
| Data model overview | A concise map of core Prisma entities and relationships beyond the schema file. |
| CRM and leads | Lead lifecycle, ingestion paths, assignment, pipeline stages, and notifications. |
| Reservations | Reservation lifecycle, transaction/locking expectations, payments, and state transitions. |
| Investments | Investor flow, escrow concepts, price history, and project funding fields. |
| Workflows | Workflow engine triggers, node types, run persistence, and failure behavior. |
| LogicToop current state | Current implementation map separated from roadmap. |
| Integrations | Confirmed providers, required env vars, fallback behavior, and operational owners. |
| Storage | Local/S3 storage behavior, upload/delete rules, and public URL conventions. |
| Realtime | Channel naming, auth endpoint policy, and notification flow. |
| Deployment | Vercel environments, required variables, build expectations, and rollback notes. |
| ADRs | Lightweight architectural decision records for major choices. |
