# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 14 TypeScript app. Route handlers and pages live in `app/`, with route groups for `app/(public)`, `app/(auth)`, and `app/(dashboard)`. Shared UI is in `components/`, domain logic and server helpers are in `lib/`, shared types are in `types/`, and configuration lives in `config/`. Prisma schema, seeds, and migrations are under `prisma/`; extra SQL lives in `migrations/`. Tests are grouped in `__tests__/`. Static assets are in `public/`; reference artifacts are in `attached_assets/`.

## Build, Test, and Development Commands

- `npm run dev`: starts the local app on `http://localhost:5000`.
- `npm run build`: builds the production Next.js app.
- `npm run start`: serves the built app on port `5000`.
- `npm run lint`: runs Next ESLint.
- `npm run lint:strict`: fails on any ESLint warning.
- `npm run typecheck`: runs `tsc --noEmit --skipLibCheck`.
- `npm run test`: runs Vitest once.
- `npm run test:watch`: runs Vitest in watch mode.
- `npm run check-all`: runs typecheck plus build.
- `npm run db:migrate:dev`: applies local Prisma migrations.
- `npm run db:seed`: seeds Prisma data.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and the `@/*` alias for root imports. Follow App Router patterns: colocate route-specific UI near its route, and keep reusable components in `components/`. Prefer kebab-case filenames, matching `settings-form.tsx` and `project-access-actions.ts`. ESLint extends `next/core-web-vitals` and `next/typescript`; unresolved JSX identifiers are errors, while unused variables and explicit `any` are warnings. Keep Tailwind usage consistent with nearby components.

## Documentation Sidecars

When modifying a complex, user-facing, security-sensitive, integration-heavy, or frequently audited file, create or update a sibling Markdown file in the same folder. The sidecar filename must match the source filename, replacing the source extension with `.md`; for example, `project-preview-viewer.tsx` should be documented in `project-preview-viewer.md`.

Use sidecars to give future reviewers fast context before reading implementation details. Do not create sidecars for trivial wrappers, tiny presentational components, generated files, or files whose behavior is already obvious from a short read.

Each sidecar should include these sections when relevant:

- `Purpose`: what the file does and where it is used.
- `User Intent / Change Context`: what the user wanted when the file was changed, what problem was being solved, and what outcome should remain true after future edits.
- `Inputs and Outputs`: important props, params, API payloads, return values, or persisted data touched by the file.
- `Data Flow`: how data moves through the file, including server/client boundaries, database reads, API calls, cookies, or external services.
- `Dependencies`: important local helpers, providers, environment variables, packages, or services.
- `Maintenance Rules`: rules future contributors must preserve, such as i18n requirements, auth checks, tenant isolation, validation, or formatting conventions.
- `Risks and Edge Cases`: failure modes, security concerns, race conditions, hydration issues, fallbacks, or performance-sensitive behavior.
- `Validation`: commands or manual checks that should be run after changing the file.

When updating a documented source file, update its sidecar in the same change. If a change spans multiple files and introduces a new reusable helper, workflow, or contract, document the new file with its own sidecar as well.

## Testing Guidelines

Vitest is configured in `vitest.config.ts` with `node` environment and React plugin support. Test files must match `__tests__/**/*.test.ts` or `__tests__/**/*.test.tsx`. Place tests by domain, for example `__tests__/auth/...` or `__tests__/components/dashboard/...`. Run `npm run test` before handing off changes to auth, data mutations, UI behavior, or workflow logic.

## Commit & Pull Request Guidelines

Recent history uses concise prefixes such as `feat:`, `fix:`, and `docs:`; keep commits action-oriented, for example `fix: restore dashboard route guard`. PRs should include the problem, solution, validation commands, linked issues when available, and screenshots for UI changes. Note migrations, seed changes, or environment updates explicitly.

## Security & Configuration Tips

Read `REPO_RULES.md` before changing environment files, Docker, ports, credentials, Prisma connection behavior, or Vercel settings. Local development must use `.env.local`, app port `5000`, and Postgres host port `5433`. Do not commit secrets or production credentials.
