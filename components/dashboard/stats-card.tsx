import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    variant?: "default" | "brand" | "emerald" | "amber" | "rose";
}

const variantStyles = {
    default: {
        icon: "bg-brand-orange/10 text-brand-orange",
        ring: "",
    },
    brand: {
        icon: "bg-brand-orange text-white",
        ring: "ring-1 ring-brand-orange/20",
    },
    emerald: {
        icon: "bg-brand-orange/10 text-brand-orange",
        ring: "ring-1 ring-brand-orange/20",
    },
    amber: {
        icon: "bg-brand-yellow/10 text-brand-yellow",
        ring: "ring-1 ring-brand-yellow/20",
    },
    rose: {
        icon: "bg-brand-gray/10 text-brand-gray",
        ring: "ring-1 ring-brand-gray/20",
    },
};

export default function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = "default",
}: StatsCardProps) {
    const styles = variantStyles[variant];

    return (
        <div
            className={cn(
                "glass-card p-6 group cursor-default",
                styles.ring
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className={cn(
                        "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
                        styles.icon
                    )}
                >
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span
                        className={cn(
                            "text-xs font-bold px-2 py-1 rounded-lg",
                            trend.isPositive
                                ? "bg-brand-orange/10 text-brand-orange"
                                : "bg-brand-gray/10 text-brand-gray"
                        )}
                    >
                        {trend.isPositive ? "+" : ""}
                        {trend.value}%
                    </span>
                )}
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                {value}
            </h3>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-400">{title}</p>
            {subtitle && (
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-500 mt-1">
                    {subtitle}
                </p>
            )}
        </div>
    );
}
