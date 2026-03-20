"use client";

import { ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

export type RiskLevel = "low" | "medium" | "high";

interface RiskBadgeProps {
    level: RiskLevel | string;
    showIcon?: boolean;
    className?: string;
}

export const RiskBadge = React.memo(({ level, showIcon = true, className }: RiskBadgeProps) => {
    const config = {
        low: {
            label: "Riesgo Bajo",
            color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            icon: ShieldCheck
        },
        medium: {
            label: "Riesgo Medio",
            color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            icon: AlertCircle
        },
        high: {
            label: "Riesgo Alto",
            color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
            icon: ShieldAlert
        }
    };

    const current = config[level as RiskLevel] || config.medium;
    const Icon = current.icon;

    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-black uppercase tracking-wider animate-fade-in",
            current.color,
            className
        )}>
            {showIcon && <Icon className="w-3 h-3" />}
            {current.label}
        </div>
    );
});

RiskBadge.displayName = "RiskBadge";
