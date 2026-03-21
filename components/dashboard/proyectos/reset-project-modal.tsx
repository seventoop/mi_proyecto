"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, AlertTriangle, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ResetProjectModalProps {
    proyectoId: string;
}

type StepKey = "paso2" | "paso3" | "paso4" | "paso5";

interface StepConfig {
    key: StepKey;
    label: string;
    badge: string;
    description: string;
    detail: string;
    color: string;
}

const STEPS: StepConfig[] = [
    {
        key: "paso2",
        label: "Paso 2 — Plano DXF / Blueprint",
        badge: "Destructivo",
        description: "Elimina el plano SVG, todos los lotes generados, etapas y manzanas.",
        detail: "Incluye: masterplanSVG, etapas, manzanas, unidades e historial de cambios.",
        color: "text-rose-400",
    },
    {
        key: "paso3",
        label: "Paso 3 — Datos comerciales del Masterplan",
        badge: "Parcial",
        description: "Resetea estado, precios e historial de lotes. Mantiene la geometría.",
        detail: "Unidades quedan en DISPONIBLE con precio vacío. No borra polígonos.",
        color: "text-amber-400",
    },
    {
        key: "paso4",
        label: "Paso 4 — Mapa / Overlay",
        badge: "Reversible",
        description: "Limpia el overlay guardado y la posición del mapa.",
        detail: "El mapa vuelve a coordenadas por defecto. Se puede reconfigurar.",
        color: "text-sky-400",
    },
    {
        key: "paso5",
        label: "Paso 5 — Tour 360°",
        badge: "Destructivo",
        description: "Elimina todos los tours, escenas y hotspots configurados.",
        detail: "Las imágenes 360 subidas no se eliminan del storage, solo los registros.",
        color: "text-violet-400",
    },
];

const BADGE_STYLE: Record<string, string> = {
    Destructivo: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    Parcial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    Reversible: "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export default function ResetProjectModal({ proyectoId }: ResetProjectModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Record<StepKey, boolean>>({
        paso2: false,
        paso3: false,
        paso4: false,
        paso5: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; reset?: string[]; error?: string } | null>(null);

    const anySelected = Object.values(selected).some(Boolean);

    // Cuando paso2 está activo, paso3 se incluye automáticamente (dato cascade)
    const effectiveSteps = {
        ...selected,
        paso3: selected.paso3 || selected.paso2,
    };

    const handleToggle = (key: StepKey) => {
        setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleClose = () => {
        if (isLoading) return;
        setOpen(false);
        setResult(null);
        setSelected({ paso2: false, paso3: false, paso4: false, paso5: false });
    };

    const handleConfirm = async () => {
        if (!anySelected || isLoading) return;
        setIsLoading(true);
        setResult(null);
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ steps: selected }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ ok: true, reset: data.reset });
                // Reload page to reflect cleared data
                setTimeout(() => {
                    router.refresh();
                    handleClose();
                }, 1800);
            } else {
                setResult({ ok: false, error: data.error ?? "Error desconocido" });
            }
        } catch {
            setResult({ ok: false, error: "Error de red al ejecutar el reinicio." });
        } finally {
            setIsLoading(false);
        }
    };

    const stepLabels: Record<string, string> = {
        paso2: "Plano DXF",
        paso3: "Datos Masterplan",
        paso4: "Mapa / Overlay",
        paso5: "Tour 360°",
    };

    return (
        <>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 hover:border-rose-500/30 transition-all"
                title="Reiniciar datos del proyecto por etapa"
            >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar datos
            </button>

            {/* Modal */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ type: "spring", damping: 28, stiffness: 380 }}
                            className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="pointer-events-auto w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
                                            <RotateCcw className="w-4 h-4 text-rose-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-white">Reiniciar datos del proyecto</h2>
                                            <p className="text-sm text-slate-500">Solo modo administrador</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        disabled={isLoading}
                                        className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Steps selection */}
                                <div className="px-5 py-4 space-y-2.5">
                                    <p className="text-xs text-slate-400 mb-3">
                                        Seleccioná qué datos querés reiniciar. Podés elegir uno o varios pasos.
                                    </p>

                                    {STEPS.map((step) => {
                                        const isChecked = selected[step.key];
                                        const isDisabled = step.key === "paso3" && selected.paso2;

                                        return (
                                            <label
                                                key={step.key}
                                                className={cn(
                                                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                    isDisabled
                                                        ? "opacity-50 cursor-not-allowed border-slate-800 bg-slate-800/30"
                                                        : isChecked
                                                            ? "border-rose-500/40 bg-rose-500/8"
                                                            : "border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50"
                                                )}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked || isDisabled}
                                                        disabled={isDisabled || isLoading}
                                                        onChange={() => !isDisabled && handleToggle(step.key)}
                                                        className="w-3.5 h-3.5 rounded accent-rose-500"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={cn("text-xs font-semibold", isChecked || isDisabled ? step.color : "text-slate-200")}>
                                                            {step.label}
                                                        </span>
                                                        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide", BADGE_STYLE[step.badge])}>
                                                            {step.badge}
                                                        </span>
                                                        {isDisabled && (
                                                            <span className="text-xs text-slate-500 italic">incluido en Paso 2</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-400 leading-snug">{step.description}</p>
                                                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">{step.detail}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>

                                {/* Warning */}
                                {anySelected && !result && (
                                    <div className="mx-5 mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-300 leading-snug">
                                            Se eliminarán los datos seleccionados.{" "}
                                            <span className="font-bold">Esta acción no se puede deshacer.</span>{" "}
                                            La información general del proyecto (Paso 1) no se modifica.
                                        </p>
                                    </div>
                                )}

                                {/* Result feedback */}
                                {result && (
                                    <div className={cn(
                                        "mx-5 mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl border",
                                        result.ok
                                            ? "bg-emerald-500/10 border-emerald-500/25"
                                            : "bg-rose-500/10 border-rose-500/25"
                                    )}>
                                        {result.ok ? (
                                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            {result.ok ? (
                                                <>
                                                    <p className="text-sm text-emerald-300 font-semibold">Reinicio completado</p>
                                                    <p className="text-xs text-emerald-400/70 mt-0.5">
                                                        Resetado: {result.reset?.map((k) => stepLabels[k]).join(", ")}. Recargando...
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-sm text-rose-300">{result.error}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-slate-950/40">
                                    <button
                                        onClick={handleClose}
                                        disabled={isLoading}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={!anySelected || isLoading || result?.ok === true}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        {isLoading ? (
                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Reiniciando...</>
                                        ) : (
                                            <><RotateCcw className="w-3.5 h-3.5" />Confirmar reinicio</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
