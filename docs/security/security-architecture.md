# Security Architecture — Rate Limiting Strategy

SevenToop implements a multi-layer rate limiting strategy to protect against brute-force attacks, denial of service (DoS), and API abuse.

## Overview
The platform uses a standardized rate limiting mechanism defined in `lib/rate-limit.ts` and enforced via `middleware.ts` for global routes and specifically within sensitive API handlers.

## Identity Keys & Thresholds

| Endpoint Type | Limit | Identity Key | Enforcement Layer |
| :--- | :--- | :--- | :--- |
| **Auth Endpoints** | 10 req/min | Client IP | Middleware |
| **Password Reset** | 5 req/min | Client IP | Middleware |
| **Public Forms** | 10 req/min | Client IP / UUID | Middleware / Route Handler |
| **Webhooks** | 30 req/min | Source IP / Signature | Middleware |
| **General API** | 60 req/min | Authenticated User ID | API Guard / Route Handler |

## Storage Strategy

### Phase 1: In-Memory (Current)
Currently, rate limits are stored in a non-persistent in-memory `Map`. This is effective for baseline protection within a single server instance.
- **Limitation**: In distributed environments (e.g., Vercel / serverless), limits are local to each edge/function instance.

### Phase 2: Distributed (Production Recommended)
For high-availability production environments, it is recommended to transition to a shared storage provider:
- **Redis / Upstash**: Centralized counter storage for 100% accurate global rate limiting.
- **Gateway Level**: Offload rate limiting to a Cloudflare/WAF layer if feasible.

## Implementation Details
- **Helper**: `checkRateLimit(identifier, policy)`
- **Header Response**: When blocked, the system returns a `429 Too Many Requests` status code with a JSON error message.
