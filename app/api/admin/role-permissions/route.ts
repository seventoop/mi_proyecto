import { NextRequest, NextResponse } from "next/server";
// NOTE: This endpoint manages the permission matrix itself. It intentionally
// uses `requireRole("SUPERADMIN")` instead of `requirePermission(...)` to avoid
// a privilege loop where the role being edited could grant itself access to
// edit further permissions. See `lib/guards.ts#requireRole` JSDoc for the full
// rationale on requireRole vs requirePermission.
import { handleApiGuardError, requireRole } from "@/lib/guards";
import {
    getRolePermissionsMatrix,
    PERMISSION_DEFINITIONS,
    PERMISSION_ROLES,
    setRolePermissionOverride,
} from "@/lib/auth/permissions";
import { audit } from "@/lib/actions/audit";

function isPermissionKey(value: string) {
    return PERMISSION_DEFINITIONS.some((permission) => permission.key === value);
}

export async function GET() {
    try {
        await requireRole("SUPERADMIN");
        const matrix = await getRolePermissionsMatrix();
        return NextResponse.json({ success: true, data: matrix });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = await requireRole("SUPERADMIN");
        const body = await req.json();
        const role = typeof body?.role === "string" ? body.role.toUpperCase().trim() : "";
        const permissionKey = typeof body?.permissionKey === "string" ? body.permissionKey.trim() : "";
        const enabled = typeof body?.enabled === "boolean" ? body.enabled : null;

        if (!PERMISSION_ROLES.includes(role as (typeof PERMISSION_ROLES)[number])) {
            return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
        }

        if (!isPermissionKey(permissionKey)) {
            return NextResponse.json({ error: "Permiso inválido." }, { status: 400 });
        }

        if (enabled === null) {
            return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
        }

        await setRolePermissionOverride(role, permissionKey, enabled);

        await audit({
            userId: user.id,
            action: "ROLE_PERMISSION_UPDATED",
            entity: "RolePermissionOverride",
            entityId: `${role}:${permissionKey}`,
            details: {
                role,
                permissionKey,
                enabled,
            },
        });

        const matrix = await getRolePermissionsMatrix();
        return NextResponse.json({ success: true, data: matrix });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
