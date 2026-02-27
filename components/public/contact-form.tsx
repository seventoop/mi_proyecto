"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
    nombre: z.string().min(2, "Ingresa tu nombre completo"),
    email: z.string().email("Ingresa un email válido"),
    telefono: z.string().min(8, "Ingresa un teléfono válido"),
    mensaje: z.string().optional(),
});

interface ContactFormProps {
    proyectoId?: string;
    compact?: boolean;
    className?: string;
}

export default function ContactForm({ proyectoId, compact, className }: ContactFormProps) {
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        setError(null);
        try {
            const res = await fetch("/api/leads/public", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    proyectoId,
                    origen: proyectoId ? "WEB_PROYECTO" : "WEB_CONTACTO",
                }),
            });

            if (res.ok) {
                setIsSuccess(true);
            } else {
                const err = await res.json();
                setError(err.error || "Ocurrió un error al enviar");
            }
        } catch (e) {
            setError("Error de conexión. Intenta nuevamente.");
        }
    };

    if (isSuccess) {
        return (
            <div className={cn("text-center py-10 bg-brand-orange/10 rounded-2xl border border-brand-orange/20", className)}>
                <div className="w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-orange/20">
                    <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">¡Mensaje Enviado!</h3>
                <p className="text-foreground/50 max-w-xs mx-auto mb-6">
                    Un asesor se pondrá en contacto contigo a la brevedad.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="text-sm font-semibold text-brand-orange hover:text-brand-orangeDark hover:underline"
                >
                    Enviar otro mensaje
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 ">
                    <label className="text-sm font-medium text-foreground/60">Nombre completo</label>
                    <input
                        {...register("nombre")}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                    />
                    {errors.nombre && <p className="text-xs text-rose-400">{errors.nombre.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground/60">Teléfono</label>
                    <input
                        {...register("telefono")}
                        placeholder="+54 9 11..."
                        className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                    />
                    {errors.telefono && <p className="text-xs text-rose-400">{errors.telefono.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground/60">Email</label>
                <input
                    {...register("email")}
                    type="email"
                    placeholder="juan@ejemplo.com"
                    className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                />
                {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground/60">Mensaje (opcional)</label>
                <textarea
                    {...register("mensaje")}
                    rows={compact ? 2 : 4}
                    placeholder="Estoy interesado en este proyecto..."
                    className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all resize-none"
                />
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl gradient-brand text-white font-bold shadow-glow hover:shadow-glow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
                {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        Enviar Consulta <Send className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
