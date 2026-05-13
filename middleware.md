# Purpose

This file is the central Next.js middleware for protected dashboard/onboarding pages and API rate limiting.

# User Intent / Change Context

The current change keeps public language switching working through `/api/set-language` while preserving middleware coverage for the rest of `/api/:path*`. Future edits must not fix the locale selector by removing all API routes from the matcher, because that disables the shared API rate-limit layer.

# Inputs and Outputs

- Input: incoming `NextRequest`, route pathname, auth token data from NextAuth, client IP headers.
- Output: `NextResponse.next()`, redirects for dashboard/onboarding access rules, or JSON `429` responses for rate-limited requests.

# Data Flow

Requests first bypass middleware only when the path is explicitly listed in `PUBLIC_API_PATHS`. All other matched requests go through `withAuth`, which attaches `req.nextauth.token` before route-specific authorization, rate-limit checks, and KYC/demo redirects run.

# Dependencies

- `next-auth/middleware` for JWT/session-aware route protection.
- `@/lib/rate-limit` for auth, reset, webhook, and general API rate limits.
- `NextResponse` for redirects and JSON error responses.

# Maintenance Rules

- Keep `/api/:path*` in the matcher unless each affected API route has an equivalent protection path elsewhere.
- Add truly public API exceptions to `PUBLIC_API_PATHS`; do not broaden the exception with prefixes unless the whole prefix is intentionally public.
- API routes must remain authorized in the callback so their own guards can decide auth while middleware still applies rate limiting.
- Dashboard admin checks must continue to require `ADMIN` or `SUPERADMIN`.

# Risks and Edge Cases

- Removing API matcher coverage can silently disable general API rate limiting.
- Running locale preference endpoints through auth middleware can break anonymous public UI interactions.
- Missing Redis configuration in non-development environments soft-fails rate limiting by design in `lib/rate-limit.ts`.

# Validation

- Run `npm run typecheck`.
- Run `npm run build` after changing matcher patterns.
- Manually verify that the language selector can POST to `/api/set-language` while another non-public API route still passes through middleware.
