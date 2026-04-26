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

## 3. CLI: set or reset a user's password

When a user is `has_google: true, has_password: false` and needs to log in
with email/password (e.g. password manager, no Google access), use the
`set-password` script.

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

## 4. "Forgot my password" flow

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

---

## 5. Diagnosing a Google login failure in production

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
