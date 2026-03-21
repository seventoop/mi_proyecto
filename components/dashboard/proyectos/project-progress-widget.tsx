"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
    id: string;
    num: number;
    label: string;
    done: boolean;
}

interface ProjectProgressWidgetProps {
    steps: Step[];
    completedCount: number;
    activeTab: string;
}

export default function ProjectProgressWidget({
    steps,
    completedCount,
    activeTab,
}: ProjectProgressWidgetProps) {
    const total = steps.length;
    const pct = Math.round((completedCount / total) * 100);
    const isComplete = completedCount === total;
    const pending = total - completedCount;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
                "shrink-0 hidden sm:block",
                "relative rounded-2xl border p-4 min-w-[220px]",
                "bg-white/70 dark:bg-[#111116]/80 backdrop-blur-md",
                isComplete
                    ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                    : "border-brand-orange/20 shadow-[0_0_20px_rgba(249,115,22,0.08)]"
            )}
        >
            {/* Ambient glow blob */}
            <div
                className={cn(
                    "absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-30 pointer-events-none",
                    isComplete ? "bg-emerald-400" : "bg-brand-orange"
                )}
            />

            {/* Header row */}
            <div className="flex items-center justify-between mb-3 relative">
                <div className="flex items-center gap-1.5">
                    {isComplete
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        : <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                    }
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-tight">
                        Configuración
                    </span>
                </div>
                {/* Counter badge */}
                <motion.div
                    key={completedCount}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    className={cn(
                        "flex items-baseline gap-0.5 px-2.5 py-1 rounded-xl font-black tabular-nums",
                        isComplete
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-brand-orange/10 text-brand-orange"
                    )}
                >
                    <span className="text-lg leading-none">{completedCount}</span>
                    <span className="text-sm text-slate-400 font-semibold">/{total}</span>
                </motion.div>
            </div>

            {/* Liquid progress bar */}
            <div className="relative h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                    className={cn(
                        "absolute inset-y-0 left-0 rounded-full overflow-hidden",
                        isComplete
                            ? "bg-emerald-500"
                            : "animate-liquid-flow"
                    )}
                    style={!isComplete ? {
                        background: "linear-gradient(90deg, #ea6c0a 0%, #f97316 40%, #fdba74 60%, #f97316 80%, #ea6c0a 100%)",
                        backgroundSize: "300% 100%",
                    } : undefined}
                >
                    {/* Shimmer sweep */}
                    {!isComplete && (
                        <span
                            className="absolute inset-0 block pointer-events-none"
                            style={{
                                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                                animation: "shimmer-sweep 2.5s ease-in-out infinite",
                            }}
                        />
                    )}
                </motion.div>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1 mb-2">
                {steps.map((step, idx) => {
                    const isDone = step.done;
                    const isActive = step.id === activeTab;
                    return (
                        <motion.div
                            key={step.id}
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                delay: 0.05 * idx + 0.2,
                                type: "spring",
                                stiffness: 400,
                                damping: 15,
                            }}
                            title={`Paso ${step.num}: ${step.label}${isDone ? " ✓" : " — pendiente"}`}
                            className={cn(
                                "rounded-full transition-all duration-300 cursor-default",
                                isActive
                                    ? "w-5 h-2.5 animate-glow-pulse"
                                    : "w-2.5 h-2.5",
                                isDone && !isActive
                                    ? "bg-brand-orange shadow-[0_0_6px_rgba(249,115,22,0.5)]"
                                    : isActive
                                    ? "bg-brand-orange"
                                    : "bg-slate-200 dark:bg-slate-700"
                            )}
                        />
                    );
                })}
            </div>

            {/* Status text */}
            <AnimatePresence mode="wait">
                <motion.p
                    key={completedCount}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className={cn(
                        "text-sm font-semibold",
                        isComplete
                            ? "text-emerald-500"
                            : "text-slate-400 dark:text-slate-500"
                    )}
                >
                    {isComplete
                        ? "✅ Proyecto listo para publicar"
                        : completedCount === 0
                        ? "Completá los pasos para publicar"
                        : `${pending} paso${pending !== 1 ? "s" : ""} pendiente${pending !== 1 ? "s" : ""}`}
                </motion.p>
            </AnimatePresence>
        </motion.div>
    );
}
