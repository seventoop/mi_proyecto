# Auth runbook (production)

This document is the operational checklist for keeping login working in
production at https://seventoop.com. It covers the env vars expected in
Vercel, the Google Cloud Console redirect URIs, how to recover from
"only-Google" accounts, and how to verify everything after a deploy.

The app does **not** use NextAuth's `Account`/`Session` tables; identity
state is held on the `User` row (`password`, `googleId`,
`passwordResetToken`, `passwordResetExpires`). Two auth flows exist:

- `CredentialsProvider` (email + password, bcrypt 10 rounds)
- `GoogleProvider` (OAuth) — creates the user on first login if none exists,
  via the `/google-register` pre-registration screen.

A given user can have:

- `has_password: true` and `has_google: false` → only credentials work.
- `has_password: false` and `has_google: true` → only Google works.
  Trying email/password shows: _"Esta cuenta solo puede iniciar sesión con
  Google. Usá el botón 'Continuar con Google'."_
- both → either flow works.

---

## 1. Required environment variables in Vercel

Set these in Vercel → Project → Settings → Environment Variables, for both
`Production` and (if applicable) `Preview`:

| Variable               | Required | Notes                                                                 |
| ---------------------- | -------- | --------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | Railway connection string with `?sslmode=require`.                    |
| `NEXTAUTH_SECRET`      | yes      | 32+ byte random string. **Do not rotate** without invalidating sessions on purpose. |
| `NEXTAUTH_URL`         | yes      | `https://seventoop.com` for prod. For previews, the preview URL.      |
| `GOOGLE_CLIENT_ID`     | yes      | From Google Cloud Console → APIs & Services → Credentials.            |
| `GOOGLE_CLIENT_SECRET` | yes      | Same OAuth Client as `GOOGLE_CLIENT_ID`.                              |
| `RESEND_API_KEY`       | optional | If absent, `/forgot-password` returns an honest "email not enabled" message instead of pretending it sent. |

> The app never reads secrets from the codebase. Anything not in Vercel
> (or in your local `.env.local`) is treated as missing.

### Quick check after a deploy

`GET https://seventoop.com/api/health` returns booleans (no values) for the
auth-related env vars:

```json
{
  "env": {
    "DATABASE_URL": true,
    "NEXTAUTH_SECRET": true,
    "NEXTAUTH_URL": "https://seventoop.com",
    "GOOGLE_CLIENT_ID": true,
    "GOOGLE_CLIENT_SECRET": true,
    "RESEND_API_KEY": true,
    "NODE_ENV": "production"
  }
}
```

If anything is `false` or `"NOT SET"`, fix it in Vercel and redeploy.

---

## 2. Google Cloud Console — Authorized Redirect URIs

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0
Web Client, the **Authorized redirect URIs** must include:

- `https://seventoop.com/api/auth/callback/google` (production, **required**)
- `http://localhost:5000/api/auth/callback/google` (local dev, optional)
- For preview deploys: `https://<preview-host>/api/auth/callback/google`
  (Google does not accept wildcards; add each preview host you actually use,
  or skip Google login on previews.)

Symptoms of a missing/incorrect redirect URI:

- 404 right after picking your Google account, or a Google error page that
  says `redirect_uri_mismatch`.
- The Vercel logs show no `[AUTH] google signIn` line for that attempt
  (NextAuth never reaches our callback because Google rejected the
  redirect).

The exact value Google must allow has to match `${NEXTAUTH_URL}/api/auth/callback/google`,
character for character. If `NEXTAUTH_URL` is `https://www.seventoop.com`,
the URI must include `www.`.

---

## 3. Self-service: a Google-only user adds a password from their profile

Preferred path for users with `has_google: true, has_password: false`
who want to also be able to log in with email + password. No shell
access required.

This entry point is **scoped on purpose** to the only-Google case.
Users who already have a password (`has_password: true`) should rotate
it via the standard `/forgot-password` flow; the affordance is hidden
for them in the UI and the server action rejects the request with a
clear message if invoked anyway.

1. The user logs in (with Google) and goes to
   `/dashboard/configuracion` → section **Seguridad**.
2. They see a button labelled _"Agregar contraseña a mi cuenta"_, which
   calls `requestPasswordSetup` in `lib/actions/auth-actions.ts`.
