import { describe, it, expect, beforeEach, vi } from "vitest";

const findFirstAuditLogMock = vi.fn();
const findUniqueUserMock = vi.fn();
const getServerSessionMock = vi.fn();
const getAllSystemConfigMock = vi.fn();
const getUserConfigMock = vi.fn();
const roleHasPermissionMock = vi.fn();

vi.mock("@/lib/db", () => ({
    default: {
        user: {
            findUnique: (...args: unknown[]) => findUniqueUserMock(...args),
        },
        auditLog: {
            findFirst: (...args: unknown[]) => findFirstAuditLogMock(...args),
        },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

vi.mock("@/lib/actions/configuration", () => ({
    getAllSystemConfig: (...args: unknown[]) => getAllSystemConfigMock(...args),
    getUserConfig: (...args: unknown[]) => getUserConfigMock(...args),
}));

vi.mock("@/lib/auth/permissions", () => ({
    PERMISSIONS: {
        PLATFORM_CONFIG_MANAGE: "PLATFORM_CONFIG_MANAGE",
        ROLE_REQUESTS_MANAGE: "ROLE_REQUESTS_MANAGE",
    },
    roleHasPermission: (...args: unknown[]) => roleHasPermissionMock(...args),
}));

// The page imports a bunch of presentational components — we just need to
// be able to import the module without React rendering anything, so stub
// them out as no-op components.
vi.mock("@/components/dashboard/settings-form", () => ({
    default: () => null,
}));
vi.mock("@/components/dashboard/platform-settings-form", () => ({
    default: () => null,
}));
vi.mock("@/components/dashboard/smart-crm-settings-form", () => ({
    default: () => null,
}));
vi.mock("@/components/dashboard/request-role-change-card", () => ({
    default: () => null,
}));
vi.mock("@/components/dashboard/role-change-requests-admin-card", () => ({
    default: () => null,
}));
vi.mock("@/components/dashboard/role-permissions-admin-card", () => ({
    default: () => null,
}));
vi.mock("lucide-react", () => ({
    Settings: () => null,
    Globe: () => null,
    Shield: () => null,
    Sparkles: () => null,
}));

import ConfiguracionPage from "@/app/(dashboard)/dashboard/configuracion/page";

describe("ConfiguracionPage — query de última actualización de contraseña", () => {
    beforeEach(() => {
        findFirstAuditLogMock.mockReset();
        findUniqueUserMock.mockReset();
        getServerSessionMock.mockReset();
        getAllSystemConfigMock.mockReset();
        getUserConfigMock.mockReset();
        roleHasPermissionMock.mockReset();

        getServerSessionMock.mockResolvedValue({
            user: { id: "user-abc", role: "INVERSOR" },
        });
        getAllSystemConfigMock.mockResolvedValue({ success: true, data: {} });
        getUserConfigMock.mockResolvedValue({ success: true, data: {} });
        roleHasPermissionMock.mockResolvedValue(false);
        findUniqueUserMock.mockResolvedValue({
            email: "user@example.com",
            password: "hashed",
            googleId: null,
        });
        findFirstAuditLogMock.mockResolvedValue({
            createdAt: new Date("2026-04-20T10:00:00Z"),
        });
    });

    it("solo cuenta los tres eventos canónicos al buscar la última actualización", async () => {
        await ConfiguracionPage();

        expect(findFirstAuditLogMock).toHaveBeenCalledTimes(1);
        const arg = findFirstAuditLogMock.mock.calls[0]![0] as {
            where: {
                userId: string;
                action: { in: string[] };
            };
            orderBy: { createdAt: "desc" | "asc" };
            select: { createdAt: true };
        };

        // Scoped to the current user.
        expect(arg.where.userId).toBe("user-abc");

        // Most recent first.
        expect(arg.orderBy).toEqual({ createdAt: "desc" });

        // Only these three events count as "password updated". Locking down
        // the exact list (set + length) protects us against:
        //   - someone renaming/dropping one of the canonical events
        //   - someone widening the filter to include an unrelated event
        //     (e.g. AUTH_PASSWORD_RESET_REQUESTED) which would make the
        //     "Última actualización" string lie to the user.
        const expected = new Set([
            "AUTH_PASSWORD_SET_BY_USER",
            "AUTH_PASSWORD_RESET_SUCCESS",
            "AUTH_PASSWORD_SET_BY_ADMIN",
        ]);
        const actual = new Set(arg.where.action.in);
        expect(actual).toEqual(expected);
        expect(arg.where.action.in).toHaveLength(3);
    });

    it("no consulta AuditLog cuando la sesión no tiene userId", async () => {
        getServerSessionMock.mockResolvedValueOnce({ user: { role: "INVERSOR" } });

        await ConfiguracionPage();

        expect(findFirstAuditLogMock).not.toHaveBeenCalled();
        expect(findUniqueUserMock).not.toHaveBeenCalled();
    });
});
