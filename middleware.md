# Purpose

This file is the central Next.js middleware for protected dashboard/onboarding pages and selected API rate limiting.

# User Intent / Change Context

The current change keeps public language switching working through `/api/set-language` without widening middleware coverage to every API route. The selector bug is solved with a narrow public exception, not by routing all `/api/:path*` traffic through middleware.

# Inputs and Outputs

- Input: incoming `NextRequest`, route pathname, auth token data from NextAuth, client IP headers.
- Output: `NextResponse.next()`, redirects for dashboard/onboarding access rules, or JSON `429` responses for rate-limited requests.

# Data Flow

Requests first bypass middleware only when the path is explicitly listed in `PUBLIC_API_PATHS`. All other matched requests go through `withAuth`, which attaches `req.nextauth.token` before route-specific authorization, rate-limit checks, and KYC/demo redirects run.

# Dependencies

- `next-auth/middleware` for JWT/session-aware route protection.
- `@/lib/rate-limit` for the API paths currently included in `config.matcher`.
- `NextResponse` for redirects and JSON error responses.

# Maintenance Rules

- Keep API matcher entries narrow. Do not add `/api/:path*` in an i18n fix because that changes middleware behavior for unrelated APIs.
- Add truly public API exceptions to `PUBLIC_API_PATHS`; do not broaden the exception with prefixes unless the whole prefix is intentionally public.
- API routes that are explicitly matched must remain authorized in the callback so their own guards can decide auth while middleware still applies rate limiting.
- Dashboard admin checks must continue to require `ADMIN` or `SUPERADMIN`.

# Risks and Edge Cases

- Broadening API matcher coverage can unexpectedly affect public APIs, uploads, webhooks, latency, and rate-limit behavior.
- Running locale preference endpoints through auth middleware can break anonymous public UI interactions.
- Missing Redis configuration in non-development environments soft-fails rate limiting by design in `lib/rate-limit.ts`.

# Validation

- Run `npm run typecheck`.
- Run `npm run test -- __tests__/i18n/dictionaries.test.ts`.
- Run `npm run i18n:audit`.
- Run `npm run build` after changing matcher patterns.
- Confirm `config.matcher` includes `/api/set-language` but does not include `/api/:path*`.
- Manually verify that the language selector can POST to `/api/set-language`.