3. The server action:
   - Verifies the user is authenticated (`requireAuth`).
   - Refuses if the user already has a password or does not have a
     linked Google account, returning a friendly error.
   - Generates a 32-byte token, stores it in
     `User.passwordResetToken` with a 1-hour expiry in
     `User.passwordResetExpires` — the same columns the
     `/forgot-password` flow uses, so there is one canonical
     "set-password-via-token" surface.
   - Sends an email via Resend to the user's own `User.email` with a
     link to `/reset-password?token=...`.
   - On successful send, writes an `AuditLog` row with
     `action: "AUTH_PASSWORD_SET_REQUESTED"`, details
     `{ method: "PROFILE_SELFSERVICE", previouslyHadPassword, hasGoogle }`.
     The audit happens **after** Resend confirms send, so a
     "requested" row implies a real link is in flight. If Resend fails
     or throws, the token is rolled back (cleared) and an
     `AUTH_PASSWORD_SET_REQUEST_FAILED` row is written instead, with
     `details.reason` set to `RESEND_SEND_ERROR` or `RESEND_THREW`.
4. The user clicks the link and lands on the existing
   `/reset-password` page, picks a password and submits.
5. `resetPassword` in `lib/actions/auth-actions.ts` writes the bcrypt
   hash to `User.password`, clears the token, and audits one of:
   - `AUTH_PASSWORD_SET_BY_USER` if the user had no password before
     (typical for previously Google-only accounts).
   - `AUTH_PASSWORD_RESET_SUCCESS` if they were rotating an existing
     password.

After completion, an originally Google-only user can log in **both**
with email + password and with Google — the `User` row keeps both
`password` and `googleId`. This replaces the `npm run set-password`
script for the common case.

If `RESEND_API_KEY` is missing, the action returns an honest error
("escribinos a soporte@seventoop.com") and logs
`[set-password] RESEND_API_KEY missing — email not sent for email=abc***`
so the team can detect the misconfiguration in production logs. The
script in section 4 is still available as a fallback for that scenario.

### 3.1 Sentry alerts for the add-password email pipeline

Add-password email failures reach Sentry too, mirroring the reset
pipeline (see section 5.1). The team finds out before a Google-only
user tries to self-serve a password and quietly gets nothing. Three
failure modes emit events, all tagged `area: "auth.setup"` plus a
`reason` tag identifying the branch:

| `reason` tag             | When it fires                                                          | Sentry event type                       |
| ------------------------ | ---------------------------------------------------------------------- | --------------------------------------- |
| `RESEND_API_KEY_MISSING` | `requestPasswordSetup` hit and `process.env.RESEND_API_KEY` is unset.  | `captureMessage` (`level: "error"`)     |
| `RESEND_SEND_ERROR`      | `resend.emails.send` returned an `error` payload.                      | `captureException` of that error        |
| `RESEND_THREW`           | `resend.emails.send` threw (network, SDK, etc.).                       | `captureException` of the thrown value  |

The `area:` tag is intentionally **different** from the reset
pipeline's `area:auth.reset` so each flow can be filtered (and paged
on) independently in Sentry.

Rate limiting reuses the shared in-process helper
`shouldEmitAuthEmailAlert` in `lib/actions/auth-actions.ts`: **one event
per hour per `reason` per Node process per flow**. The keys are
namespaced by flow (`reset:RESEND_THREW`, `setup:RESEND_THREW`, …) so a
failure in the reset pipeline does not silence the alert from the setup
pipeline (or vice versa). A redeploy resets the limiter, so a
persistent issue re-alerts on the next cold start.

How to verify the alerting is wired:

1. Open Sentry → Issues → filter `area:auth.setup`. After a real
   failure (or a deliberate test like temporarily unsetting
   `RESEND_API_KEY` in a preview deploy and clicking _"Agregar
   contraseña a mi cuenta"_ from `/dashboard/configuracion`) you
   should see an event within ~1 minute. The `reason` tag tells you
   which branch fired.
2. If you fire two add-password requests back-to-back, you should
   still see only **one** Sentry event for the same `reason` — that
   confirms the per-process rate limit is in effect.
3. Filtering by `area:auth.reset` at the same time should show the
   reset pipeline's events independently — confirming the namespaces
   are not colliding.
4. The Vercel logs continue to carry the corresponding
   `[set-password] RESEND_API_KEY missing …` /
   `[set-password] resend.emails.send failed …` /
   `[set-password] resend.emails.send threw …` lines on every request,
   so log search remains the source of truth for volume; Sentry is the
   paging surface.

If `SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN`) is unset, the captures
become no-ops — `sentry.server.config.ts` initializes with whichever
DSN is present. There is no separate kill switch for `auth.setup`.

