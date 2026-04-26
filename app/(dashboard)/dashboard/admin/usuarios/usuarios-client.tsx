"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { updateUserRole, type AdminAssignableRole } from "@/lib/actions/user-actions";
import { ROLES } from "@/lib/constants/roles";

type UserRow = {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    kycStatus: string;
    createdAt: Date | string;
    avatar: string | null;
    hasPassword: boolean;
    hasGoogle: boolean;
    accessMethod: "google" | "password" | "both" | "none";
};

type Props = {
    initialData: {
        users: UserRow[];
        metadata: { total: number; page: number; totalPages: number };
    };
    initialFilters: {
        page: number;
        search: string;
        role: string;
        kycStatus: string;
    };
    actor: { id: string; role: string; isSuperadmin: boolean };
};

const ROLE_OPTIONS_BASE: AdminAssignableRole[] = [
    ROLES.ADMIN,
    ROLES.DESARROLLADOR,
    ROLES.VENDEDOR,
    ROLES.INVERSOR,
    ROLES.CLIENTE,
];

const ALL_ROLE_FILTERS = [
    "ALL",
    ROLES.SUPERADMIN,
    ROLES.ADMIN,
    ROLES.DESARROLLADOR,
    ROLES.VENDEDOR,
    ROLES.INVERSOR,
    ROLES.CLIENTE,
];

const KYC_OPTIONS = ["ALL", "PENDIENTE", "EN_REVISION", "APROBADO", "RECHAZADO"];

const ACCESS_LABEL: Record<UserRow["accessMethod"], string> = {
    google: "Google",
    password: "Password",
    both: "Google + Password",
    none: "Sin método",
};

const ACCESS_BADGE: Record<UserRow["accessMethod"], string> = {
    google: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    password: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    both: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
    none: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
};

export default function UsuariosAdminClient({ initialData, initialFilters, actor }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [savingRowId, setSavingRowId] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState(initialFilters.search);

    const assignableRoles: AdminAssignableRole[] = actor.isSuperadmin
        ? [ROLES.SUPERADMIN, ...ROLE_OPTIONS_BASE]
        : ROLE_OPTIONS_BASE;

    function pushFilters(next: Partial<Props["initialFilters"]>) {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        const merged = { ...initialFilters, ...next };
        if (merged.search) params.set("search", merged.search);
        else params.delete("search");
        if (merged.role && merged.role !== "ALL") params.set("role", merged.role);
        else params.delete("role");
        if (merged.kycStatus && merged.kycStatus !== "ALL") params.set("kycStatus", merged.kycStatus);
        else params.delete("kycStatus");
        if (merged.page > 1) params.set("page", String(merged.page));
        else params.delete("page");
        startTransition(() => router.push(`/dashboard/admin/usuarios?${params.toString()}`));
    }

    function canActorChange(target: UserRow): boolean {
        if (target.rol === ROLES.SUPERADMIN && !actor.isSuperadmin) return false;
        return true;
    }

    async function handleRoleChange(target: UserRow, newRole: AdminAssignableRole) {
        if (newRole === target.rol) return;
        setSavingRowId(target.id);
        try {
            const res = await updateUserRole(target.id, newRole);
            if (res.success) {
                toast.success(`Rol actualizado: ${target.email} → ${newRole}`);
                startTransition(() => router.refresh());
            } else {
                toast.error(res.error || "No se pudo actualizar el rol");
            }
        } catch {
            toast.error("Error inesperado al actualizar el rol");
        } finally {
            setSavingRowId(null);
        }
    }

    return (
        <div className="space-y-6 p-6 pb-12 animate-fade-in">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Gestión de roles y métodos de acceso. Solo ADMIN o SUPERADMIN pueden editar.
                </p>
            </header>

            <section className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                <input
                    type="search"
                    placeholder="Buscar por nombre o email"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") pushFilters({ search: searchInput.trim(), page: 1 });
                    }}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] px-3 py-2 text-sm"
                />
                <select
                    value={initialFilters.role}
                    onChange={(e) => pushFilters({ role: e.target.value, page: 1 })}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] px-3 py-2 text-sm"
                >
                    {ALL_ROLE_FILTERS.map((r) => (
                        <option key={r} value={r}>{r === "ALL" ? "Todos los roles" : r}</option>
                    ))}
                </select>
                <select
                    value={initialFilters.kycStatus}
                    onChange={(e) => pushFilters({ kycStatus: e.target.value, page: 1 })}
                    className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] px-3 py-2 text-sm"
                >
                    {KYC_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s === "ALL" ? "KYC: cualquiera" : `KYC: ${s}`}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => pushFilters({ search: searchInput.trim(), page: 1 })}
                    disabled={isPending}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                    Aplicar
                </button>
            </section>

            <section className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-white/[0.03] text-left">
                        <tr>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Nombre</th>
                            <th className="px-4 py-3 font-medium">Rol</th>
                            <th className="px-4 py-3 font-medium">Método de acceso</th>
                            <th className="px-4 py-3 font-medium">Creado</th>
                            <th className="px-4 py-3 font-medium">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialData.users.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                    No se encontraron usuarios con esos filtros.
                                </td>
                            </tr>
                        )}
                        {initialData.users.map((u) => {
                            const editable = canActorChange(u);
                            const created = typeof u.createdAt === "string" ? new Date(u.createdAt) : u.createdAt;
                            return (
                                <tr
                                    key={u.id}
                                    className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                                    data-testid={`user-row-${u.id}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{u.email}</div>
                                        {u.id === actor.id && (
                                            <div className="text-xs text-amber-600">Vos</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{u.nombre}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block rounded-md bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 text-xs font-medium">
                                            {u.rol}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${ACCESS_BADGE[u.accessMethod]}`}>
                                            {ACCESS_LABEL[u.accessMethod]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {format(created, "dd MMM yyyy", { locale: es })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            disabled={!editable || savingRowId === u.id || isPending}
                                            value={u.rol}
                                            onChange={(e) => handleRoleChange(u, e.target.value as AdminAssignableRole)}
                                            className="rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0A0C] px-2 py-1 text-xs disabled:opacity-50"
                                            data-testid={`role-select-${u.id}`}
                                        >
                                            {/* Mostrar el rol actual aunque no sea asignable, para no romper la UI */}
                                            {!assignableRoles.includes(u.rol as AdminAssignableRole) && (
                                                <option value={u.rol}>{u.rol} (no asignable)</option>
                                            )}
                                            {assignableRoles.map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                        {!editable && (
                                            <div className="mt-1 text-[11px] text-slate-400">
                                                Solo SUPERADMIN puede editar SUPERADMIN
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <footer className="flex items-center justify-between text-sm text-slate-500">
                <span>
                    Mostrando {initialData.users.length} de {initialData.metadata.total}
                </span>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={initialFilters.page <= 1 || isPending}
                        onClick={() => pushFilters({ page: initialFilters.page - 1 })}
                        className="rounded-md border border-slate-200 dark:border-white/10 px-3 py-1 disabled:opacity-40"
                    >
                        Anterior
                    </button>
                    <span className="px-2 py-1">
                        Página {initialData.metadata.page} / {Math.max(1, initialData.metadata.totalPages)}
                    </span>
                    <button
                        type="button"
                        disabled={initialFilters.page >= initialData.metadata.totalPages || isPending}
                        onClick={() => pushFilters({ page: initialFilters.page + 1 })}
                        className="rounded-md border border-slate-200 dark:border-white/10 px-3 py-1 disabled:opacity-40"
                    >
                        Siguiente
                    </button>
                </div>
            </footer>
        </div>
    );
}
