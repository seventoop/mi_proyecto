"use client";

import { Home, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitBasicInfoProps {
    form: any;
    errors: Record<string, string>;
    updateForm: (key: string, value: any) => void;
}

const tipoOptions = [
    { value: "LOTE", label: "Lote" },
    { value: "DEPARTAMENTO", label: "Departamento" },
];

const orientaciones = ["N", "S", "E", "O", "NE", "NO", "SE", "SO"];

export default function UnitBasicInfo({ form, errors, updateForm }: UnitBasicInfoProps) {
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";
    const errorClass = "text-xs text-rose-400 mt-1 flex items-center gap-1";

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Número de unidad *</label>
                    <input type="text" value={form.numero} onChange={(e) => updateForm("numero", e.target.value)}
                        placeholder="Ej: A-01" className={cn(inputClass, errors.numero && "border-rose-400 ring-1 ring-rose-400/30")} />
                    {errors.numero && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.numero}</p>}
                </div>
                <div>
                    <label className={labelClass}>Tipo</label>
                    <div className="flex gap-2">
                        {tipoOptions.map((opt) => (
                            <button key={opt.value} onClick={() => updateForm("tipo", opt.value)}
                                className={cn("flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                                    form.tipo === opt.value
                                        ? "bg-brand-orange/10 border-brand-orange/30 text-brand-orange"
                                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-brand-orange/30"
                                )}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className={labelClass}>Superficie (m²)</label>
                    <input type="number" value={form.superficie} onChange={(e) => updateForm("superficie", e.target.value)}
                        placeholder="0" className={cn(inputClass, errors.superficie && "border-rose-400")} />
                    {errors.superficie && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.superficie}</p>}
                </div>
                <div>
                    <label className={labelClass}>Frente (m)</label>
                    <input type="number" value={form.frente} onChange={(e) => updateForm("frente", e.target.value)}
                        placeholder="0" className={cn(inputClass, errors.frente && "border-rose-400")} />
                </div>
                <div>
                    <label className={labelClass}>Fondo (m)</label>
                    <input type="number" value={form.fondo} onChange={(e) => updateForm("fondo", e.target.value)}
                        placeholder="0" className={cn(inputClass, errors.fondo && "border-rose-400")} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Orientación</label>
                    <div className="flex flex-wrap gap-1.5">
                        {orientaciones.map((o) => (
                            <button key={o} onClick={() => updateForm("orientacion", form.orientacion === o ? "" : o)}
                                className={cn("w-10 h-10 rounded-lg text-xs font-bold transition-all",
                                    form.orientacion === o
                                        ? "bg-brand-orange text-white shadow-glow"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                                )}>
                                {o}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 w-full">
                        <input type="checkbox" checked={form.esEsquina} onChange={(e) => updateForm("esEsquina", e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange" />
                        <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Es esquina</p>
                            <p className="text-xs text-slate-400">La unidad se ubica en esquina</p>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
}
