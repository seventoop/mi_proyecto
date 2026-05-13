# Purpose

`floating-nav.tsx` renders the fixed public landing navigation controls that appear after scrolling. The buttons move the visitor to the top, previous section, next section, or contact section.

# User Intent / Change Context

The user wants the public UI to remain fully localized after changing language. This file previously had Spanish `aria-label` values hardcoded, which affected accessible navigation even when the visible page switched to English.

# Inputs and Outputs

- Inputs: current scroll position, the fixed `SECTIONS` id list, and dictionary labels from `useLanguage()`.
- Outputs: scroll actions through `window.scrollTo` and localized accessibility labels.

# Data Flow

The component listens to scroll events, calculates the active section, and conditionally renders navigation buttons. The labels are read from `dictionary.floatingNav`, so the accessibility text follows the active locale.

# Dependencies

- `useLanguage()` from `components/providers/language-provider`.
- `lucide-react` chevron icons.
- DOM section ids: `inicio`, `proyectos`, `desarrolladores`, `como-funciona`, `noticias`, `testimonios`, `contacto`.

# Maintenance Rules

- Keep `SECTIONS` aligned with the public landing section ids.
- Any new button label or `aria-label` must be added to both dictionaries.
- Preserve passive scroll listeners and cleanup in `useEffect`.

# Risks and Edge Cases

- Missing section ids make the navigation skip that target silently.
- Header height changes may require updating `HEADER_OFFSET`.
- Accessibility regressions are easy to miss visually because these labels are not visible text.

# Validation

- `npm run typecheck`
- Manual: scroll the landing in Spanish and English, then inspect the floating nav button accessible names.