In the `RESEND_SEND_ERROR` and `RESEND_THREW` branches, the Sentry
capture happens **before** the token rollback and the
`AUTH_PASSWORD_SET_REQUEST_FAILED` audit row, so even if the
subsequent DB writes fail the team is still paged on the Resend
incident.

### 3.2 In-product hints that point users to this self-service flow

Two surfaces nudge only-Google users toward the self-service path
described above instead of toward soporte:

1. **Login (`app/(auth)/login/page.tsx`).** When `authorize()` throws
   `GOOGLE_ONLY_ACCOUNT` (the user typed their email + a password but
   their `User` row has `googleId && !password`), the form swaps the
   generic red error for an amber alert that contains:
   - a short explanation ("Esta cuenta se creó con Google"),
   - a prominent "Iniciar sesión con Google" button that calls
     `signIn("google", { callbackUrl: "/dashboard" })`, and
   - a link to `/dashboard/configuracion` so they know where to
     add a password afterwards.

   The alert is identified in the DOM as
   `[data-testid="login-google-only-alert"]` for tests / screenshots.
   The trigger is purely client-side: the server still throws the same
   `GOOGLE_ONLY_ACCOUNT` string; only the rendering changed.

2. **`/forgot-password` (`app/(auth)/forgot-password/page.tsx`).** This
   page must keep its anti-enumeration response for anonymous visitors
   (see section 5), so we do **not** ask the server "is this email
   only-Google?" before submission. Instead, the page reads the
   current `useSession()` and, only if the visitor is **already
   authenticated in this browser** with `googleId && !hasPassword`,
   renders an amber `data-testid="forgot-google-only-hint"` note that
   points them at `/dashboard/configuracion`. Typical scenario: the
   user is logged in via Google in another tab, opens
   `/forgot-password` because they assumed they had a password, and
   we tell them they don't — using only data they already own about
   themselves, never a server lookup of an arbitrary email. For
   anonymous visitors the page is unchanged.

   To make this possible the JWT/session now carries two extra fields:
   `googleId` (already present) and `hasPassword: boolean | undefined`
   (computed in `lib/auth.ts` as `Boolean(dbUser.password)` — the
   bcrypt hash itself is never copied into the token). They are typed
   in `types/next-auth.d.ts`. Pre-existing JWTs minted before this
   field existed surface as `hasPassword === undefined` until the
   next 5-minute DB sync; the forgot-password hint checks strictly
   for `=== false` so old tokens don't briefly mis-fire the alert
   for users who actually have a password.

---

## 4. CLI: set or reset a user's password (operator fallback)

Use this when the user cannot self-serve from the profile (e.g.
`RESEND_API_KEY` is unavailable, the user lost access to their inbox,
or the account is locked for some reason).

```bash
# 1. Make sure DATABASE_URL points to the DB you intend to mutate.
#    For production this is the Railway connection string.
export DATABASE_URL="postgresql://...railway..."

# 2. Run the script. Email may be passed as a flag or entered when prompted.
#    npm:
npm run set-password -- --email user@example.com
# or, with prompt:
npm run set-password

# Equivalent direct invocations (any of these works):
npx tsx scripts/set-user-password.ts --email user@example.com
pnpm tsx scripts/set-user-password.ts --email user@example.com
```

What the script does:

1. Verifies the user exists.
2. Prompts twice for the new password with input hidden (no echo, not in
   shell history, not visible via `ps`).
3. Validates length ≥ 8 chars and that both entries match.
4. Hashes with bcrypt (10 rounds) and writes to `User.password`.
5. Clears any pending `passwordResetToken` / `passwordResetExpires`.
6. Writes an `AuditLog` entry with
   `action: "AUTH_PASSWORD_SET_BY_ADMIN"`, `entity: "User"`,
   `entityId: user.id`, `details: { method: "CLI_SCRIPT", previouslyHadPassword }`.

