"use client";

import { useState, useEffect } from "react";
import ProyectoForm from "@/components/dashboard/proyectos/proyecto-form";
import { ArrowLeft, ShieldAlert, Activity, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getUserKYC } from "@/lib/actions/kyc";
import { activateDemoMode } from "@/lib/actions/auth-actions";

export default function NewProyectoDeveloperPage() {
    const { data: session, update } = useSession();
    const [showForm, setShowForm] = useState(false);
    const [kycStatus, setKycStatus] = useState<string | null>(null);
    const [hasActiveDemo, setHasActiveDemo] = useState(false);
    const [isDemoUsed, setIsDemoUsed] = useState(false);
    const [riskLevel, setRiskLevel] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActivating, setIsActivating] = useState(false);

    useEffect(() => {
        if (session?.user) {
            checkInitialStatus();
        }
    }, [session]);

    const checkInitialStatus = async () => {
        const res = await getUserKYC((session?.user as any).id);
        if (res.success && res.data) {
            const userData = res.data as any;
            setKycStatus(userData.kycStatus);
            setRiskLevel(userData.riskLevel);
            setIsDemoUsed(userData.demoUsed);

            const isVerified = userData.kycStatus === "VERIFICADO";
            const isDemoEligible = userData.demoEndsAt && new Date(userData.demoEndsAt) > new Date();

            setHasActiveDemo(!!isDemoEligible);

            // If already verified or demo active, go straight to form
            if (isVerified || isDemoEligible) {
                setShowForm(true);
            }
        }
        setLoading(false);
    };

    const handleQuickStart = async () => {
        setIsActivating(true);
        try {
            const res = await activateDemoMode();
            // Success means it's now active (or was already)
            if (res.success) {
                // INSTANT TRANSITION - Don't wait for another round-trip if we know the goal is met
                setHasActiveDemo(true);
                setShowForm(true);

                // Background sync
                checkInitialStatus();
                update();
            } else {
                // If it really failed (e.g. they ALREADY used their 48h and it expired)
                alert(res.error || "No se pudo iniciar el modo creación");
                setIsActivating(false);
            }
        } catch (error) {
            console.error("Error in QuickStart:", error);
            setIsActivating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">Verificando Credenciales...</p>
                </div>
            </div>
        );
    }

    if (!showForm) {
        return (
            <div className="min-h-screen p-6 bg-slate-50 dark:bg-slate-950/20">
                <Link href="/dashboard/developer/proyectos" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand-500 transition-all mb-8 group">
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Volver a Proyectos
                </Link>

                <div className="max-w-3xl mx-auto">
                    <div className="p-1 sm:p-2 rounded-[3rem] bg-gradient-to-br from-brand-500/20 via-transparent to-brand-500/10 border border-brand-500/10 shadow-2xl">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-center border border-white/10 relative overflow-hidden">
                            {/* Decorative background splashes */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <div className="w-24 h-24 bg-brand-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-brand-500 rotate-3 transition-transform hover:rotate-0 shadow-2xl shadow-brand-500/10">
                                    <ShieldAlert className="w-12 h-12" />
                                </div>

                                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter uppercase italic leading-none">
                                    Impulsa tu <span className="text-brand-500">Desarrollo</span>
                                </h1>

                                <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-lg mx-auto font-bold text-lg leading-relaxed">
                                    {isDemoUsed
                                        ? "Tu periodo de prueba ha finalizado. Completa el KYC para oficializar tus proyectos y seguir creciendo."
                                        : "Inicia la carga de tu proyecto ahora mismo. Tienes 48 horas de acceso total mientras formalizas tu verificación de identidad."
                                    }
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                    {!isDemoUsed ? (
                                        <button
                                            onClick={handleQuickStart}
                                            disabled={isActivating}
                                            className="group w-full sm:w-auto px-10 py-5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                                            {isActivating ? "Iniciando..." : "Empieza a crear tu proyecto"}
                                            <ArrowRight className={isActivating ? "animate-spin w-5 h-5" : "w-5 h-5 transition-transform group-hover:translate-x-1"} />
                                        </button>
                                    ) : (
                                        <Link
                                            href="/dashboard/developer/mi-perfil/kyc"
                                            className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-brand-500/30 transition-all active:scale-95 text-center flex items-center justify-center gap-3"
                                        >
                                            Completar Verificación
                                            <Sparkles className="w-5 h-5" />
                                        </Link>
                                    )}

                                    {!isDemoUsed && (
                                        <Link
                                            href="/dashboard/developer/mi-perfil/kyc"
                                            className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm border border-slate-200 dark:border-white/10 transition-all hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 text-center"
                                        >
                                            Verificar KYC
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-8 text-slate-400 font-bold uppercase tracking-widest text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            Acceso Inmediato
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            48h de Prueba
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            Carga Ilimitada
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-slate-50 dark:bg-slate-950/20">
            <Link href="/dashboard/developer/proyectos" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand-500 transition-all mb-4 group">
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Volver a Proyectos
            </Link>

            <div className="max-w-6xl mx-auto">
                {hasActiveDemo && kycStatus !== "VERIFICADO" && (
                    <div className="mb-10 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-brand-500/20 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-6 shadow-2xl shadow-brand-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl transition-all group-hover:bg-brand-500/10" />

                        <div className="w-16 h-16 rounded-[1.5rem] bg-brand-500 flex items-center justify-center text-white shrink-0 shadow-2xl shadow-brand-500/40 rotate-3 transition-transform group-hover:rotate-0">
                            <Activity className="w-8 h-8 animate-pulse" />
                        </div>
                        <div className="text-center sm:text-left relative z-10">
                            <p className="text-lg font-black text-brand-500 uppercase tracking-tighter italic leading-none flex items-center justify-center sm:justify-start gap-2">
                                <Sparkles className="w-4 h-4" />
                                Modo Proyecto Activo
                            </p>
                            <p className="text-slate-600 dark:text-brand-400/80 font-bold leading-tight mt-2 text-balance lg:text-lg">
                                Estás operando bajo el periodo de gracia. Tienes 48h para formalizar tu perfil oficial y asegurar tus publicaciones.
                            </p>
                        </div>
                        <div className="sm:ml-auto">
                            <Link
                                href="/dashboard/developer/mi-perfil/kyc"
                                className="px-6 py-3 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 font-black uppercase tracking-widest text-xs transition-all border border-brand-500/20 flex items-center gap-2"
                            >
                                Formalizar KYC
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>
                )}

                <ProyectoForm
                    onClose={() => window.location.href = "/dashboard/developer/proyectos"}
                    userRole="DESARROLLADOR"
                    kycStatus={kycStatus || undefined}
                    riskLevel={riskLevel || undefined}
                />
            </div>
        </div>
    );
}
