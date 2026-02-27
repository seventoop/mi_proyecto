"use client";

import { DollarSign, Calculator } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface UnitPricingInfoProps {
    form: any;
    errors: Record<string, string>;
    updateForm: (key: string, value: any) => void;
    updateFinanciacion: (key: string, value: string) => void;
}

export default function UnitPricingInfo({ form, errors, updateForm, updateFinanciacion }: UnitPricingInfoProps) {
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Precio</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                        <input type="number" value={form.precio} onChange={(e) => updateForm("precio", e.target.value)}
                            placeholder="0" className={cn(inputClass, "pl-8", errors.precio && "border-rose-400")} />
                    </div>
                    {form.precio && (
                        <p className="text-xs text-slate-400 mt-1">{formatCurrency(parseFloat(form.precio) || 0)}</p>
                    )}
                </div>
                <div>
                    <label className={labelClass}>Moneda</label>
                    <div className="flex gap-2">
                        {["USD", "ARS", "EUR"].map((m) => (
                            <button key={m} onClick={() => updateForm("moneda", m)}
                                className={cn("flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                                    form.moneda === m
                                        ? "bg-brand-orange/10 border-brand-orange/30 text-brand-orange"
                                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500"
                                )}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Financiación */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-3">Opciones de Financiación</h3>
                <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Cuotas</label>
                            <input type="number" value={form.financiacion.cuotas} onChange={(e) => updateFinanciacion("cuotas", e.target.value)}
                                placeholder="12" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Anticipo (%)</label>
                            <input type="number" value={form.financiacion.anticipo} onChange={(e) => updateFinanciacion("anticipo", e.target.value)}
                                placeholder="30" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Tasa anual (%)</label>
                            <input type="number" value={form.financiacion.tasaInteres} onChange={(e) => updateFinanciacion("tasaInteres", e.target.value)}
                                placeholder="0" className={inputClass} />
                        </div>
                    </div>
                    {form.precio && form.financiacion.cuotas && form.financiacion.anticipo && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-400 mb-2">Simulación:</p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-2 rounded-lg bg-white dark:bg-slate-800">
                                    <p className="text-sm font-bold text-brand-orange">
                                        {formatCurrency((parseFloat(form.precio) * parseFloat(form.financiacion.anticipo)) / 100)}
                                    </p>
                                    <p className="text-[10px] text-slate-400">Anticipo</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-white dark:bg-slate-800">
                                    <p className="text-sm font-bold text-brand-yellow">
                                        {formatCurrency(
                                            (parseFloat(form.precio) * (1 - parseFloat(form.financiacion.anticipo) / 100)) /
                                            parseInt(form.financiacion.cuotas)
                                        )}
                                    </p>
                                    <p className="text-[10px] text-slate-400">Cuota mensual</p>
                                </div>
                                <div className="text-center p-2 rounded-lg bg-white dark:bg-slate-800">
                                    <p className="text-sm font-bold text-slate-600 dark:text-white">
                                        {form.financiacion.cuotas}
                                    </p>
                                    <p className="text-[10px] text-slate-400">Meses</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
