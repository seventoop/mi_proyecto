"use client";

import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Info,
    ChevronRight,
    Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export type ActivityStatus = "info" | "success" | "warning" | "error";

export interface Activity {
    id: string;
    type: string;
    title: string;
    description: string;
    date: Date;
    status: ActivityStatus;
}

interface ActivityCenterProps {
    userRole: "ADMIN" | "VENDEDOR" | "INVERSOR" | "CLIENTE";
    activities: Activity[];
}

const statusConfig = {
    info: {
        icon: Info,
        color: "text-blue-500",
        bg: "bg-blue-500/10 dark:bg-blue-500/10",
        border: "border-blue-500/20",
        dot: "bg-blue-500"
    },
    success: {
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
        border: "border-emerald-500/20",
        dot: "bg-emerald-500"
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-500",
        bg: "bg-amber-500/10 dark:bg-amber-500/10",
        border: "border-amber-500/20",
        dot: "bg-amber-500"
    },
    error: {
        icon: XCircle,
        color: "text-rose-500",
        bg: "bg-rose-500/10 dark:bg-rose-500/10",
        border: "border-rose-500/20",
        dot: "bg-rose-500"
    }
};

export default function ActivityCenter({ userRole, activities }: ActivityCenterProps) {
    const latestActivities = activities.slice(0, 6);

    return (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-brand-500/10">
                        <Bell className="w-4 h-4 text-brand-500" />
                    </div>
                    <div>
                        <h2 className="text-[13px] font-bold text-slate-900 dark:text-zinc-100">Actividad Reciente</h2>
                        <p className="text-[10px] text-slate-400 dark:text-white/40 font-medium uppercase tracking-widest">Panel desarrollador</p>
                    </div>
                </div>
                {latestActivities.length > 0 && (
                    <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">
                        {latestActivities.length} eventos
                    </span>
                )}
            </div>

            {/* Activity List */}
            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {latestActivities.length > 0 ? (
                    latestActivities.map((activity) => {
                        const config = statusConfig[activity.status];
                        const Icon = config.icon;

                        return (
                            <div key={activity.id} className="group px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors duration-200">
                                <div className="flex items-start gap-3.5">
                                    {/* Status Dot Timeline */}
                                    <div className="flex flex-col items-center pt-1">
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", config.bg, config.color)}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                            <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 truncate">
                                                {activity.title}
                                            </p>
                                            <span className="text-[10px] font-medium text-slate-400 dark:text-white/30 whitespace-nowrap shrink-0">
                                                {formatDistanceToNow(activity.date, { addSuffix: true, locale: es })}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 dark:text-white/40 font-medium line-clamp-1 leading-relaxed">
                                            {activity.description}
                                        </p>
                                    </div>

                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-white/20 shrink-0 opacity-0 group-hover:opacity-100 mt-1 transition-opacity" />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-14 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-5 h-5 text-slate-400 dark:text-white/30" />
                        </div>
                        <p className="text-[13px] font-semibold text-slate-500 dark:text-white/40">Sin actividad reciente</p>
                        <p className="text-[11px] text-slate-400 dark:text-white/25 font-medium mt-1 max-w-[200px] mx-auto">
                            Los cambios de estado y eventos aparecerán aquí.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {latestActivities.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                    <button className="text-[12px] font-bold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                        Ver historial completo →
                    </button>
                </div>
            )}
        </div>
    );
}
