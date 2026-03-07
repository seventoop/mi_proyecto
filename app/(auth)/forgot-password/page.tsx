"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/actions/auth-actions";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isPending, startTransition] = useTransition();
    const [isSent, setIsSent] = useState(false);
    const [serverMsg, setServerMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        startTransition(async () => {
            const res = await requestPasswordReset(email);
            if (res.success) {
                setServerMsg(res.message || "Si el email existe, se enviarán las instrucciones.");
                setIsSent(true);
            } else {
                toast.error(res.error || "Error al solicitar el restablecimiento");
            }
        });
    };

    if (isSent) {
        return (
            <div className="animate-fade-in w-full max-w-md mx-auto p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Solicitud procesada</h2>
                <p className="text-slate-400 mb-8">
                    {serverMsg}
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio de sesión
                </Link>
            </div>
        );
    }

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

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-3 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar instrucciones"
                    )}
                </button>
            </form>
        </div>
    );
}
