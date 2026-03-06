"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Settings, Bell, Moon, Sun, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortafolioConfiguracionPage() {
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();
    const user = session?.user as any;

    const [emailNotifs, setEmailNotifs] = useState(true);

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-6 h-6 text-brand-500" />
                    Configuración
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Preferencias de tu cuenta y notificaciones.
                </p>
            </div>

            {/* Perfil */}
            <section className="glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-500" /> Datos de Perfil
                </h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            defaultValue={user?.name ?? ""}
                            disabled
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-white/10 text-slate-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            defaultValue={user?.email ?? ""}
                            disabled
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-white/10 text-slate-500 text-sm cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-slate-400">
                        Para modificar tu nombre o email, contactá a soporte.
                    </p>
                </div>
            </section>

            {/* Apariencia */}
            <section className="glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-brand-500" /> Apariencia
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setTheme("light")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                            theme === "light"
                                ? "border-brand-500 bg-brand-500/10 text-brand-500"
                                : "border-white/10 text-slate-500 hover:border-white/20"
                        )}
                    >
                        <Sun className="w-4 h-4" /> Claro
                    </button>
                    <button
                        onClick={() => setTheme("dark")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                            theme === "dark"
                                ? "border-brand-500 bg-brand-500/10 text-brand-500"
                                : "border-white/10 text-slate-500 hover:border-white/20"
                        )}
                    >
                        <Moon className="w-4 h-4" /> Oscuro
                    </button>
                </div>
            </section>

            {/* Notificaciones */}
            <section className="glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-500" /> Notificaciones
                </h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Notificaciones por email</p>
                        <p className="text-xs text-slate-500">Recibí alertas de inversiones, verificaciones y novedades.</p>
                    </div>
                    <div
                        onClick={() => setEmailNotifs(!emailNotifs)}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-colors cursor-pointer",
                            emailNotifs ? "bg-brand-500" : "bg-slate-300 dark:bg-slate-700"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                            emailNotifs ? "translate-x-5" : "translate-x-0"
                        )} />
                    </div>
                </div>
            </section>

            {/* Seguridad */}
            <section className="glass-card p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-500" /> Seguridad
                </h2>
                <a
                    href="/forgot-password"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-brand-500/50 hover:text-brand-500 transition-all"
                >
                    Cambiar contraseña
                </a>
            </section>
        </div>
    );
}
