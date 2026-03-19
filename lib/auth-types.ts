/**
 * lib/auth-types.ts
 *
 * Shared auth primitives — imported by both guards.ts and lib/project-access/
 * to avoid circular dependencies.
 *
 * guards.ts re-exports everything here so existing consumers don't need to change.
 */

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: string;
    orgId: string | null;
    kycStatus: string;
    demoEndsAt: string | null;
}

export class AuthError extends Error {
    public status: number;
    constructor(message: string, status: number = 401) {
        super(message);
        this.name = "AuthError";
        this.status = status;
    }
}
