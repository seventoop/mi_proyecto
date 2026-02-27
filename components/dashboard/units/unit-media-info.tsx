"use client";

import { Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnitMediaInfoProps {
    form: any;
    updateForm: (key: string, value: any) => void;
}

export default function UnitMediaInfo({ form, updateForm }: UnitMediaInfoProps) {
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <label className={labelClass}>Galería de imágenes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {form.imagenes.length > 0 && form.imagenes.map((img: string, i: number) => (
                        <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-slate-200 dark:bg-slate-700 group">
                            <div className="absolute inset-0 bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <button className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ))}
                    <button className="aspect-video rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center hover:border-brand-500/50 transition-colors cursor-pointer">
                        <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500">Agregar foto</span>
                    </button>
                </div>
            </div>
            <div>
                <label className={labelClass}>Tour 360° URL</label>
                <input type="url" value={form.tour360Url} onChange={(e) => updateForm("tour360Url", e.target.value)}
                    placeholder="https://tour360.example.com/unidad-a01" className={inputClass} />
                <p className="text-xs text-slate-400 mt-1">URL del tour virtual 360° (Matterport, Kuula, etc.)</p>
            </div>
        </div>
    );
}
