"use client";

import { useEffect, useState, useTransition } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarClock, ChevronDown, CheckCircle2, XCircle, DollarSign, Plus, RefreshCw } from "lucide-react";
import { avanzarEstadoReserva, getReservasByProyecto } from "@/lib/actions/reservas";
import { getPusherClient, PUSHER_CHANNELS } from "@/lib/pusher";
import ReservaWizard from "./ReservaWizard";

interface ReservaRow {
    id: string;
    unidadNumero: string;
    unidadPrecio: number;
    moneda: string;
    compradorNombre: string;
    compradorEmail: string;
    vendedorNombre: string;
    estado: string;
    estadoPago: string;
    montoSena: number;
    notas: string;
    fechaVencimiento: string;
    createdAt: string;
}

interface ReservasTabProps {
    proyectoId: string;
    initialReservas: ReservaRow[];
    userRole: string;
}

const ESTADO_BADGE: Record<string, string> = {
    ACTIVA: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    CANCELADA: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
    VENDIDA: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
    PENDIENTE_APROBACION: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
};

const ACCIONES: Record<string, { label: string; next: string }[]> = {
    ACTIVA: [
        { label: "Confirmar Venta", next: "VENDIDA" },
        { label: "Cancelar", next: "CANCELADA" },
    ],
    PENDIENTE_APROBACION: [
        { label: "Activar", next: "ACTIVA" },
        { label: "Cancelar", next: "CANCELADA" },
    ],
};

export default function ReservasTab({ proyectoId, initialReservas, userRole }: ReservasTabProps) {
    const [reservas, setReservas] = useState<ReservaRow[]>(initialReservas);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Real-time via Pusher
    useEffect(() => {
        const client = getPusherClient();
        if (!client) return;

        const channel = client.subscribe(PUSHER_CHANNELS.getProjectChannel(proyectoId));
        channel.bind("reserva:created", () => refreshReservas());
        channel.bind("reserva:updated", () => refreshReservas());

        return () => {
            channel.unbind_all();
            client.unsubscribe(PUSHER_CHANNELS.getProjectChannel(proyectoId));
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proyectoId]);

    const refreshReservas = () => {
        startTransition(async () => {
            const res = await getReservasByProyecto(proyectoId);
            if (res.success && res.data) setReservas(res.data as ReservaRow[]);
        });
    };

    const handleAvanzar = async (reservaId: string, nuevoEstado: string) => {
        setOpenMenuId(null);
        const res = await avanzarEstadoReserva(reservaId, nuevoEstado);
        if (res.success) {
            toast.success(`Estado actualizado a ${nuevoEstado}`);
            refreshReservas();
        } else {
            toast.error(res.error || "Error al actualizar");
        }
    };

    // KPIs
    const total = reservas.length;
    const activas = reservas.filter(r => r.estado === "ACTIVA").length;
    const vendidas = reservas.filter(r => r.estado === "VENDIDA").length;
    const canceladas = reservas.filter(r => r.estado === "CANCELADA").length;
    const totalSenas = reservas.reduce((acc, r) => acc + r.montoSena, 0);

    const isAdmin = userRole === "ADMIN" || userRole === "DESARROLLADOR";

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Total Reservas", value: total, color: "text-slate-700 dark:text-white" },
                    { label: "Activas", value: activas, color: "text-emerald-500" },
                    { label: "Vendidas", value: vendidas, color: "text-blue-400" },
                    { label: "Seña Total", value: formatCurrency(totalSenas), color: "text-brand-orange" },
                ].map(kpi => (
                    <div key={kpi.label} className="glass-card p-4 text-center">
                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-brand-orange" />
                    Reservas del Proyecto
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={refreshReservas}
                        disabled={isPending}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw className={cn("w-4 h-4", isPending && "animate-spin")} />
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setShowWizard(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orangeDark transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Nueva Reserva
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {reservas.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <CalendarClock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500">Sin reservas registradas</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                    {["Lote", "Comprador", "Vendedor", "Seña", "Venc.", "Estado", ""].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {reservas.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">#{r.unidadNumero}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-800 dark:text-white">{r.compradorNombre}</p>
                                            {r.compradorEmail && <p className="text-xs text-slate-400">{r.compradorEmail}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{r.vendedorNombre}</td>
                                        <td className="px-4 py-3 font-bold text-brand-orange">
                                            {r.montoSena > 0 ? (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />{formatCurrency(r.montoSena)}
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString("es-AR") : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", ESTADO_BADGE[r.estado] || "bg-slate-500/10 text-slate-400")}>
                                                {r.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 relative">
                                            {isAdmin && ACCIONES[r.estado] && (
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                                                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-medium"
                                                    >
                                                        Acciones <ChevronDown className="w-3 h-3" />
                                                    </button>
                                                    {openMenuId === r.id && (
                                                        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                                                            {ACCIONES[r.estado].map(accion => (
                                                                <button
                                                                    key={accion.next}
                                                                    onClick={() => handleAvanzar(r.id, accion.next)}
                                                                    className={cn(
                                                                        "w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                                                                        accion.next === "CANCELADA" && "text-rose-500",
                                                                        accion.next === "VENDIDA" && "text-blue-400",
                                                                        accion.next === "ACTIVA" && "text-emerald-500",
                                                                    )}
                                                                >
                                                                    {accion.next === "CANCELADA" && <XCircle className="w-4 h-4" />}
                                                                    {accion.next === "VENDIDA" && <CheckCircle2 className="w-4 h-4" />}
                                                                    {accion.next === "ACTIVA" && <CheckCircle2 className="w-4 h-4" />}
                                                                    {accion.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Wizard placeholder — needs a unit to open */}
            {showWizard && (
                <div className="glass-card p-8 text-center">
                    <p className="text-slate-400 text-sm">Selecciona un lote desde el Inventario o Mapa para iniciar una reserva.</p>
                    <button onClick={() => setShowWizard(false)} className="mt-3 text-xs text-brand-orange hover:underline">Cerrar</button>
                </div>
            )}
        </div>
    );
}
