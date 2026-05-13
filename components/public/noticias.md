# Purpose

`noticias.tsx` renders the public landing news cards. It currently uses local mock news data with Spanish and English title/description fields.

# User Intent / Change Context

The user reported remaining Spanish in the public landing after switching to English. This file already selected title and description by locale, but the read-more fallback and card tags could still appear in Spanish.

# Inputs and Outputs

- Inputs: active locale and dictionary copy from `useLanguage()`.
- Outputs: localized section heading, localized mock card title/description/tag, formatted date, and localized read-more label.

# Data Flow

The component reads `locale` from `LanguageProvider` to choose `titleEs/titleEn`, `descEs/descEn`, and `tagEs/tagEn`. Section labels and read-more text come from `dictionary.news`.

# Dependencies

- `useLanguage()` from `components/providers/language-provider`.
- `next/image` for card images.
- `ScrollAnimationWrapper` for reveal animation.
- `toLocaleDateString()` with `es-AR` or `en-US` formatting.

# Maintenance Rules

- If mock news evolves into database content, define explicit translated fields or treat it as authored content.
- Do not use `(t as any)` for dictionary keys; missing keys should be caught by TypeScript and dictionary parity tests.
- Keep all visible static labels in `news` dictionary keys.

# Risks and Edge Cases

- Local mock data can bypass dictionary audits because it is embedded content; keep both locale variants together.
- Date formatting depends on browser/Node Intl support for the chosen locale.

# Validation

- `npm run typecheck`
- Manual: switch landing to English and confirm card tags, read-more text, dates, and headings are English.
