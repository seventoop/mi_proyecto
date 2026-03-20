"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { closeOportunidad, updateOportunidad } from "@/lib/actions/crm-actions";

const ETAPAS = ["NUEVO", "CONTACTADO", "CALIFICADO", "VISITA", "NEGOCIACION", "RESERVA", "PERDIDO"] as const;

export type SerializedOportunidad = {
    id: string;
    leadId: string;
    unidadId: string | null;
    etapa: string;
    probabilidad: number | null;
    valorEstimado: number | null;
    lead: { nombre: string };
    proyecto: { nombre: string };
};

export default function OportunidadCard({ op }: { op: SerializedOportunidad }) {
    const [etapa, setEtapa] = useState(op.etapa);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [montoSena, setMontoSena] = useState(op.valorEstimado?.toString() ?? "");
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleEtapaChange = (nueva: string) => {
        const prev = etapa;
        setEtapa(nueva);
        setError("");
        startTransition(async () => {
            const res = await updateOportunidad(op.id, { etapa: nueva });
            if (!res.success) {
                setEtapa(prev);
                setError((res as any).error ?? "Error al actualizar etapa");
            }
        });
    };

    const handleClose = () => {
        if (!op.unidadId) {
            setError("Sin unidad asignada. Editá la oportunidad para asignar una.");
            return;
        }
        const monto = parseFloat(montoSena);
        if (!monto || monto <= 0) {
            setError("El monto de seña debe ser un número positivo.");
            return;
        }
        setError("");
        startTransition(async () => {
            const res = await closeOportunidad(op.id, {
                unidadId: op.unidadId!,
                montoSena: monto,
            });
            if (!res.success) {
                setError((res as any).error ?? "Error al convertir");
            } else {
                setShowCloseForm(false);
            }
        });
    };

    const isCloseable = etapa !== "RESERVA" && etapa !== "PERDIDO";

    return (
        <div className={cn(
            "bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]",
            "hover:border-slate-300 dark:hover:border-white/[0.12] p-4 rounded-xl transition-all duration-300",
            isPending && "opacity-60 pointer-events-none"
        )}>
            <p className="text-[13px] font-black text-slate-900 dark:text-zinc-100 uppercase tracking-tight truncate">
                {op.lead.nombre}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-white/20 uppercase tracking-tighter mt-1">
                {op.proyecto.nombre}
            </p>

            <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-black text-brand-500 px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                    {op.valorEstimado ? `$${op.valorEstimado.toLocaleString("es-AR")}` : "—"}
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                    {op.probabilidad ?? 0}% prob.
                </span>
            </div>

            <div className="mt-3 h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${op.probabilidad ?? 0}%` }}
                />
            </div>

            {/* Stage selector */}
            <select
                value={etapa}
                onChange={(e) => handleEtapaChange(e.target.value)}
                disabled={isPending}
                className="mt-3 w-full text-xs font-bold uppercase bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-lg px-2 py-1.5 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
            >
                {ETAPAS.map(e => (
                    <option key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase().replace("_", " ")}</option>
                ))}
            </select>

            {/* Convert to Reserva CTA */}
            {isCloseable && (
                <button
                    onClick={() => { setShowCloseForm(!showCloseForm); setError(""); }}
                    disabled={isPending}
                    className="mt-2 w-full text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 py-1 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg transition-colors"
                >
                    → Convertir a Reserva
                </button>
            )}

            {showCloseForm && (
                <div className="mt-2 space-y-2">
                    {!op.unidadId ? (
                        <p className="text-xs text-rose-500">
                            Sin unidad asignada. Asigná una unidad desde el proyecto antes de convertir.
                        </p>
                    ) : (
                        <>
                            <input
                                type="number"
                                value={montoSena}
                                onChange={(e) => setMontoSena(e.target.value)}
                                placeholder="Monto seña ($)"
                                min={1}
                                className="w-full text-sm bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-1.5 text-slate-900 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                            />
                            <button
                                onClick={handleClose}
                                disabled={isPending}
                                className="w-full text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg transition-colors disabled:opacity-60"
                            >
                                {isPending ? "Procesando..." : "Confirmar Reserva"}
                            </button>
                        </>
                    )}
                </div>
            )}

            {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        </div>
    );
}
