import { ROLES } from "@/lib/constants/roles";

const PUBLIC_BLOCKED_ROLES = new Set([ROLES.ADMIN, ROLES.SUPERADMIN]);
const PUBLIC_ALLOWED_ROLES = new Set([
    ROLES.CLIENTE,
    ROLES.INVERSOR,
    ROLES.VENDEDOR,
    ROLES.DESARROLLADOR,
]);
type PublicAllowedRole = typeof ROLES.CLIENTE | typeof ROLES.INVERSOR | typeof ROLES.VENDEDOR | typeof ROLES.DESARROLLADOR;
type PublicBlockedRole = typeof ROLES.ADMIN | typeof ROLES.SUPERADMIN;

export function getPublicAssignableRoles() {
    return Array.from(PUBLIC_ALLOWED_ROLES) as PublicAllowedRole[];
}

export function isPublicAssignableRole(role?: string | null) {
    const normalizedRequestedRole = role?.toUpperCase().trim();
    return !!normalizedRequestedRole && PUBLIC_ALLOWED_ROLES.has(normalizedRequestedRole as PublicAllowedRole);
}

/**
 * Single source of truth for the initial role of any user created from a
 * public authentication flow.
 */
export function getInitialUserRole(requestedRole?: string | null) {
    const normalizedRequestedRole = requestedRole?.toUpperCase().trim();

    if (normalizedRequestedRole && PUBLIC_BLOCKED_ROLES.has(normalizedRequestedRole as PublicBlockedRole)) {
        throw new Error("PUBLIC_ROLE_ASSIGNMENT_BLOCKED");
    }

    if (normalizedRequestedRole && PUBLIC_ALLOWED_ROLES.has(normalizedRequestedRole as PublicAllowedRole)) {
        return normalizedRequestedRole;
    }

    return "CLIENTE";
}
