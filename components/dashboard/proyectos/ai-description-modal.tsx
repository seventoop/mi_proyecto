"use client";

import { useState } from "react";
import {
    Wand2,
    Check,
    X,
    Loader2,
    Sparkles,
    FileText,
    List
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AISuggestion {
    improvedText: string;
    shortSummary: string;
    highlights: string[];
}

interface AIDescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (text: string) => void;
    suggestion: AISuggestion | null;
    loading: boolean;
}

export default function AIDescriptionModal({
    isOpen,
    onClose,
    onApply,
    suggestion,
    loading
}: AIDescriptionModalProps) {
    const [activeTab, setActiveTab] = useState<"improved" | "summary" | "highlights">("improved");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gradient-brand text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                            <Wand2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Asistente de IA Profesional</h3>
                            <p className="text-xs text-white/70">Mejorando tu descripción comercial</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
                                <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white mb-1">Redactando propuesta...</h4>
                                <p className="text-sm text-slate-500">Analizando el mercado y optimizando tu texto.</p>
                            </div>
                        </div>
                    ) : suggestion ? (
                        <div className="space-y-6">
                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                <button
                                    onClick={() => setActiveTab("improved")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                                        activeTab === "improved" ? "bg-white dark:bg-slate-700 text-brand-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    <Sparkles className="w-4 h-4" /> Descripción
                                </button>
                                <button
                                    onClick={() => setActiveTab("summary")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                                        activeTab === "summary" ? "bg-white dark:bg-slate-700 text-brand-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    <FileText className="w-4 h-4" /> Resumen
                                </button>
                                <button
                                    onClick={() => setActiveTab("highlights")}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all",
                                        activeTab === "highlights" ? "bg-white dark:bg-slate-700 text-brand-500 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    <List className="w-4 h-4" /> Destacados
                                </button>
                            </div>

                            {/* Suggestion Preview */}
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {activeTab === "improved" && (
                                    <div className="prose prose-slate dark:prose-invert max-w-none">
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {suggestion.improvedText}
                                        </p>
                                    </div>
                                )}
                                {activeTab === "summary" && (
                                    <div className="italic text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {suggestion.shortSummary}
                                    </div>
                                )}
                                {activeTab === "highlights" && (
                                    <ul className="space-y-3">
                                        {suggestion.highlights.map((h, i) => (
                                            <li key={i} className="flex gap-3">
                                                <div className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{h}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <p className="text-[10px] text-center text-slate-400">
                                Tip: Puedes editar el texto una vez aplicado al formulario principal.
                            </p>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-slate-500">
                            Lo sentimos, no pudimos generar una sugerencia.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        Descartar
                    </button>
                    <button
                        onClick={() => suggestion && onApply(suggestion.improvedText)}
                        disabled={!suggestion || loading}
                        className="px-8 py-2.5 gradient-brand text-white rounded-xl text-sm font-bold shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Check className="w-4 h-4" /> Aplicar descripción
                    </button>
                </div>
            </div>
        </div>
    );
}
