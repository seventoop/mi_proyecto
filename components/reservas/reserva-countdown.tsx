"use client";

import { useEffect, useState, memo } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservaCountdownProps {
    fechaVencimiento: string;
    estado: string;
    estadoPago: string;
    compact?: boolean;
}

function calcTimeLeft(target: Date) {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        total: diff,
    };
}

export default memo(function ReservaCountdown({ fechaVencimiento, estado, estadoPago, compact }: ReservaCountdownProps) {
    const target = new Date(fechaVencimiento);
    const [timeLeft, setTimeLeft] = useState(calcTimeLeft(target));

    useEffect(() => {
        if (estado !== "ACTIVA") return;
        const interval = setInterval(() => {
            setTimeLeft(calcTimeLeft(target));
        }, 1000);
        return () => clearInterval(interval);
    }, [fechaVencimiento, estado, target]);

    // Already expired/resolved
    if (estado === "VENCIDA") {
        return (
            <div className={cn("flex items-center gap-2", compact ? "text-xs" : "")}>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400 font-semibold">Vencida</span>
            </div>
        );
    }
    if (estado === "CONVERTIDA") {
        return (
            <div className={cn("flex items-center gap-2", compact ? "text-xs" : "")}>
                <CheckCircle className="w-4 h-4 text-brand-400" />
                <span className="text-brand-400 font-semibold">Convertida a venta</span>
            </div>
        );
    }
    if (estado === "CANCELADA") {
        return (
            <div className={cn("flex items-center gap-2", compact ? "text-xs" : "")}>
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400 font-semibold">Cancelada</span>
            </div>
        );
    }

    // Active — show countdown
    const { days, hours, minutes, seconds, total } = timeLeft;
    const expired = total <= 0;
    const urgent = total > 0 && total < 6 * 60 * 60 * 1000; // < 6 hours
    const totalDuration = target.getTime() - new Date().getTime() + total;
    const progress = total > 0 ? Math.max(0, Math.min(100, (total / (totalDuration || 1)) * 100)) : 0;

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-1.5 text-xs font-semibold",
                expired ? "text-rose-400" : urgent ? "text-amber-400" : "text-emerald-400"
            )}>
                <Clock className="w-3 h-3" />
                {expired ? (
                    "Vencida"
                ) : (
                    <span>
                        {days > 0 && `${days}d `}
                        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                )}
            </div>
        );
    }

    // Full countdown with progress bar
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className={cn(
                    "flex items-center gap-2 font-bold",
                    expired ? "text-rose-400" : urgent ? "text-amber-400" : "text-emerald-400"
                )}>
                    <Clock className="w-5 h-5" />
                    <span className="text-sm">
                        {expired ? "Reserva vencida" : "Tiempo restante"}
                    </span>
                </div>
                {estadoPago === "PAGADO" && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        Seña pagada
                    </span>
                )}
            </div>

            {!expired && (
                <>
                    <div className="flex items-center gap-3">
                        {[
                            { label: "Días", value: days },
                            { label: "Horas", value: hours },
                            { label: "Min", value: minutes },
                            { label: "Seg", value: seconds },
                        ].map((item) => (
                            <div key={item.label} className="text-center flex-1">
                                <div className={cn(
                                    "text-2xl font-bold tabular-nums",
                                    urgent ? "text-amber-400" : "text-slate-700 dark:text-white"
                                )}>
                                    {String(item.value).padStart(2, "0")}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                                    {item.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                urgent
                                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                                    : "bg-gradient-to-r from-emerald-500 to-brand-500"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <p className="text-xs text-slate-400">
                        Vence: {target.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                </>
            )}
        </div>
    );
});
