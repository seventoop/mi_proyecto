"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitLocationInfoProps {
    form: any;
    updateForm: (key: string, value: any) => void;
}

export default function UnitLocationInfo({ form, updateForm }: UnitLocationInfoProps) {
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Etapa</label>
                    <select value={form.etapaId} onChange={(e) => updateForm("etapaId", e.target.value)} className={inputClass}>
                        <option value="">Seleccionar etapa</option>
                        <option value="e1">Etapa 1</option>
                        <option value="e2">Etapa 2</option>
                        <option value="e3">Etapa 3</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Manzana</label>
                    <select value={form.manzanaId} onChange={(e) => updateForm("manzanaId", e.target.value)} className={inputClass}>
                        <option value="">Seleccionar manzana</option>
                        <option value="m1">Manzana A</option>
                        <option value="m2">Manzana B</option>
                        <option value="m3">Manzana C</option>
                    </select>
                </div>
            </div>
            <div>
                <label className={labelClass}>Preview del Masterplan</label>
                <div className="relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 p-4 h-64 overflow-hidden">
                    <svg viewBox="0 0 400 200" className="w-full h-full">
                        <defs>
                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-300 dark:text-slate-600" />
                            </pattern>
                        </defs>
                        <rect width="400" height="200" fill="url(#grid)" />
                        {[
                            { x: 30, y: 30, w: 50, h: 35, label: "A-01", active: form.numero === "A-01" },
                            { x: 85, y: 30, w: 50, h: 35, label: "A-02", active: form.numero === "A-02" },
                            { x: 140, y: 30, w: 50, h: 35, label: "A-03", active: form.numero === "A-03" },
                            { x: 30, y: 80, w: 50, h: 35, label: "B-01", active: form.numero === "B-01" },
                            { x: 85, y: 80, w: 50, h: 35, label: "B-02", active: form.numero === "B-02" },
                        ].map((lot) => (
                            <g key={lot.label}>
                                <rect x={lot.x} y={lot.y} width={lot.w} height={lot.h}
                                    fill={lot.active ? "rgba(249, 115, 22, 0.3)" : "rgba(100, 116, 139, 0.1)"}
                                    stroke={lot.active ? "#F97316" : "#64748b"}
                                    strokeWidth={lot.active ? 2 : 0.5}
                                    rx={3} className="cursor-pointer hover:fill-brand-500/20 transition-all" />
                                <text x={lot.x + lot.w / 2} y={lot.y + lot.h / 2 + 4}
                                    textAnchor="middle" fontSize="8"
                                    fill={lot.active ? "#F97316" : "#94a3b8"} fontWeight={lot.active ? 700 : 400}>
                                    {lot.label}
                                </text>
                            </g>
                        ))}
                    </svg>
                    <p className="absolute bottom-2 left-3 text-[10px] text-slate-400">
                        Haz clic en un lote para seleccionar su ubicación
                    </p>
                </div>
            </div>
        </div>
    );
}
