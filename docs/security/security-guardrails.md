# Security Guardrail System — SevenToop

This document defines the canonical security rules for the SevenToop codebase to prevent regressions.

## 1. Authentication Policy

All sensitive endpoints (API routes and Server Actions) **MUST** use the canonical guards from `@/lib/guards`.

### Canonical Guards
- `requireAuth()`: Ensures a valid session exists. Returns the `user` object.
- `requireRole(role)`: Ensures session + specific role.
- `requireAnyRole([roles])`: Ensures session + one of the roles.
- `requireKYC()`: Ensures session + approved KYC.
- `requireSellerKYC()`: Ensures session + seller KYC.
- `requireProjectOwnership(projectId)`: Ensures the user has permission to manage the specific project (Admin or Creator).

### Forbidden Patterns
- Directly calling `getServerSession()` in handlers or actions is **STRICTLY FORBIDDEN**. Use `requireAuth()` instead.
- Accessing `session.user` directly without a guard is discouraged.

## 2. Multi-Tenant Isolation (Tenant-Safe)

All queries to sensitive tables **MUST** be filtered by `orgId` or ownership context.

### Lead Isolation
- No lead should be created without a resolved `orgId`.
- Inbound leads that cannot be resolved immediately **MUST** go to `LeadIntake` (quarantine).
- Use `orgFilter(orgId)` or manual `{ where: { orgId } }` in all findMany/update/delete operations.

### Project & Unit Isolation
- Units and Projects must be accessed through ownership checks or `orgId` filters.

## 3. Webhook & Public API Security

- Webhooks (Meta, TikTok, WhatsApp) are intentionally public but **MUST** implement their own verification (Rate limiting, tokens, signatures).
- All public endpoints must be explicitly marked with:
  `// @security-waive: PUBLIC - [Reason]`

## 4. Audit Logging

Critical mutations (Deletions, Status Changes, User Management) **MUST** be logged using the `audit()` action or `AuditLog` table.

## 5. Automated Enforcement

Run the security scan before every PR:
```bash
npm run security:check
```

Severity Levels:
- **CRITICAL**: Immediate fix required (Insecure session access).
- **HIGH**: Missing guard in sensitive mutation.
- **MEDIUM**: Potential data leak (Missing tenant filter).
