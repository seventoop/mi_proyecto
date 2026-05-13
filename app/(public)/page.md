# Purpose

`page.tsx` is the public home page composition for the landing. It loads time-bounded public data, renders the landing sections, and defines localized page metadata for the home route.

# User Intent / Change Context

The user wants the landing to stop leaking Spanish text when English is selected. The page previously exported static Spanish metadata, so the browser title and description stayed Spanish even after the app locale changed. Metadata now reads `NEXT_LOCALE` and uses dictionary keys.

# Inputs and Outputs

- Inputs: `NEXT_LOCALE` cookie, public banner data, featured projects, and system configuration values for hero copy.
- Outputs: localized `Metadata`, the landing component tree, and fallback-safe public sections.

# Data Flow

`generateMetadata()` resolves the cookie locale with `resolveLocale()`, loads the matching dictionary via `getDictionary()`, and returns `homeMetadata`. `HomePage()` fetches banners, featured projects, and hero configuration in parallel through `withHomeTimeout()` so slow public data does not block rendering indefinitely.

# Dependencies

- `next/headers` cookies.
- `getDictionary()` and `resolveLocale()` from `lib/i18n`.
- Public actions: `getBannersLanding`, `getProyectosDestacados`, and `getSystemConfig`.
- Public components under `components/public`.

# Maintenance Rules

- Do not reintroduce static Spanish metadata in this route.
- Keep home metadata keys present in both `es.json` and `en.json`.
- Keep public data fallbacks safe and fast; slow database calls should continue using `withHomeTimeout()`.
- User-generated, database, or legal content should not be translated here unless a product requirement defines translated fields.

# Risks and Edge Cases

- Missing or invalid locale cookies fall back to Spanish through `resolveLocale()`.
- Banners and hero text may come from database/system config and are treated as content data, not dictionary UI.
- Page metadata is server-rendered, so validate it after changing cookie or language behavior.

# Validation

- `npm run typecheck`
- `npm run build`
- Manual: switch to English and verify the home title/description are English in browser metadata.
