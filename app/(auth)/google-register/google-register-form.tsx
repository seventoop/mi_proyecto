"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Briefcase, Building2, Loader2, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

type RoleOption = {
    value: string;
    label: string;
    description: string;
    icon: "client" | "investor" | "seller" | "developer";
};

const iconMap = {
    client: User,
    investor: Shield,
    seller: Briefcase,
    developer: Building2,
} as const;

export default function GoogleRegisterForm({
    token,
    email,
    name,
    options,
}: {
    token: string;
    email: string;
    name: string;
    options: RoleOption[];
}) {
    const [selectedRole, setSelectedRole] = useState<string>(options[0]?.value ?? "CLIENTE");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setError("");
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/google-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, role: selectedRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "No se pudo completar el registro");
            }

            await signIn("google", { callbackUrl: "/dashboard" });
        } catch (err) {
            const message = err instanceof Error ? err.message : "No se pudo completar el registro";
            setError(message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Elegi tu tipo de cuenta inicial</h2>
                <p className="text-slate-400">
                    {name || "Tu cuenta"} se autentico con <span className="text-white">{email}</span>. Antes de entrar,
                    elegi con que tipo de cuenta queres comenzar. Cuando confirmes, vamos a crear tu cuenta con ese rol inicial.
                </p>
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                <p className="font-semibold">Como sigue el acceso</p>
                <p className="mt-1 text-sky-100/80">
                    Despues de confirmar, Google puede volver a abrirse un instante para terminar el ingreso y llevarte a tu dashboard.
                </p>
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                {options.map((option) => {
                    const Icon = iconMap[option.icon];
                    const isActive = selectedRole === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setSelectedRole(option.value)}
                            className={cn(
                                "w-full text-left rounded-2xl border p-4 transition-all",
                                isActive
                                    ? "border-brand-400 bg-brand-500/10 shadow-lg shadow-brand-500/10"
                                    : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={cn(
                                        "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl",
                                        isActive ? "bg-brand-500 text-white" : "bg-white/10 text-slate-300"
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-bold uppercase tracking-wider text-white">
                                        {option.label}
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        {option.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Roles no autoasignables</p>
                <p className="mt-1 text-amber-100/80">
                    ADMIN y SUPERADMIN no pueden elegirse desde este onboarding publico. Esos accesos se gestionan por separado.
                </p>
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creando cuenta inicial...
                    </>
                ) : (
                    <>
                        Confirmar tipo de cuenta
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>
    );
}
