import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUsers } from "@/lib/actions/user-actions";
import { roleHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { ROLES } from "@/lib/constants/roles";
import UsuariosAdminClient from "./usuarios-client";

export const dynamic = "force-dynamic";

type SearchParams = {
    page?: string;
    search?: string;
    role?: string;
    kycStatus?: string;
};

export default async function UsuariosAdminPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/dashboard/admin/usuarios");
    }

    const actorRole = (session.user as any).role as string | undefined;
    if (!actorRole) {
        redirect("/dashboard");
    }

    const allowed = await roleHasPermission(actorRole, PERMISSIONS.USERS_MANAGE);
    if (!allowed) {
        redirect("/dashboard");
    }

    const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
    const search = searchParams.search?.trim() || undefined;
    const roleFilter = searchParams.role || "ALL";
    const kycFilter = searchParams.kycStatus || "ALL";

    const result = await getUsers(page, 20, search, roleFilter, kycFilter);

    if (!result.success || !("data" in result)) {
        return (
            <div className="p-8">
                <h1 className="text-xl font-semibold mb-2">Usuarios</h1>
                <p className="text-rose-500">
                    No se pudo cargar la lista: {("error" in result) ? result.error : "error desconocido"}
                </p>
            </div>
        );
    }

    const isSuperadmin = actorRole === ROLES.SUPERADMIN;

    return (
        <UsuariosAdminClient
            initialData={result.data}
            initialFilters={{
                page,
                search: search ?? "",
                role: roleFilter,
                kycStatus: kycFilter,
            }}
            actor={{
                id: session.user.id,
                role: actorRole,
                isSuperadmin,
            }}
        />
    );
}
