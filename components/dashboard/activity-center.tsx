"use client";

import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Info,
    ChevronRight,
    Search
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
        bg: "bg-blue-500/10",
        border: "border-blue-500/20"
    },
    success: {
        icon: CheckCircle2,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20"
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20"
    },
    error: {
        icon: XCircle,
        color: "text-rose-500",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20"
    }
};

export default function ActivityCenter({ userRole, activities }: ActivityCenterProps) {
    const latestActivities = activities.slice(0, 5);

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-brand-500/10">
                        <Bell className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Centro de Actividad</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Panel de {userRole.toLowerCase()}</p>
                    </div>
                </div>
            </div>

            <div className="divide-y divide-white/10">
                {latestActivities.length > 0 ? (
                    latestActivities.map((activity) => {
                        const config = statusConfig[activity.status];
                        const Icon = config.icon;

                        return (
                            <div key={activity.id} className="p-4 hover:bg-white/5 transition-colors group">
                                <div className="flex gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                        config.bg,
                                        config.border,
                                        config.color
                                    )}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                                {activity.title}
                                            </h3>
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                {formatDistanceToNow(activity.date, { addSuffix: true, locale: es })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sin actividad reciente</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] mx-auto">
                            Las notificaciones y eventos importantes aparecerán en este panel.
                        </p>
                    </div>
                )}
            </div>

            {latestActivities.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] text-center">
                    <button className="text-sm font-bold text-brand-500 hover:text-brand-400 transition-colors">
                        Ver todo el historial
                    </button>
                </div>
            )}
        </div>
    );
}
