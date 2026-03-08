"use client";

import { useState } from "react";
import { X, ChevronRight, Calendar, DollarSign, Check, User } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { iniciarReserva } from "@/lib/actions/reservas";

interface WizardUnit {
    id: string;
    numero: string;
    superficie?: number | null;
    precio?: number | null;
    moneda?: string;
    estado: string;
}

interface ReservaWizardProps {
    unidad: WizardUnit;
    proyectoId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const STEPS = ["Confirmar lote", "Información", "Confirmación"];

export default function ReservaWizard({ unidad, proyectoId, onClose, onSuccess }: ReservaWizardProps) {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        compradorNombre: "",
        compradorEmail: "",
        notas: "",
        montoSena: "",
        moneda: "USD",
        fechaVencimiento: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    const next = () => setStep(s => Math.min(s + 1, 2));
    const back = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await iniciarReserva({
                unidadId: unidad.id,
                proyectoId,
                compradorNombre: form.compradorNombre,
                compradorEmail: form.compradorEmail || undefined,
                notas: form.notas || undefined,
                montoSena: form.montoSena ? Number(form.montoSena) : undefined,
                fechaVencimiento: form.fechaVencimiento,
            });
            if (res.success) {
                toast.success(`Reserva iniciada para Lote #${unidad.numero}`);
                onSuccess();
            } else {
                toast.error(res.error || "Error al crear la reserva");
            }
        } catch {
            toast.error("Error al crear la reserva");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white">Nueva Reserva — Lote #{unidad.numero}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>

                {/* Step indicators */}
                <div className="flex px-5 pt-4 gap-2">
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex-1 flex items-center gap-1">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                                i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-orange text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                            )}>
                                {i < step ? <Check className="w-3 h-3" /> : i + 1}
                            </div>
                            <span className={cn("text-xs font-medium truncate", i === step ? "text-brand-orange" : "text-slate-400")}>{s}</span>
                            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-1" />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 min-h-[220px]">
                    {step === 0 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Lote</span>
                                    <span className="font-bold text-slate-800 dark:text-white">#{unidad.numero}</span>
                                </div>
                                {unidad.superficie && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Superficie</span>
                                        <span className="font-bold">{unidad.superficie} m²</span>
                                    </div>
                                )}
                                {unidad.precio && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Precio</span>
                                        <span className="font-bold text-brand-orange">{formatCurrency(unidad.precio)} {unidad.moneda || "USD"}</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Nombre del comprador *
                                </label>
                                <input
                                    type="text"
                                    value={form.compradorNombre}
                                    onChange={e => setForm(f => ({ ...f, compradorNombre: e.target.value }))}
                                    placeholder="Nombre completo"
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Email del comprador</label>
                                <input
                                    type="email"
                                    value={form.compradorEmail}
                                    onChange={e => setForm(f => ({ ...f, compradorEmail: e.target.value }))}
                                    placeholder="email@ejemplo.com"
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Notas</label>
                                <textarea
                                    rows={2}
                                    value={form.notas}
                                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                                    placeholder="Observaciones adicionales..."
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5" /> Monto de seña
                                    </label>
                                    <input
                                        type="number"
                                        value={form.montoSena}
                                        onChange={e => setForm(f => ({ ...f, montoSena: e.target.value }))}
                                        placeholder="0"
                                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Moneda</label>
                                    <select
                                        value={form.moneda}
                                        onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                                        className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Fecha de vencimiento
                                </label>
                                <input
                                    type="date"
                                    value={form.fechaVencimiento}
                                    onChange={e => setForm(f => ({ ...f, fechaVencimiento: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                                />
                            </div>
                            <button onClick={next} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                Continuar sin señar por ahora →
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-700 dark:text-slate-300">Resumen de reserva</h3>
                            {[
                                { label: "Lote", value: `#${unidad.numero}` },
                                { label: "Comprador", value: form.compradorNombre || "No especificado" },
                                { label: "Email", value: form.compradorEmail || "No especificado" },
                                { label: "Seña", value: form.montoSena ? `${formatCurrency(Number(form.montoSena))} ${form.moneda}` : "Sin seña" },
                                { label: "Vencimiento", value: new Date(form.fechaVencimiento).toLocaleDateString("es-AR") },
                            ].map(r => (
                                <div key={r.label} className="flex justify-between text-sm">
                                    <span className="text-slate-500">{r.label}</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{r.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
                    {step > 0 && (
                        <button onClick={back} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-200 transition-colors">
                            Atrás
                        </button>
                    )}
                    <div className="flex-1" />
                    {step < 2 ? (
                        <button
                            onClick={next}
                            disabled={step === 0 && !form.compradorNombre}
                            className="px-6 py-2 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orangeDark disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {step === 0 ? "Continuar" : "Confirmar seña"} <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {loading ? "Reservando..." : "Confirmar Reserva"} <Check className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
