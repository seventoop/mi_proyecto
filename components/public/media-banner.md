# Purpose

`media-banner.tsx` renders the public landing media carousel for dynamic image or video banners. It supports autoplay, manual previous/next controls, CTA links, and an empty-state display.

# User Intent / Change Context

The user wants visible public landing text to stay localized. This component already used dictionary text for the empty state, but its CTA fallback and carousel accessibility labels were hardcoded in Spanish.

# Inputs and Outputs

- Inputs: `banners` from public banner data and dictionary copy from `useLanguage()`.
- Outputs: media slides, localized fallback CTA text, localized previous/next labels, and optional CTA navigation.

# Data Flow

The component tracks the current banner index, pauses/resumes videos based on visibility, and auto-advances slides. Banner content itself comes from data and is not translated here; only local UI fallbacks and controls use the dictionary.

# Dependencies

- `next/image` for image banners.
- `lucide-react` carousel controls.
- `useLanguage()` for `mediaBanner` dictionary keys.
- Banner fields from the public banner action.

# Maintenance Rules

- Do not hardcode visible fallback copy or accessibility labels.
- Treat banner titles, subtitles, CTA text, and media URLs as content data from the database.
- Preserve video mute/autoplay behavior and cleanup timers/observers when changing carousel logic.

# Risks and Edge Cases

- Video autoplay can fail depending on browser policy; failures are intentionally ignored after muting.
- Empty banner lists must still render a harmless localized system placeholder.
- Database-provided CTA text may remain in the language authored by admins.

# Validation

- `npm run typecheck`
- Manual: switch to English and verify carousel controls and fallback CTA text are English when data does not provide CTA text.
