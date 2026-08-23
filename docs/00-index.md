# Seventoop Documentation Vault

This `docs/` directory is the versioned technical documentation for Seventoop and also the local Obsidian Vault. Files should stay useful from GitHub, a text editor, and Obsidian.

Use this page as the entry point before browsing the rest of the vault. Obsidian links such as [[documentation-map]] are included for navigation, but every important target is also linked as a normal Markdown path.

## Primary Sources of Truth

- [`../REPO_RULES.md`](../REPO_RULES.md) - mandatory source of truth for local environment, Docker, ports, environment files, Prisma datasource expectations, and Vercel environment separation.
- [`../README.md`](../README.md) - local quick start and environment summary.
- [`../CLAUDE.md`](../CLAUDE.md) - current agent-facing architecture and command guide.
- [`documentation-map.md`](documentation-map.md) / [[documentation-map]] - inventory of current documentation and known gaps.
- [`architecture/system-overview.md`](architecture/system-overview.md) / [[system-overview]] - high-level architecture overview based on current repository evidence.

## Architecture

- [`architecture/system-overview.md`](architecture/system-overview.md) - high-level system overview.
- [`architecture/mutation-and-lead-ingestion-rules.md`](architecture/mutation-and-lead-ingestion-rules.md) - architectural rules for domain mutations and lead ingestion.

## Security

- [`security/security-guardrails.md`](security/security-guardrails.md) - security guardrail system.
- [`security/security-architecture.md`](security/security-architecture.md) - rate limiting strategy.
- [`security/pull-request-security-checklist.md`](security/pull-request-security-checklist.md) - PR security checklist.
- [`security/id-strategy.md`](security/id-strategy.md) - identifier strategy and enumeration defense.

## LogicToop

- [`logictoop/architecture-v1.md`](logictoop/architecture-v1.md) - LogicToop v1 architecture baseline.
- [`logictoop/roadmap.md`](logictoop/roadmap.md) - LogicToop v2 roadmap.

## Project Landing

- [`project-landing/04-data-model.md`](project-landing/04-data-model.md) - project landing public contract and data model notes.
- [`project-landing/05-landing-blocks.md`](project-landing/05-landing-blocks.md) - landing block architecture.
- [`project-landing/06-implementation-phases.md`](project-landing/06-implementation-phases.md) - implementation phases and known risks.

## Audits

- [`audits/global-audit-2026-03-14.md`](audits/global-audit-2026-03-14.md) - global technical audit snapshot.
- [`audits/global-audit.md`](audits/global-audit.md) - earlier global technical audit snapshot.
- [`audits/security-audit-2026-03-14.md`](audits/security-audit-2026-03-14.md) - security audit snapshot.
- [`audits/login-audit.md`](audits/login-audit.md) - authentication and authorization audit.
- [`audits/deduplicacion-ejecutada.md`](audits/deduplicacion-ejecutada.md) - executed public landing deduplication notes.
- [`audits/fix-c1.md`](audits/fix-c1.md), [`audits/fix-c2.md`](audits/fix-c2.md), [`audits/fix-c3.md`](audits/fix-c3.md), [`audits/fix-c3-validation.md`](audits/fix-c3-validation.md), [`audits/fix-c4.md`](audits/fix-c4.md) - critical finding follow-ups.
- [`audits/fix-a1.md`](audits/fix-a1.md), [`audits/fix-a2.md`](audits/fix-a2.md), [`audits/fix-a2-strategy.md`](audits/fix-a2-strategy.md), [`audits/fix-a4.md`](audits/fix-a4.md), [`audits/fix-a5-a6.md`](audits/fix-a5-a6.md) - high-priority finding follow-ups.
- [`audits/fix-m1.md`](audits/fix-m1.md), [`audits/fix-m4.md`](audits/fix-m4.md) - medium-priority finding follow-ups.

## Authentication

- [`auth-runbook.md`](auth-runbook.md) - production auth runbook, including provider setup, password flows, and diagnostics.

## Documentation In Construction

The following areas need dedicated or consolidated documentation. They are listed as gaps, not as existing documents:

- Data model overview across Prisma entities.
- Roles and permissions matrix.
- Multi-tenancy and organization scoping.
- CRM and leads lifecycle.
- Reservations lifecycle.
- Investments and escrow concepts.
- Workflows engine behavior.
- External integrations overview.
- Storage operations and media lifecycle.
- Realtime notifications and channel policy.
- Deployment and environment operations beyond the current runbooks.
- ADRs / architectural decisions.
- Technical debt index linked to verified findings.
