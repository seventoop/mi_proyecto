import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: number; // percentage change, positive = up, negative = down
    color?: "brand" | "emerald" | "amber" | "sky" | "rose";
    loading?: boolean;
}

const colorMap = {
    brand:   { bg: "bg-brand-500/10", border: "border-brand-500/20", icon: "text-brand-600 dark:text-brand-500", value: "text-brand-600 dark:text-brand-400" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-600 dark:text-emerald-500", value: "text-emerald-600 dark:text-emerald-400" },
    amber:   { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-600 dark:text-amber-500", value: "text-amber-600 dark:text-amber-400" },
    sky:     { bg: "bg-sky-500/10", border: "border-sky-500/20", icon: "text-sky-600 dark:text-sky-500", value: "text-sky-600 dark:text-sky-400" },
    rose:    { bg: "bg-rose-500/10", border: "border-rose-500/20", icon: "text-rose-600 dark:text-rose-500", value: "text-rose-600 dark:text-rose-400" },
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, color = "brand", loading }: MetricCardProps) {
    const colors = colorMap[color];

    return (
        <div className={cn(
            "relative bg-white dark:bg-[#09090b] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4",
            "hover:border-slate-300 dark:hover:border-white/[0.12] transition-all duration-200 shadow-sm dark:shadow-md"
        )}>
            {/* Top Row */}
            <div className="flex items-start justify-between">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", colors.bg, colors.border)}>
                    <Icon className={cn("w-5 h-5", colors.icon)} />
                </div>
                {trend !== undefined && (
                    <div className={cn(
                        "flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg",
                        trend > 0  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        trend < 0  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                     "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40"
                    )}>
                        {trend > 0  ? <TrendingUp className="w-3 h-3" /> :
                         trend < 0  ? <TrendingDown className="w-3 h-3" /> :
                                      <Minus className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            {/* Value */}
            <div>
                {loading ? (
                    <div className="h-8 w-20 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse mb-1" />
                ) : (
                    <p className={cn("text-3xl font-black tracking-tight", colors.value)}>{value}</p>
                )}
                <p className="text-sm font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-1">{title}</p>
                {subtitle && (
                    <p className="text-xs text-slate-400 dark:text-white/30 mt-1 font-medium">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
