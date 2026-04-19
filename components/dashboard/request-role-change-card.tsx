"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Clock3, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_OPTIONS = [
    {
        value: "CLIENTE",
        label: "Cliente",
        description: "Acceso base para seguimiento de cuenta, reservas y experiencia general.",
    },
    {
        value: "INVERSOR",
        label: "Inversor",
        description: "Pensado para explorar oportunidades, portafolio y operaciones de inversion.",
    },
    {
        value: "VENDEDOR",
        label: "Vendedor",
        description: "Enfocado en gestion comercial, leads y seguimiento de ventas.",
    },
    {
        value: "DESARROLLADOR",
        label: "Desarrollador",
        description: "Para quienes gestionan desarrollos, stock y operacion inmobiliaria.",
    },
];

type RoleChangeRequestItem = {
    id: string;
    currentRole: string;
    requestedRole: string;
    status: "PENDIENTE" | "APROBADA" | "RECHAZADA" | string;
    createdAt: string;
    updatedAt: string;
};

const statusStyles: Record<string, string> = {
    PENDIENTE: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100",
    APROBADA: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100",
    RECHAZADA: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100",
};

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export default function RequestRoleChangeCard() {
    const { data: session } = useSession();
    const currentRole = (session?.user as any)?.role ?? "";

    const availableOptions = useMemo(
        () => ROLE_OPTIONS.filter((role) => role.value !== currentRole),
        [currentRole]
    );
    const [requestedRole, setRequestedRole] = useState(availableOptions[0]?.value ?? "INVERSOR");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [history, setHistory] = useState<RoleChangeRequestItem[]>([]);

    const selectedRoleMeta = availableOptions.find((role) => role.value === requestedRole);
    const latestRequest = history[0] ?? null;
    const hasPendingRequest = latestRequest?.status === "PENDIENTE";

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch("/api/role-change-requests/me");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo cargar el estado de tu solicitud.");
            }

            setHistory(data.data?.requests || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo cargar el estado de tu solicitud.";
            toast.error(message);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        void loadHistory();
    }, []);

    useEffect(() => {
        if (!availableOptions.some((role) => role.value === requestedRole)) {
            setRequestedRole(availableOptions[0]?.value ?? "");
        }
    }, [availableOptions, requestedRole]);

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/role-change-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestedRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo enviar la solicitud.");
            }

            await loadHistory();
            toast.success("Solicitud enviada correctamente");
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo enviar la solicitud.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white rounded-2xl shadow-none">
            <CardHeader className="pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                <CardTitle className="flex items-center gap-2 text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    <ShieldAlert className="w-4 h-4 text-brand-500" />
                    Solicitar cambio de rol
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-2">
                    Si necesitas operar con otro rol, envia una solicitud de revision. Tu rol actual no cambia hasta que ADMIN o SUPERADMIN la aprueben.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                        Rol actual
                    </p>
                    <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                        {currentRole || "Sin rol"}
                    </p>
                </div>

                {isLoadingHistory ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando estado de tu solicitud...
                    </div>
                ) : latestRequest ? (
                    <div className={`rounded-2xl border px-4 py-4 text-sm ${statusStyles[latestRequest.status] ?? "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <p className="font-semibold">Ultima solicitud</p>
                                <p>
                                    Pediste pasar de <strong>{latestRequest.currentRole}</strong> a <strong>{latestRequest.requestedRole}</strong>.
                                </p>
                                <p className="text-xs uppercase tracking-widest opacity-80">
                                    Estado: {latestRequest.status}
                                </p>
                                <p className="text-xs opacity-80">
                                    Fecha: {formatDate(latestRequest.createdAt)}
                                </p>
                            </div>
                            <Clock3 className="w-4 h-4 shrink-0 opacity-70" />
                        </div>
                        {latestRequest.status === "PENDIENTE" && (
                            <p className="mt-3 text-xs opacity-90">
                                Esta solicitud sigue en revision. Mientras tanto, tu rol actual se mantiene igual.
                            </p>
                        )}
                        {latestRequest.status === "APROBADA" && (
                            <p className="mt-3 text-xs opacity-90">
                                Tu solicitud fue aprobada y tu acceso ya refleja ese cambio de rol.
                            </p>
                        )}
                        {latestRequest.status === "RECHAZADA" && (
                            <p className="mt-3 text-xs opacity-90">
                                Tu solicitud fue rechazada. Si necesitas otro acceso, podes enviar una nueva solicitud.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-300">
                        Aun no registramos solicitudes de cambio de rol en tu cuenta.
                    </div>
                )}

                {history.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                            Historial reciente
                        </p>
                        <div className="space-y-2">
                            {history.map((request) => (
                                <div
                                    key={request.id}
                                    className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] px-4 py-3 text-sm"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {request.currentRole} → {request.requestedRole}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${statusStyles[request.status] ?? "bg-slate-200 text-slate-700"}`}>
                                            {request.status}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                                        {formatDate(request.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                        Rol solicitado
                    </label>
                    <Select value={requestedRole} onValueChange={setRequestedRole}>
                        <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-[12px] font-bold uppercase tracking-tight">
                            <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] rounded-xl shadow-lg">
                            {availableOptions.map((role) => (
                                <SelectItem
                                    key={role.value}
                                    value={role.value}
                                    className="text-sm font-bold uppercase tracking-widest cursor-pointer focus:bg-slate-50 dark:focus:bg-white/[0.04]"
                                >
                                    {role.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedRoleMeta && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {selectedRoleMeta.description}
                        </p>
                    )}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <p className="font-semibold">Como se revisa</p>
                    <p className="mt-1">
                        Tu solicitud la revisa un ADMIN o SUPERADMIN. ADMIN y SUPERADMIN no se solicitan por este flujo.
                    </p>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !requestedRole || hasPendingRequest}
                    className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white min-w-[180px] font-black uppercase text-sm tracking-tight"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                        </>
                    ) : hasPendingRequest ? (
                        "Solicitud pendiente"
                    ) : (
                        "Solicitar cambio de rol"
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
