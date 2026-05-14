# Purpose

`testimonios-carousel.tsx` renders the public testimonials carousel on the landing using Swiper. It can show approved testimonials from the database or curated dictionary testimonials.

# User Intent / Change Context

The user reported that the recommendation/testimonial carousel kept Spanish content after switching to English. Until testimonials have bilingual database fields, English intentionally uses curated dictionary content instead of Spanish database records.

# Inputs and Outputs

- Inputs: active locale and dictionary from `useLanguage()`, approved testimonial records from `getTestimonios()` for Spanish.
- Outputs: carousel slides with localized testimonial text, author role, rating stars, and optional author image.

# Data Flow

When locale is Spanish, the component fetches approved testimonials and falls back to dictionary mock data if the database returns none. When locale is English, it skips the database fetch and renders dictionary content directly so Spanish database text cannot leak into the English UI.

# Maintenance Rules

- Do not fetch or render database testimonials for English until the database model supports translated testimonial fields.
- Keep `testimonials.mockData` complete in both dictionaries; the dictionary parity test protects this.
- If bilingual testimonial fields are added later, update this component and the admin moderation flow together.

# Risks and Edge Cases

- English currently trades live database content for curated consistency.
- Switching language client-side before reload should still update because `locale` is a hook dependency.

# Validation

- `npm run i18n:audit`
- Manual: switch landing to English and verify the carousel contains English quotes and roles.
