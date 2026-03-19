"use client";

import { useEffect, useState } from "react";
import { Clock, AlertCircle, CheckCircle2, ShieldAlert, ArrowRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { activateDemoMode } from "@/lib/actions/auth-actions";

interface KycDemoStatusCardProps {
    kycStatus: "NINGUNO" | "PENDIENTE" | "EN_REVISION" | "VERIFICADO" | "APROBADO" | "RECHAZADO" | "DEMO_EXPIRADO" | string;
    demoEndsAt: Date | null;
    demoUsed: boolean;
}

export function KycDemoStatusCard({ kycStatus, demoEndsAt, demoUsed }: KycDemoStatusCardProps) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isVerified = kycStatus === "VERIFICADO" || kycStatus === "APROBADO";
    const hasDemo = demoEndsAt && new Date(demoEndsAt) > new Date();
    const demoHasEnded = demoEndsAt && new Date(demoEndsAt) <= new Date();

    useEffect(() => {
        if (!demoEndsAt || isVerified) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(demoEndsAt).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("EXPIRADO");
                setIsExpired(true);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${h}h ${m}m`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [demoEndsAt, isVerified]);

    const handleActivateDemo = async () => {
        setIsLoading(true);
        try {
            await activateDemoMode();
            window.location.reload();
        } catch (error) {
            console.error("Error activating demo:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isVerified) return null; // No need to show if already verified

    return (
        <div className={cn(
            "relative overflow-hidden group rounded-2xl border transition-all duration-300",
            hasDemo
                ? "bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent border-brand-500/20 shadow-lg shadow-brand-500/5"
                : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
        )}>
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/10 transition-colors" />

            <div className="relative p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300",
                        hasDemo ? "bg-brand-500 shadow-xl shadow-brand-500/30 text-white" : "bg-slate-200 dark:bg-white/10 text-slate-500"
                    )}>
                        {hasDemo ? <Activity className="w-7 h-7 animate-pulse" /> : <ShieldAlert className="w-7 h-7" />}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black italic uppercase tracking-tighter text-slate-900 dark:text-white text-lg">
                                {hasDemo ? "Modo Demo " : "Cuenta "}
                                <span className={cn(hasDemo ? "text-brand-500" : "text-amber-500")}>
                                    {hasDemo ? "Activado" : kycStatus === "RECHAZADO" ? "Verificación Rechazada" : "Pendiente"}
                                </span>
                            </h3>
                            {hasDemo && (
                                <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                            )}
                        </div>

                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-md">
                            {hasDemo
                                ? "Tu infraestructura está lista. Tienes 48 horas para publicar y configurar tu primer proyecto oficial."
                                : demoHasEnded || (demoUsed && !hasDemo)
                                    ? "Tu periodo de prueba ha terminado. Completa el KYC para profesionalizar tu cuenta."
                                    : "Activa tu demo de 48 horas para empezar a cargar proyectos de inmediato mientras verificamos tu identidad."
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto">
                    {hasDemo ? (
                        <div className="flex items-center gap-6 bg-white/50 dark:bg-black/20 px-6 py-3 rounded-2xl border border-white dark:border-white/5 backdrop-blur-sm">
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none mb-1">Tu Tiempo</p>
                                <p className="font-black text-brand-500 text-2xl tracking-tighter italic leading-none">
                                    {timeLeft}
                                </p>
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                            <Link
                                href="/dashboard/developer/mi-perfil/kyc"
                                className="group/btn flex items-center gap-2 text-xs font-black uppercase text-brand-500 hover:text-brand-600 transition-colors"
                            >
                                Validar KYC
                                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {!demoUsed && !demoHasEnded && (
                                <button
                                    onClick={handleActivateDemo}
                                    disabled={isLoading}
                                    className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase transition-all shadow-xl shadow-brand-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? "Activando..." : "Activar Demo 48h"}
                                    {!isLoading && <Activity className="w-4 h-4" />}
                                </button>
                            )}
                            <Link
                                href="/dashboard/developer/mi-perfil/kyc"
                                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase transition-all hover:opacity-90 active:scale-95 text-center"
                            >
                                Completar KYC
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar (only if demo active) */}
            {hasDemo && demoEndsAt && (
                <div className="h-1 w-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                    <div
                        className="h-full bg-brand-500 transition-all duration-1000"
                        style={{
                            width: `${Math.max(5, Math.min(100, (1 - (new Date(demoEndsAt).getTime() - new Date().getTime()) / (48 * 60 * 60 * 1000)) * 100))}%`
                        }}
                    />
                </div>
            )}
        </div>
    );
}
