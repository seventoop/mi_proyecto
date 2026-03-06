"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
    return (
        <div className="animate-fade-in w-full max-w-md mx-auto p-6">
            <div className="mb-8">
                <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al login
                </Link>
            </div>

            <div className="space-y-2 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center mb-6">
                    <Mail className="w-6 h-6 text-brand-orange" />
                </div>
                <h2 className="text-2xl font-bold text-white">¿Olvidaste tu contraseña?</h2>
                <p className="text-slate-400">
                    Ingresa tu email y te enviaremos las instrucciones para restablecer tu acceso.
                </p>
            </div>

            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs italic leading-relaxed">
                    Nota: Actualmente el sistema de recuperación está en mantenimiento. Contacta a soporte si necesitas ayuda inmediata.
                </div>

                <button
                    type="submit"
                    className="w-full py-3 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all"
                >
                    Enviar instrucciones
                </button>
            </form>
        </div>
    );
}
