"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Mail, Lock, Eye, EyeOff, Loader2, User, ArrowLeft, Briefcase, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
    DESARROLLADOR: "Desarrollador",
    VENDEDOR: "Vendedor",
    INVERSOR: "Inversor",
    CLIENTE: "Cliente",
};

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = searchParams.get("role") || "INVERSOR";

    const [formData, setFormData] = useState({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: initialRole,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (initialRole) {
            setFormData(prev => ({ ...prev, role: initialRole }));
        }
    }, [initialRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (!acceptTerms) {
            setError("Debes aceptar los términos y condiciones");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: formData.nombre,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al registrarse");
            }

            router.push("/login?registered=true");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Error al crear la cuenta";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-glow">
                    <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold gradient-text">
                    Seventoop
                </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-brand-400 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al sitio
                </Link>
                <span className="text-slate-700">·</span>
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-brand-400 transition-colors"
                >
                    Volver al login
                </Link>
            </div>

            <div className="space-y-2 mb-8">
                <h2 className="text-2xl font-bold text-white">
                    {formData.role === "INVERSOR" ? "Crear cuenta de Inversor" :
                        formData.role === "DESARROLLADOR" ? "Registro para Desarrolladores" :
                            formData.role === "CLIENTE" ? "Acceso para Clientes" :
                                "Registro para Vendedores"}
                </h2>
                <p className="text-slate-400">
                    {formData.role === "INVERSOR" ? "Únete a la comunidad de inversores inmobiliarios" :
                        formData.role === "DESARROLLADOR" ? "Comienza a publicar y gestionar tus desarrollos" :
                            formData.role === "CLIENTE" ? "Accede al estado de tus unidades y pagos" :
                                "Gestiona tus ventas y oportunidades inmobiliarias"}
                </p>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-4 gap-2 mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "INVERSOR" })}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-bold transition-all border border-transparent",
                        formData.role === "INVERSOR"
                            ? "bg-brand-500 text-white shadow-lg border-brand-400"
                            : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <TrendingUp className="w-4 h-4" />
                    INVERSOR
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "CLIENTE" })}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-bold transition-all border border-transparent",
                        formData.role === "CLIENTE"
                            ? "bg-brand-500 text-white shadow-lg border-brand-400"
                            : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <User className="w-4 h-4" />
                    CLIENTE
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "DESARROLLADOR" })}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-bold transition-all border border-transparent",
                        formData.role === "DESARROLLADOR"
                            ? "bg-brand-500 text-white shadow-lg border-brand-400"
                            : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Building2 className="w-4 h-4" />
                    DESARR.
                </button>
                <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "VENDEDOR" })}
                    className={cn(
                        "flex flex-col items-center justify-center gap-1 py-3 rounded-xl text-[10px] font-bold transition-all border border-transparent",
                        formData.role === "VENDEDOR"
                            ? "bg-brand-500 text-white shadow-lg border-brand-400"
                            : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Briefcase className="w-4 h-4" />
                    VENDEDOR
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Nombre */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        {formData.role === "VENDEDOR" ? "Nombre de la Empresa o Desarrollador" : "Nombre completo"}
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder={formData.role === "VENDEDOR" ? "Constructora S.A." : "Juan Pérez"}
                            required
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email corporativo o personal</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="contacto@empresa.com"
                            required
                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                            ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                        Confirmar contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            required
                            className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                            ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Terms and Conditions */}
                <label className="flex items-start gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-white/10 bg-white/5 text-brand-500 focus:ring-brand-500/40"
                    />
                    <span className="text-xs text-slate-400">
                        Acepto los{" "}
                        <a href="/terminos" target="_blank" className="text-brand-400 hover:text-brand-300 underline">
                            Términos y Condiciones
                        </a>
                        {" "}y la{" "}
                        <a href="/privacidad" target="_blank" className="text-brand-400 hover:text-brand-300 underline">
                            Política de Privacidad
                        </a>
                    </span>
                </label>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creando cuenta...
                        </>
                    ) : (
                        `Registrarse como ${roleLabels[formData.role] || "Usuario"}`
                    )}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                    Inicia sesión
                </Link>
            </p>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}>
            <RegisterForm />
        </Suspense>
    );
}
