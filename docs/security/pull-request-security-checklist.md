# Pull Request Security Checklist — SevenToop

Every Pull Request must be reviewed against this checklist to ensure the Security Guardrail System is upheld.

## Checklist

- [ ] **Authentication**: Does every new API route or Server Action use `requireAuth()` or an appropriate guard?
- [ ] **Direct Session Access**: Does the code call `getServerSession()`? (If yes, replace with `requireAuth()`).
- [ ] **RBAC**: Do mutations (POST/PUT/DELETE) have appropriate role checks (e.g., `user.role === 'ADMIN'`)?
- [ ] **Tenant Isolation**: Are database queries filtered by `orgId`? Is there a risk of a user seeing data from another organization?
- [ ] **Leads**: Are leads being created with a mandatory `orgId`? If it's a public form, is `LeadIntake` or a strict resolver used?
- [ ] **Input Validation**: Are all inputs validated using Zod schemas from `@/lib/validations`?
- [ ] **Rate Limiting**: Verified sensitive endpoints (auth, forms, webhooks) use appropriate rate limiting policies.
- [ ] **ID Strategy**: Verified new entities use non-sequential identifiers (CUID) and that ownership checks are enforced.
- [ ] **Audit Logs**: Do critical data changes trigger `AuditLog` entries?
- [ ] **Static Scans**: Has `node scripts/security-check.js` been executed with zero HIGH/CRITICAL violations?
- [ ] **Public Waivers**: Are all public endpoints explicitly waived and documented?

## How to Waive a Rule

If an endpoint is intentionally public or lacks an `orgId` filter by design, add one of the following comments to the file:

- `// @security-waive: PUBLIC`
- `// @security-waive: NO_ORG_FILTER`

> [!IMPORTANT]
> Always provide a brief justification next to the waiver.
