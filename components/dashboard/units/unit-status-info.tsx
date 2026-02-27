"use client";

import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitStatusInfoProps {
    form: any;
    updateForm: (key: string, value: any) => void;
}

const estadoOptions = [
    { value: "DISPONIBLE", label: "Disponible", color: "bg-brand-orange" },
    { value: "BLOQUEADO", label: "Bloqueado", color: "bg-brand-gray" },
    { value: "RESERVADO", label: "Reservado", color: "bg-brand-yellow" },
    { value: "VENDIDO", label: "Vendido", color: "bg-slate-300" },
];

export default function UnitStatusInfo({ form, updateForm }: UnitStatusInfoProps) {
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <label className={labelClass}>Estado de la unidad</label>
                <div className="grid grid-cols-2 gap-3">
                    {estadoOptions.map((opt) => (
                        <button key={opt.value} onClick={() => updateForm("estado", opt.value)}
                            className={cn(
                                "p-4 rounded-xl border-2 text-left transition-all",
                                form.estado === opt.value
                                    ? "border-brand-orange/50 bg-brand-orange/5"
                                    : "border-slate-200 dark:border-slate-700 hover:border-brand-orange/30"
                            )}>
                            <div className="flex items-center gap-3">
                                <div className={cn("w-3 h-3 rounded-full", opt.color)} />
                                <span className="text-sm font-semibold text-slate-700 dark:text-white">{opt.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className={labelClass}>Responsable</label>
                <select value={form.responsableId} onChange={(e) => updateForm("responsableId", e.target.value)} className={inputClass}>
                    <option value="">Sin asignar</option>
                    <option value="user1">Juan Pérez</option>
                    <option value="user2">María López</option>
                    <option value="user3">Carlos Díaz</option>
                </select>
            </div>
        </div>
    );
}
