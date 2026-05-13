# Purpose

`formulario-captura.tsx` renders the public landing lead-capture form in the opportunities/profile section. It collects contact data, target location, investment intent, project preferences, and budget range before sending the payload to `crearLeadLanding`.

# User Intent / Change Context

The user wants the public landing to switch cleanly between Spanish and English. This file previously kept Zod validation and submit fallback errors hardcoded in Spanish, so empty-form errors still appeared in Spanish after changing the UI language. Future edits must keep all visible labels, placeholders, validation messages, and submit errors sourced from the i18n dictionary.

# Inputs and Outputs

- Inputs: form fields registered through `react-hook-form`, dictionary copy from `useLanguage()`, and fixed internal option values such as `VIVIR`, `INVERTIR`, `LOTE_URBANIZACION`, and `DEPARTAMENTO`.
- Output: a server action call to `crearLeadLanding` with lead data and `origen: "formulario_landing"`.
- UI output: success state, field validation messages, and localized generic failure messages.

# Data Flow

The component reads `dictionary.profile.form` from `LanguageProvider`. The validation schema is created inside the component with the active dictionary so Zod messages follow the selected locale. On submit, the client calls the server action and displays only localized generic errors on failure, avoiding raw backend Spanish messages in the public UI.

# Dependencies

- `useLanguage()` from `components/providers/language-provider`.
- `react-hook-form`, `@hookform/resolvers/zod`, and `zod`.
- `crearLeadLanding` from `lib/actions/leads`.
- Dictionary keys under `profile.form.validation` and `profile.form.errors` in both `es.json` and `en.json`.

# Maintenance Rules

- Do not add visible text directly in this component; add keys to both dictionaries.
- Keep internal enum/contract values untranslated unless the server contract changes.
- If backend errors become user-facing, return stable error codes and map them to dictionary keys instead of displaying raw messages.
- Preserve the budget range refinement so the maximum cannot be lower than the minimum.

# Risks and Edge Cases

- Empty numeric inputs coerce to `0`, so the min/max required messages come from `.min(1)`.
- If the language changes without a full reload, the schema must still be recreated from the current dictionary.
- Server action failures may contain Spanish text internally; this component intentionally shows localized generic text to users.

# Validation

- `npm run test -- __tests__/i18n/dictionaries.test.ts`
- `npm run i18n:audit`
- `npm run typecheck`
- Manual: switch the landing to English, submit the empty form, and confirm every field error appears in English.
