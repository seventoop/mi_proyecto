"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Clock, AlertTriangle, CheckCircle, XCircle,
    Filter, Search, ChevronLeft, ChevronRight, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReservaCountdown from "@/components/reservas/reserva-countdown";
import NuevaReservaModal from "@/components/reservas/nueva-reserva-modal";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface ReservasListProps {
    reservas: any[];
    metadata: {
        total: number;
        page: number;
        totalPages: number;
    };
    counts: Record<string, number>;
}

const tabConfig = [
    { id: "ACTIVA", label: "Activas", icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { id: "VENCIDA", label: "Vencidas", icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10" },
    { id: "CONVERTIDA", label: "Convertidas", icon: CheckCircle, color: "text-brand-400", bg: "bg-brand-500/10" },
    { id: "CANCELADA", label: "Canceladas", icon: XCircle, color: "text-slate-400", bg: "bg-slate-500/10" },
];

const estadoBadge: Record<string, { class: string; icon: any }> = {
    ACTIVA: { class: "bg-emerald-500/10 text-emerald-400", icon: Clock },
    VENCIDA: { class: "bg-rose-500/10 text-rose-400", icon: AlertTriangle },
    CONVERTIDA: { class: "bg-brand-500/10 text-brand-400", icon: CheckCircle },
    CANCELADA: { class: "bg-slate-500/10 text-slate-400", icon: XCircle },
};

const pagoBadge: Record<string, string> = {
    PENDIENTE: "bg-amber-500/10 text-amber-400",
    PAGADO: "bg-emerald-500/10 text-emerald-400",
};

export default function ReservasList({ reservas, metadata, counts }: ReservasListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [showFilters, setShowFilters] = useState(false);
    const [showNuevaReserva, setShowNuevaReserva] = useState(false);

    const activeTab = searchParams.get("estado") || "ACTIVA";

    const updateFilter = (newParams: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === "" || value === "ALL") params.delete(key);
            else params.set(key, String(value));
        });
        if (!newParams.page) params.delete("page");

        startTransition(() => {
            router.push(`/dashboard/reservas?${params.toString()}`);
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                    {tabConfig.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => updateFilter({ estado: t.id, page: 1 })}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                                activeTab === t.id
                                    ? "bg-white dark:bg-slate-700 text-slate-700 dark:text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            {t.label}
                            <span className={cn("text-xs font-bold", activeTab === t.id ? t.color : "text-slate-500")}>
                                {counts[t.id] || 0}
                            </span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowNuevaReserva(true)}
                    className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Reserva
                </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        defaultValue={searchParams.get("search") || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            const timeout = setTimeout(() => updateFilter({ search: val, page: 1 }), 500);
                            return () => clearTimeout(timeout);
                        }}
                        placeholder="Buscar por cliente o unidad..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                        showFilters ? "border-brand-500 bg-brand-500/10 text-brand-500" : "border-slate-200 dark:border-slate-700"
                    )}
                >
                    <Filter className="w-4 h-4" /> Filtros
                </button>
            </div>

            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl"
                    >
                        <div>
                            <label className="block text-xs font-semibold mb-1.5">Proyecto</label>
                            <input
                                className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800 text-sm"
                                defaultValue={searchParams.get("proyecto") || ""}
                                onBlur={(e) => updateFilter({ proyecto: e.target.value })}
                                placeholder="Escribe el nombre..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1.5">Vendedor</label>
                            <input
                                className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800 text-sm"
                                defaultValue={searchParams.get("vendedor") || ""}
                                onBlur={(e) => updateFilter({ vendedor: e.target.value })}
                                placeholder="Escribe el nombre..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold mb-1.5">Pago</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border dark:bg-slate-800 text-sm"
                                defaultValue={searchParams.get("estadoPago") || ""}
                                onChange={(e) => updateFilter({ estadoPago: e.target.value })}
                            >
                                <option value="">Todos</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="PAGADO">Pagado</option>
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={cn("glass-card overflow-hidden transition-opacity", isPending && "opacity-50")}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {["Unidad", "Cliente", "Vendedor", "Inicio", "Tiempo", "Seña", "Pago", "Estado"].map((h) => (
                                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {reservas.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">No hay reservas</td></tr>
                            ) : (
                                reservas.map((r) => {
                                    const badge = estadoBadge[r.estado] || estadoBadge.ACTIVA;
                                    const BadgeIcon = badge.icon;
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link href={`/dashboard/reservas/${r.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-brand-500">
                                                    {r.unidadNumero}
                                                </Link>
                                                <p className="text-xs text-slate-500">{r.proyectoNombre}</p>
                                            </td>
                                            <td className="px-6 py-4">{r.clienteNombre}</td>
                                            <td className="px-6 py-4">{r.vendedorNombre}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{new Date(r.fechaInicio).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <ReservaCountdown
                                                    fechaVencimiento={r.fechaVencimiento}
                                                    estado={r.estado}
                                                    estadoPago={r.estadoPago}
                                                    compact
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-bold">${r.montoSena?.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", pagoBadge[r.estadoPago])}>
                                                    {r.estadoPago}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold", badge.class)}>
                                                    <BadgeIcon className="w-3 h-3" /> {r.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        Página {metadata.page} de {metadata.totalPages} ({metadata.total} resultados)
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={metadata.page <= 1 || isPending}
                            onClick={() => updateFilter({ page: metadata.page - 1 })}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={metadata.page >= metadata.totalPages || isPending}
                            onClick={() => updateFilter({ page: metadata.page + 1 })}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <NuevaReservaModal
                isOpen={showNuevaReserva}
                onClose={() => setShowNuevaReserva(false)}
            />
        </div>
    );
}
