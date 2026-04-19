import prisma from "@/lib/db";
import { requireAuth } from "@/lib/guards";
import { AuthError } from "@/lib/auth-types";
import { ROLES } from "@/lib/constants/roles";

export const PERMISSIONS = {
    USERS_MANAGE: "users.manage",
    ROLE_REQUESTS_MANAGE: "role_requests.manage",
    RISKS_VIEW: "risks.view",
    CRM_ADMIN: "crm.admin",
    PLATFORM_CONFIG_MANAGE: "platform.config.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DEFINITIONS: Array<{
    key: PermissionKey;
    label: string;
    description: string;
}> = [
    {
        key: PERMISSIONS.USERS_MANAGE,
        label: "Usuarios",
        description: "Permite ver y gestionar usuarios desde administración.",
    },
    {
        key: PERMISSIONS.ROLE_REQUESTS_MANAGE,
        label: "Solicitudes de rol",
        description: "Permite revisar, aprobar y rechazar solicitudes de cambio de rol.",
    },
    {
        key: PERMISSIONS.RISKS_VIEW,
        label: "Riesgos",
        description: "Permite acceder al módulo de riesgos y perfiles analizados.",
    },
    {
        key: PERMISSIONS.CRM_ADMIN,
        label: "CRM admin",
        description: "Permite acceder a la bandeja administrativa de leads y su gestión.",
    },
    {
        key: PERMISSIONS.PLATFORM_CONFIG_MANAGE,
        label: "Configuración plataforma",
        description: "Permite leer y editar configuración global de plataforma.",
    },
];

export const PERMISSION_ROLES = [
    ROLES.SUPERADMIN,
    ROLES.ADMIN,
    ROLES.DESARROLLADOR,
    ROLES.VENDEDOR,
    ROLES.INVERSOR,
    ROLES.CLIENTE,
] as const;

type RolePermissionMap = Record<string, Record<PermissionKey, boolean>>;
type PermissionOverrides = Record<string, Partial<Record<PermissionKey, boolean>>>;

const DEFAULT_ROLE_PERMISSIONS: RolePermissionMap = {
    [ROLES.SUPERADMIN]: {
        [PERMISSIONS.USERS_MANAGE]: true,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: true,
        [PERMISSIONS.RISKS_VIEW]: true,
        [PERMISSIONS.CRM_ADMIN]: true,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: true,
    },
    [ROLES.ADMIN]: {
        [PERMISSIONS.USERS_MANAGE]: true,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: true,
        [PERMISSIONS.RISKS_VIEW]: true,
        [PERMISSIONS.CRM_ADMIN]: true,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: false,
    },
    [ROLES.DESARROLLADOR]: {
        [PERMISSIONS.USERS_MANAGE]: false,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: false,
        [PERMISSIONS.RISKS_VIEW]: false,
        [PERMISSIONS.CRM_ADMIN]: false,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: false,
    },
    [ROLES.VENDEDOR]: {
        [PERMISSIONS.USERS_MANAGE]: false,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: false,
        [PERMISSIONS.RISKS_VIEW]: false,
        [PERMISSIONS.CRM_ADMIN]: false,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: false,
    },
    [ROLES.INVERSOR]: {
        [PERMISSIONS.USERS_MANAGE]: false,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: false,
        [PERMISSIONS.RISKS_VIEW]: false,
        [PERMISSIONS.CRM_ADMIN]: false,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: false,
    },
    [ROLES.CLIENTE]: {
        [PERMISSIONS.USERS_MANAGE]: false,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: false,
        [PERMISSIONS.RISKS_VIEW]: false,
        [PERMISSIONS.CRM_ADMIN]: false,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: false,
    },
};

const ROLE_PERMISSION_OVERRIDES_KEY = "ROLE_PERMISSION_OVERRIDES";

function isPermissionKey(value: string): value is PermissionKey {
    return PERMISSION_DEFINITIONS.some((permission) => permission.key === value);
}

