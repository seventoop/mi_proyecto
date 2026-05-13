# Purpose

This component renders the public contact form used by landing and project/unit pages. It can prefill inquiry text when a user selects a lot/unit from the public UI.

# User Intent / Change Context

The current change supports the public i18n cleanup by keeping selected-lot text localized and avoiding duplicated currency labels in generated inquiry messages.

# Inputs and Outputs

- Props: optional `proyectoId`, compact layout flag, custom class names, and lead origin override.
- Inputs: form fields for name, email, phone, and message.
- Event input: `seventoop:select-lote`, carrying lot number, price, currency, and surface.
- Output: calls `crearConsultaContacto` to create a lead/contact inquiry.

# Data Flow

The component reads `locale` and `dictionary` from `useLanguage()`. Zod validation messages, placeholders, visible labels, success text, selected-lot text, and errors come from the active dictionary. When a lot is selected, its data is stored locally and merged into the outgoing message before submitting the lead action.

# Dependencies

- `react-hook-form` and `zod` for validation.
- `@/components/providers/language-provider` for locale and dictionary data.
- `@/lib/i18n/format` for localized interpolation and currency formatting.
- `@/lib/actions/leads` for creating the contact inquiry.

# Maintenance Rules

- Do not add visible Spanish or English text directly in JSX; use dictionary keys.
- Keep dynamic phrases as full dictionary templates and interpolate values with `formatMessage`.
- Use `formatCurrency` for lot prices instead of manual currency concatenation.
- Keep `aria-label` and placeholders localized.

# Risks and Edge Cases

- The selected-lot browser event may contain partial lot data; always guard optional fields.
- The active dictionary changes when the language provider updates, so validation schemas must depend on `t`.
- Price formatting already includes the currency code or symbol; appending `moneda` again can duplicate visible text.

# Validation

- Run `npm run typecheck`.
- Manually submit the form in Spanish and English.
- Select and remove a lot/unit, then confirm the selected-lot UI and outgoing message remain localized.
