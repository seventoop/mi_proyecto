"use client";

import { cn } from "@/lib/utils";

export type Period = "7d" | "30d";

interface PeriodSelectorProps {
    period: Period;
    onChangePeriod: (p: Period) => void;
}

export function PeriodSelector({ period, onChangePeriod }: PeriodSelectorProps) {
    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl p-1">
            {(["7d", "30d"] as Period[]).map((p) => (
                <button
                    key={p}
                    onClick={() => onChangePeriod(p)}
                    className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all",
                        period === p
                            ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                            : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 hover:bg-white dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none"
                    )}
                >
                    {p === "7d" ? "7 días" : "30 días"}
                </button>
            ))}
        </div>
    );
}
