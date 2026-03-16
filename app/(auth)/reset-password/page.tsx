"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { resetPassword } from "@/lib/actions/auth-actions";
import { toast } from "sonner";

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [token, setToken] = useState<string | null>(searchParams.get("token"));

    useEffect(() => {
        if (searchParams.get("token")) {
            // Store token and clear URL to prevent exposure in history
            setToken(searchParams.get("token"));
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, [searchParams]);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPending, startTransition] = useTransition();
    const [isSuccess, setIsSuccess] = useState(false);

    if (!token) {
        return (
            <div className="animate-fade-in w-full max-w-md mx-auto p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Token inválido</h2>
                <p className="text-slate-400 mb-8">
                    El link de restablecimiento no es válido o ha expirado. Por favor, solicita uno nuevo.
                </p>
                <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Solicitar nuevo link
                </Link>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        startTransition(async () => {
            const res = await resetPassword({ token, password });
            if (res.success) {
                setIsSuccess(true);
                toast.success(res.message);
                setTimeout(() => router.push("/login"), 3000);
            } else {
                toast.error(res.error || "Error al restablecer la contraseña");
            }
        });
    };

    if (isSuccess) {
        return (
            <div className="animate-fade-in w-full max-w-md mx-auto p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
                <p className="text-slate-400 mb-8">
                    Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login en unos segundos.
                </p>
                <Link
                    href="/login"
                    className="text-brand-400 hover:text-brand-300 transition-colors font-medium underline"
                >
                    Ir al login ahora
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in w-full max-w-md mx-auto p-6">
            <div className="space-y-2 mb-8 text-center sm:text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 mx-auto sm:mx-0">
                    <Lock className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Nueva contraseña</h2>
                <p className="text-slate-400">
                    Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
                </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Nueva Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                            required
                            minLength={8}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Confirmar Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite tu contraseña"
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
                            Actualizando...
                        </>
                    ) : (
                        "Cambiar contraseña"
                    )}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