function emptyPermissionState() {
    return {
        [PERMISSIONS.USERS_MANAGE]: false,
        [PERMISSIONS.ROLE_REQUESTS_MANAGE]: false,
        [PERMISSIONS.RISKS_VIEW]: false,
        [PERMISSIONS.CRM_ADMIN]: false,
        [PERMISSIONS.PLATFORM_CONFIG_MANAGE]: false,
    };
}

function normalizeOverrides(input: unknown): PermissionOverrides {
    if (!input || typeof input !== "object") return {};

    const overrides: PermissionOverrides = {};

    for (const [role, values] of Object.entries(input as Record<string, unknown>)) {
        if (!PERMISSION_ROLES.includes(role as (typeof PERMISSION_ROLES)[number])) continue;
        if (!values || typeof values !== "object") continue;

        const normalizedRoleValues: Partial<Record<PermissionKey, boolean>> = {};
        for (const [permissionKey, enabled] of Object.entries(values as Record<string, unknown>)) {
            if (!isPermissionKey(permissionKey)) continue;
            if (typeof enabled !== "boolean") continue;
            normalizedRoleValues[permissionKey] = enabled;
        }

        overrides[role] = normalizedRoleValues;
    }

    return overrides;
}

export async function getRolePermissionOverrides() {
    const config = await prisma.systemConfig.findUnique({
        where: { key: ROLE_PERMISSION_OVERRIDES_KEY },
        select: { value: true },
    });

    if (!config?.value) return {};

    try {
        return normalizeOverrides(JSON.parse(config.value));
    } catch {
        return {};
    }
}

export async function getEffectiveRolePermissions(role: string) {
    const base = {
        ...emptyPermissionState(),
        ...(DEFAULT_ROLE_PERMISSIONS[role] ?? {}),
    };
    const overrides = await getRolePermissionOverrides();
    return {
        ...base,
        ...(overrides[role] ?? {}),
    } as Record<PermissionKey, boolean>;
}

export async function roleHasPermission(role: string, permission: PermissionKey) {
    const permissions = await getEffectiveRolePermissions(role);
    return !!permissions[permission];
}

export async function requirePermission(permission: PermissionKey) {
    const user = await requireAuth();
    const allowed = await roleHasPermission(user.role, permission);
    if (!allowed) {
        throw new AuthError("No tienes permisos para esta acción", 403);
    }
    return user;
}

export async function getRolePermissionsMatrix() {
    const overrides = await getRolePermissionOverrides();

    return PERMISSION_ROLES.map((role) => {
        const defaults = {
            ...emptyPermissionState(),
            ...(DEFAULT_ROLE_PERMISSIONS[role] ?? {}),
        };
        const effective = {
            ...defaults,
            ...(overrides[role] ?? {}),
        };

        return {
            role,
            permissions: PERMISSION_DEFINITIONS.map((permission) => ({
                key: permission.key,
                label: permission.label,
                description: permission.description,
                enabled: !!effective[permission.key],
                defaultEnabled: !!defaults[permission.key],
                overridden: typeof overrides[role]?.[permission.key] === "boolean",
            })),
        };
    });
}

export async function setRolePermissionOverride(role: string, permission: PermissionKey, enabled: boolean) {
    const currentOverrides = await getRolePermissionOverrides();
    const roleOverrides = { ...(currentOverrides[role] ?? {}) };
    roleOverrides[permission] = enabled;

    const nextOverrides = {
        ...currentOverrides,
        [role]: roleOverrides,
    };

    await prisma.systemConfig.upsert({
        where: { key: ROLE_PERMISSION_OVERRIDES_KEY },
        update: { value: JSON.stringify(nextOverrides) },
        create: {
            key: ROLE_PERMISSION_OVERRIDES_KEY,
            value: JSON.stringify(nextOverrides),
            description: "Overrides configurables de permisos por rol",
        },
    });

    return nextOverrides;
}
