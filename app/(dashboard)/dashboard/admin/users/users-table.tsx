"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, Filter, MoreVertical, Shield, ShieldAlert,
    CheckCircle, XCircle, Trash2, UserCog, ChevronLeft, ChevronRight
} from "lucide-react";
import { updateUserRole, toggleUserBan, type AdminAssignableRole } from "@/lib/actions/user-actions";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransition } from "react";

interface UsersTableProps {
    users: any[];
    metadata: {
        total: number;
        page: number;
        totalPages: number;
    };
}

export default function UsersTable({ users, metadata }: UsersTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updateFilter = (newParams: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === "ALL") params.delete(key);
            else params.set(key, String(value));
        });
        if (!newParams.page) params.delete("page"); // Reset page on filter change

        startTransition(() => {
            router.push(`/dashboard/admin/users?${params.toString()}`);
        });
    };

    const handleRoleChange = async (userId: string, newRole: AdminAssignableRole) => {
        if (!confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) return;
        const res = await updateUserRole(userId, newRole);
        if (!res.success) alert("error" in res ? String(res.error) : "Error");
        else router.refresh();
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("¿ESTÁS SEGURO? Esta acción eliminará permanentemente al usuario.")) return;
        const res = await toggleUserBan(userId, true);
        if (!res.success) alert("error" in res ? String(res.error) : "Error");
        else router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            defaultValue={searchParams.get("search") || ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                const timeout = setTimeout(() => updateFilter({ search: val, page: 1 }), 500);
                                return () => clearTimeout(timeout);
                            }}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl text-sm font-black uppercase tracking-widest w-64 focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-500/50"
                        />
                    </div>
                    <select
                        defaultValue={searchParams.get("role") || "ALL"}
                        onChange={(e) => updateFilter({ role: e.target.value, page: 1 })}
                        className="px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl text-sm font-black uppercase tracking-widest outline-none"
                    >
                        <option value="ALL">Todos los Roles</option>
                        <option value="CLIENTE">Clientes</option>
                        <option value="INVERSOR">Inversores</option>
                        <option value="VENDEDOR">Vendedores</option>
                        <option value="DESARROLLADOR">Desarrolladores</option>
                        <option value="ADMIN">Admins</option>
                    </select>
                    <select
                        defaultValue={searchParams.get("kyc") || "ALL"}
                        onChange={(e) => updateFilter({ kyc: e.target.value, page: 1 })}
                        className="px-3 py-2 bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl text-sm font-black uppercase tracking-widest outline-none"
                    >
                        <option value="ALL">Estado KYC</option>
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_REVISION">En Revisión</option>
                        <option value="VERIFICADO">Verificado</option>
                    </select>
                </div>
            </div>

            <div className={cn(
                "bg-white dark:bg-[#0A0A0C] rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden shadow-none transition-opacity",
                isPending && "opacity-50"
            )}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-white/[0.02] text-xs uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06]">
                            <tr>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Rol</th>
                                <th className="px-6 py-3">KYC</th>
                                <th className="px-6 py-3">Registro</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 flex items-center justify-center font-bold text-xs">
                                                    {user.nombre[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-[12px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{user.nombre}</div>
                                                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest",
                                                user.rol === 'ADMIN' ? 'bg-purple-100 dark:bg-brand-500/10 text-purple-600 dark:text-brand-500' :
                                                    user.rol === 'VENDEDOR' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                                        'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
                                            )}>
                                                {user.rol}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest",
                                                user.kycStatus === 'VERIFICADO' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                    user.kycStatus === 'RECHAZADO' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                        'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            )}>
                                                {user.kycStatus === 'VERIFICADO' && <CheckCircle className="w-3 h-3" />}
                                                {user.kycStatus === 'RECHAZADO' && <XCircle className="w-3 h-3" />}
                                                {user.kycStatus === 'PENDIENTE' && <Shield className="w-3 h-3" />}
                                                {user.kycStatus === 'EN_REVISION' && <ShieldAlert className="w-3 h-3" />}
                                                {String(user.kycStatus).replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-bold text-xs tracking-widest uppercase">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors rounded-xl border border-transparent dark:hover:border-white/[0.04] outline-none">
                                                    <MoreVertical className="w-4 h-4 text-slate-500" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, "ADMIN")}>
                                                        <Shield className="w-4 h-4 mr-2" /> Hacer Admin
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, "VENDEDOR")}>
                                                        <UserCog className="w-4 h-4 mr-2" /> Hacer Vendedor
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, "CLIENTE")}>
                                                        <UserCog className="w-4 h-4 mr-2" /> Hacer Cliente
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(user.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Página {metadata.page} de {metadata.totalPages} ({metadata.total} usuarios)
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={metadata.page <= 1 || isPending}
                            onClick={() => updateFilter({ page: metadata.page - 1 })}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] dark:border dark:border-transparent dark:hover:border-white/[0.06] transition-colors disabled:opacity-50 text-slate-500 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={metadata.page >= metadata.totalPages || isPending}
                            onClick={() => updateFilter({ page: metadata.page + 1 })}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] dark:border dark:border-transparent dark:hover:border-white/[0.06] transition-colors disabled:opacity-50 text-slate-500 dark:text-slate-400"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
