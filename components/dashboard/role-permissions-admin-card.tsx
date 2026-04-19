"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type PermissionRow = {
    key: string;
    label: string;
    description: string;
    enabled: boolean;
    defaultEnabled: boolean;
    overridden: boolean;
};

type RolePermissionsRow = {
    role: string;
    permissions: PermissionRow[];
};

export default function RolePermissionsAdminCard() {
    const [matrix, setMatrix] = useState<RolePermissionsRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const loadMatrix = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/admin/role-permissions");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudieron cargar los permisos.");
            }

            setMatrix(data.data || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudieron cargar los permisos.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadMatrix();
    }, []);

    const handleToggle = async (role: string, permissionKey: string, enabled: boolean) => {
        const actionKey = `${role}:${permissionKey}`;
        setSavingKey(actionKey);
        try {
            const response = await fetch("/api/admin/role-permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role, permissionKey, enabled }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo actualizar el permiso.");
            }

            setMatrix(data.data || []);
            toast.success("Permiso actualizado");
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo actualizar el permiso.";
            toast.error(message);
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <Card className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white rounded-2xl shadow-none">
            <CardHeader className="pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                <CardTitle className="flex items-center gap-2 text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-brand-500" />
                    Permisos por rol
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-2">
                    Corte inicial de permisos configurables para gobierno de accesos desde SUPERADMIN.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando permisos...
                    </div>
                ) : (
                    matrix.map((roleRow) => (
                        <div
                            key={roleRow.role}
                            className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] p-4 space-y-4"
                        >
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                                    {roleRow.role}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {roleRow.permissions.map((permission) => {
                                    const key = `${roleRow.role}:${permission.key}`;
                                    return (
                                        <div
                                            key={permission.key}
                                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4"
                                        >
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {permission.label}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-white/40">
                                                    {permission.description}
                                                </p>
                                                <p className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-white/30">
                                                    Default: {permission.defaultEnabled ? "ON" : "OFF"}{permission.overridden ? " · Override activo" : ""}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={permission.enabled}
                                                disabled={savingKey === key}
                                                onCheckedChange={(checked) =>
                                                    handleToggle(roleRow.role, permission.key, checked)
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
