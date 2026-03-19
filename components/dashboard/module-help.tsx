"use client";

import { useState, useEffect } from "react";
import { Info, X, ChevronDown, CheckCircle2, Target, Lightbulb, PlayCircle, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleHelpContent } from "@/config/dashboard/module-help-content";

export function ModuleHelp({ content }: { content: ModuleHelpContent }) {
    const { title, description, whatIs, howItWorks, whatFor, firstStep, moduleKey } = content;
    const [isOpen, setIsOpen] = useState(false);
    const [isDismissed, setIsDismissed] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const dismissed = localStorage.getItem(`help_dismissed_${moduleKey}`);
        if (dismissed !== "true") {
            setIsDismissed(false);
        }
    }, [moduleKey]);

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsOpen(false);
        localStorage.setItem(`help_dismissed_${moduleKey}`, "true");
    };

    const showButton = isMounted && !isDismissed;

    return (
        <div className="w-full mb-6 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                        {title}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-white/50 mt-1">
                        {description}
                    </p>
                </div>
                {showButton && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={cn(
                            "group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[13px] font-semibold transition-all shrink-0",
                            isOpen 
                                ? "bg-brand-500/10 border-brand-500/20 text-brand-600 dark:text-brand-400" 
                                : "bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:dark:bg-white/[0.08] text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none"
                        )}
                    >
                        <Info className={cn("w-[14px] h-[14px]", isOpen ? "text-brand-500" : "text-slate-400 dark:text-white/40 group-hover:dark:text-white/70 transition-colors")} />
                        ¿Cómo funciona?
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", isOpen && "rotate-180")} />
                    </button>
                )}
            </div>

            {/* Accordion Panel */}
            <div 
                className={cn(
                    "grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    isOpen ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0 mt-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="relative p-5 sm:p-7 bg-white dark:bg-[#09090b] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none">
                        
                        {/* Close Controls */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                            <button
                                onClick={handleDismiss}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-rose-500/10 text-[11px] font-bold text-slate-400 dark:text-white/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors uppercase tracking-widest"
                            >
                                <EyeOff className="w-3.5 h-3.5" />
                                No mostrar más
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 mt-2">
                            {/* Left Column */}
                            <div className="space-y-7">
                                <div>
                                    <h3 className="flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-white mb-3 uppercase tracking-widest">
                                        <Lightbulb className="w-4 h-4 text-amber-500" />
                                        Qué es
                                    </h3>
                                    <p className="text-sm font-medium text-slate-600 dark:text-white/60 leading-relaxed">
                                        {whatIs}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">
                                        <PlayCircle className="w-4 h-4 text-blue-500" />
                                        Cómo funciona
                                    </h3>
                                    <ul className="space-y-3">
                                        {howItWorks.map((step, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-[13px] font-medium text-slate-600 dark:text-white/60">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5 text-[10px] font-black text-slate-700 dark:text-white/70 shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </span>
                                                <span className="leading-relaxed">{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-7 md:pt-0">
                                <div>
                                    <h3 className="flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">
                                        <Target className="w-4 h-4 text-emerald-500" />
                                        Para qué sirve
                                    </h3>
                                    <ul className="space-y-3">
                                        {whatFor.map((benefit, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-[13px] font-medium text-slate-600 dark:text-white/60">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <span className="leading-relaxed">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20">
                                    <h3 className="text-[10px] font-black text-brand-600 dark:text-brand-400 mb-2 uppercase tracking-widest">
                                        Primer paso recomendado
                                    </h3>
                                    <p className="text-[13px] text-brand-800 dark:text-brand-200/90 font-semibold leading-relaxed">
                                        {firstStep}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ModuleHelp;
