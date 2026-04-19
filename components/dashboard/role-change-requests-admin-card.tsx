"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RoleChangeRequestItem = {
    id: string;
    userId: string;
    currentRole: string;
    requestedRole: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        nombre: string;
        email: string;
        rol: string;
    };
};

export default function RoleChangeRequestsAdminCard() {
    const [requests, setRequests] = useState<RoleChangeRequestItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingActionId, setPendingActionId] = useState<string | null>(null);

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/role-change-requests?status=PENDIENTE");
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudieron cargar las solicitudes.");
            }

            setRequests(data.data || []);
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudieron cargar las solicitudes.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadRequests();
    }, []);

    const resolveRequest = async (requestId: string, decision: "APROBAR" | "RECHAZAR") => {
        setPendingActionId(requestId);
        try {
            const response = await fetch(`/api/role-change-requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ decision }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo resolver la solicitud.");
            }

            setRequests((current) => current.filter((request) => request.id !== requestId));
            toast.success(
                decision === "APROBAR"
                    ? "Solicitud aprobada correctamente"
                    : "Solicitud rechazada correctamente"
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo resolver la solicitud.";
            toast.error(message);
        } finally {
            setPendingActionId(null);
        }
    };

    return (
        <Card className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white rounded-2xl shadow-none">
            <CardHeader className="pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                <CardTitle className="flex items-center gap-2 text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-brand-500" />
                    Solicitudes de cambio de rol
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-2">
                    Revisá solicitudes pendientes y resolvelas sin cambiar permisos ni workflows avanzados.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando solicitudes...
                    </div>
                ) : requests.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] p-4 text-sm text-slate-600 dark:text-slate-300">
                        No hay solicitudes pendientes en este momento.
                    </div>
                ) : (
                    requests.map((request) => (
                        <div
                            key={request.id}
                            className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] p-4 space-y-4"
                        >
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 dark:text-white">
                                    {request.user.nombre}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    {request.user.email}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-white/40">
                                    Actual: {request.currentRole} · Solicitado: {request.requestedRole}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button
                                    onClick={() => resolveRequest(request.id, "APROBAR")}
                                    disabled={pendingActionId === request.id}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-tight"
                                >
                                    {pendingActionId === request.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Aprobar
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => resolveRequest(request.id, "RECHAZAR")}
                                    disabled={pendingActionId === request.id}
                                    variant="outline"
                                    className="rounded-xl font-black uppercase text-xs tracking-tight"
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Rechazar
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
