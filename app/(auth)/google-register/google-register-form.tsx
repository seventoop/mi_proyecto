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
        <div className="animate-fade-in space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-bold text-white">Elegí cómo querés usar tu cuenta</h2>
                <p className="text-sm text-slate-400">
                    {name || "Tu cuenta"} ingresó con <span className="text-white">{email}</span>.
                    Seleccioná el tipo de cuenta para continuar.
                </p>
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-2">
                {options.map((option) => {
                    const Icon = iconMap[option.icon];
                    const isActive = selectedRole === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setSelectedRole(option.value)}
                            className={cn(
                                "w-full text-left rounded-xl border p-3 transition-all",
                                isActive
                                    ? "border-brand-400 bg-brand-500/10 shadow-lg shadow-brand-500/10"
                                    : "border-white/10 bg-white/5 hover:bg-white/[0.07]"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={cn(
                                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                        isActive ? "bg-brand-500 text-white" : "bg-white/10 text-slate-300"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                    <div className="text-sm font-bold uppercase tracking-wider text-white">
                                        {option.label}
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        {option.description}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
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
