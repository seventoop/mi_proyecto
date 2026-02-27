"use client";

import { memo } from "react";
import { BookmarkCheck, CreditCard, CalendarClock, XCircle, ArrowRightCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistorialItem {
    id: string;
    tipo: "creacion" | "pago" | "extension" | "cancelacion" | "conversion" | "vencimiento";
    descripcion: string;
    usuario?: string;
    fecha: string;
}

interface ReservaHistorialProps {
    items: HistorialItem[];
}

const iconMap = {
    creacion: { icon: BookmarkCheck, color: "text-brand-400", bg: "bg-brand-500/10" },
    pago: { icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    extension: { icon: CalendarClock, color: "text-brand-400", bg: "bg-brand-500/10" },
    cancelacion: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10" },
    conversion: { icon: ArrowRightCircle, color: "text-violet-400", bg: "bg-violet-500/10" },
    vencimiento: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default memo(function ReservaHistorial({ items }: ReservaHistorialProps) {
    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-slate-400">
                Sin historial de eventos
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[17px] top-2 bottom-2 w-[2px] bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-4">
                {items.map((item, idx) => {
                    const cfg = iconMap[item.tipo] || iconMap.creacion;
                    const Icon = cfg.icon;
                    return (
                        <div key={item.id || idx} className="flex items-start gap-3 relative">
                            <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10", cfg.bg)}>
                                <Icon className={cn("w-4 h-4", cfg.color)} />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <p className="text-sm text-slate-700 dark:text-slate-200">
                                    {item.descripcion}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {item.usuario && (
                                        <span className="text-xs text-slate-400">{item.usuario}</span>
                                    )}
                                    <span className="text-xs text-slate-400">
                                        {new Date(item.fecha).toLocaleDateString("es-AR", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
