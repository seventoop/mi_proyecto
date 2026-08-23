# AGENTS.md

This file is the shared operating guide for Codex and other automated agents working in Seventoop. It complements `REPO_RULES.md`, `CLAUDE.md`, and `README.md`; do not duplicate those files here.

## Read Before Working

1. Read `REPO_RULES.md` before touching environment, ports, Docker, credentials, Prisma datasource settings, deployment variables, or scripts that depend on them.
2. Read `README.md` for local startup and environment conventions.
3. Read `CLAUDE.md` for the current architecture map, guard patterns, route groups, role areas, storage, realtime, and workflow notes.
4. Read the relevant files under `docs/` for the area being changed. Start with `docs/00-index.md` and `docs/documentation-map.md` when unsure.
5. Inspect the actual code and configuration before stating how the system behaves.

## Source of Truth

`REPO_RULES.md` is the mandatory source of truth for environment rules. If another document, script, or comment conflicts with it, treat the conflict as a finding and resolve toward `REPO_RULES.md` only after checking the implementation.

Do not invent behavior, endpoints, roles, workflows, database rules, or deployment assumptions. Mark uncertain claims as unverified until supported by code, configuration, docs with current evidence, or runtime validation.

## Secrets and Environments

Do not read aloud, copy, log, commit, or expose secrets from `.env`, `.env.local`, provider dashboards, shell history, tokens, API keys, service-role credentials, or local MCP/Obsidian configuration. It is acceptable to verify whether an expected file or variable exists without revealing its value.

Do not modify production, Vercel production/preview settings, remote databases, cloud storage, OAuth providers, or external integrations without explicit user authorization. Do not run production migrations, destructive database commands, seeds, sync scripts, or backfills unless the user explicitly approves that operation and target environment.

## Change Policy

Prefer small, reversible, reviewable changes. Keep each change scoped to the user request and avoid opportunistic refactors.

Before changing functionality, inspect the likely impact area: routes, Server Actions, API routes, guards, Prisma queries, tests, docs, and any tenant or role boundary. For important behavior changes, describe the risk and validation plan before applying broad edits.

Do not delete historical, duplicated, or apparently stale documentation without verifying its status and receiving explicit authorization. When documentation is contradicted by code, record the contradiction instead of silently erasing history.

## Validation

Run validations proportional to the change. Documentation-only changes usually need `git diff --check` and a careful diff review. Functional changes generally need the closest focused tests plus `npm run typecheck`; broader changes may also require `npm run lint`, `npm run test`, `npm run build`, or `npm run security:check`.

Do not run migrations, seeds, remote sync scripts, or deployment commands as validation unless explicitly authorized.

## Documentation Rules

`docs/` is both versioned repository documentation and the Obsidian Vault for Seventoop. Markdown must remain readable in GitHub. Obsidian wikilinks such as `[[00-index]]` are allowed when useful, but documents should not depend exclusively on Obsidian features to make sense.

`docs/.obsidian/` is local vault configuration and must not be versioned.

When behavior, architecture, roles, data flow, integrations, or environment rules change in a meaningful way, update or add documentation in the same change set when practical. Keep references to existing docs current and prefer linking over copying long sections.