The script never:

- accepts the password via CLI argument or env var,
- prints the password or the bcrypt hash,
- mutates any other user.

After running, the user can log in with email + password **and** keeps
their Google login (the row keeps both `password` and `googleId`).

---

## 5. "Forgot my password" flow

Endpoint: `app/(auth)/forgot-password/page.tsx` →
`requestPasswordReset` in `lib/actions/auth-actions.ts`.

- If `RESEND_API_KEY` is set: a token is stored in
  `User.passwordResetToken` (1 h expiry) and an email is sent via Resend
  with a link to `/reset-password?token=...`. Vercel logs will show
  `[reset] email sent for email=abc***`.
- If `RESEND_API_KEY` is missing: the user is told honestly that automatic
  email is not enabled and to write to `soporte@seventoop.com`. The server
  logs `[reset] RESEND_API_KEY missing — email not sent` so the team can
  spot the misconfiguration.

In both cases the response to unknown emails is intentionally identical to
the response for known emails (anti-enumeration). We never say "this email
does not exist".

### 5.1 Sentry alerts for the reset email pipeline

Reset email failures also reach Sentry, so the team finds out before a
user complains. Three failure modes emit events, all tagged `area: "auth.reset"`
plus a `reason` tag identifying the branch:

| `reason` tag             | When it fires                                                         | Sentry event type                  |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------------- |
| `RESEND_API_KEY_MISSING` | `requestPasswordReset` hit and `process.env.RESEND_API_KEY` is unset. | `captureMessage` (`level: "error"`) |
| `RESEND_SEND_ERROR`      | `resend.emails.send` returned an `error` payload.                     | `captureException` of that error    |
| `RESEND_THREW`           | `resend.emails.send` threw (network, SDK, etc.).                      | `captureException` of the thrown value |

To avoid spamming Sentry from staging or a long-lived dev process, each
`reason` is rate-limited to **one event per hour per Node process**
(in-memory `Map` in `lib/actions/auth-actions.ts`). A redeploy resets the
limiter, so a persistent issue will re-alert on the next cold start.

How to verify the alerting is wired:

1. Open Sentry → Issues → filter `area:auth.reset`. After a real failure
   (or a deliberate test like temporarily unsetting `RESEND_API_KEY` in a
   preview deploy and hitting `/forgot-password`) you should see an event
   within ~1 minute. The `reason` tag tells you which branch fired.
2. If you fire two reset requests back-to-back, you should still see only
   **one** Sentry event for the same `reason` — that confirms the
   per-process rate limit is in effect.
3. The Vercel logs continue to carry the corresponding
   `[reset] RESEND_API_KEY missing …` / `[reset] resend.emails.send failed …`
   / `[reset] resend.emails.send threw …` lines on every request, so log
   search remains the source of truth for volume; Sentry is the paging
   surface.

If `SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN`) is unset, the captures
become no-ops — `sentry.server.config.ts` initializes with whichever DSN
is present. There is no separate kill switch for `auth.reset`.

---

## 6. Diagnosing a Google login failure in production

1. Hit `/api/health` and confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL` are all `true` /
   correct.
2. In Vercel logs, look for `[AUTH] google signIn`:
   - `[AUTH] google signIn ok: ... existing=true googleIdLinked=...` →
     callback returned `true`, NextAuth should set the session cookie.
     If the user still ends up on a 404, the problem is downstream
     (e.g. middleware redirect, missing dashboard route for that role).
   - `[AUTH] google signIn pre-registration: ... existing=false -> /google-register` →
     the user does not exist yet; expected only for brand new sign-ups.
   - `[AUTH] google signIn rejected: missing email or unverified ...` →
     the Google profile didn't include a verified email; user can't log in.
   - No `[AUTH]` line at all → Google never made the callback request.
     Almost always a redirect URI / `NEXTAUTH_URL` mismatch.
3. In the browser, try with DevTools → Network tab open and capture the
   request to `/api/auth/callback/google`. A `404` from Vercel here usually
   means the build did not include the auth route (rare) or the URL is
   pointing at the wrong host.
