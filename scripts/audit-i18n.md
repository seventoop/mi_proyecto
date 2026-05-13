# Purpose

`audit-i18n.mjs` audits the local Spanish and English dictionaries plus likely hardcoded Spanish UI text in source files.

# User Intent / Change Context

This audit exists to prevent public i18n regressions after language-switching fixes. Future changes should keep dictionary structure errors blocking, while allowing the broader hardcoded-text scan to remain informational unless strict mode is explicitly requested.

# Inputs and Outputs

- Inputs: `lib/i18n/dictionaries/es.json`, `lib/i18n/dictionaries/en.json`, and source files under `app/`, `components/`, and `lib/`.
- Outputs: console sections for dictionary key parity, empty values, equal leaf values, and hardcoded Spanish candidates.
- Exit code: non-zero for dictionary structure errors, and for hardcoded Spanish candidates only in strict mode.

# Data Flow

The script reads both dictionaries from disk, flattens their deep keys, compares both directions, reports empty strings, then walks source folders looking for Spanish-specific characters outside ignored paths and line patterns.

# Dependencies

- Node.js built-ins only: `fs` and `path`.
- No `node_modules` dependency is required, so CI can run `npm run i18n:audit` without an install step.

# Maintenance Rules

- Keep normal mode suitable for CI: block missing keys and empty strings, but do not block existing dashboard/admin hardcoded text.
- Keep `--strict-hardcoded` available for future cleanup phases.
- Prefer explicit allowlists for known proper nouns, brand names, currencies, and business terms.
- Use escaped Unicode ranges for Spanish character detection so the script is stable across Windows shells and CI logs.

# Risks and Edge Cases

- The hardcoded scan is heuristic and can report comments, legal/business copy, or non-user-visible strings.
- Equal dictionary values are not always wrong; names, brands, acronyms, and currency labels may intentionally match.
- Adding dependencies would make the CI job slower and require an install step.

# Validation

- Run `npm run i18n:audit`.
- Run `npm run i18n:audit:strict-hardcoded` when intentionally checking for remaining hardcoded UI debt.
- Run `npm run test -- __tests__/i18n/dictionaries.test.ts` after changing dictionaries or i18n helpers.
