"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoginGateProps {
    isOpen: boolean;
    onClose: () => void;
    redirectTo?: string;
    triggerAction?: string; // "Reservar este lote", "Ver precio completo", etc.
}

export default function LoginGate({ isOpen, onClose, redirectTo, triggerAction }: LoginGateProps) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        nombre: "",
    });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (mode === "login") {
            try {
                const result = await signIn("credentials", {
                    email: formData.email,
                    password: formData.password,
                    redirect: false,
                });

                if (result?.error) {
                    setError("Credenciales inválidas. Por favor intenta de nuevo.");
                    setIsLoading(false);
                    return;
                }

                // Success
                if (redirectTo) {
                    router.push(redirectTo);
                } else {
                    router.push("/dashboard");
                    router.refresh();
                }
                onClose();
            } catch (err) {
                setError("Ocurrió un error inesperado. Intenta de nuevo.");
            } finally {
                setIsLoading(false);
            }
        } else {
            // Register logic would go here, for now just a message or TODO
            setError("El registro no está habilitado desde aquí. Contacta con tu administrador.");
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-black rounded-3xl border border-white/10 shadow-2xl overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/10 relative">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
                                    </h2>
                                    {triggerAction && (
                                        <p className="text-sm text-brand-muted font-bold">
                                            Para <span className="text-brand-orange font-black">"{triggerAction}"</span> necesitas una cuenta
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {mode === "register" && (
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            Nombre completo
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                className="w-full pl-11 pr-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                                                placeholder="Juan Pérez"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                                            placeholder="tu@email.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-black border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "w-full py-3.5 rounded-xl gradient-brand text-white font-bold text-lg shadow-glow hover:shadow-glow-lg transition-all flex items-center justify-center gap-2",
                                        isLoading && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="p-6 bg-black border-t border-white/10 text-center">
                                <button
                                    onClick={() => setMode(mode === "login" ? "register" : "login")}
                                    className="text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    {mode === "login" ? (
                                        <>¿No tienes cuenta? <span className="text-brand-orange font-black transition-colors">Regístrate gratis</span></>
                                    ) : (
                                        <>¿Ya tienes cuenta? <span className="text-brand-orange font-black transition-colors">Inicia sesión</span></>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
