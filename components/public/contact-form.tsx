"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearConsultaContacto } from "@/lib/actions/leads";

const formSchema = z.object({
    nombre: z.string().min(2, "Ingresa tu nombre completo"),
    email: z.string().email("Ingresa un email válido"),
    telefono: z.string().min(6, "Ingresa un teléfono válido"),
    mensaje: z.string().optional(),
});

interface ContactFormProps {
    proyectoId?: string;
    compact?: boolean;
    className?: string;
    origen?: string;
}

export default function ContactForm({ proyectoId, compact, className, origen }: ContactFormProps) {
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
            const res = await crearConsultaContacto({
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                mensaje: data.mensaje || "",
                proyectoId,
                origen: origen || (proyectoId ? "WEB_PROYECTO" : "WEB_CONTACTO"),
            });

            if (res.success) {
                setIsSuccess(true);
            } else {
                setError(res.error || "Ocurrió un error al enviar");
            }
        } catch {
            setError("Error de conexión. Intenta nuevamente.");
        }
    };

    if (isSuccess) {
        return (
            <div className={cn("text-center py-10 bg-brand-orange/10 rounded-2xl border border-brand-orange/20 shadow-sm", className)}>
                <div className="w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-orange/20">
                    <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">¡Mensaje enviado!</h3>
                <p className="text-base text-muted-foreground max-w-xs mx-auto mb-6 leading-7">
                    Un asesor se pondrá en contacto contigo a la brevedad.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="text-base font-semibold text-brand-orange hover:text-brand-orangeDark hover:underline"
                >
                    Enviar otro mensaje
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[15px] font-semibold text-foreground">Nombre completo</label>
                    <input
                        {...register("nombre")}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                    />
                    {errors.nombre && <p className="text-sm text-rose-500">{errors.nombre.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[15px] font-semibold text-foreground">Teléfono</label>
                    <input
                        {...register("telefono")}
                        placeholder="+54 9 11..."
                        className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                    />
                    {errors.telefono && <p className="text-sm text-rose-500">{errors.telefono.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[15px] font-semibold text-foreground">Email</label>
                <input
                    {...register("email")}
                    type="email"
                    placeholder="juan@ejemplo.com"
                    className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                />
                {errors.email && <p className="text-sm text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-[15px] font-semibold text-foreground">Mensaje (opcional)</label>
                <textarea
                    {...register("mensaje")}
                    rows={compact ? 2 : 4}
                    placeholder="Estoy interesado en este proyecto..."
                    className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all resize-none shadow-sm"
                />
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-base">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl gradient-brand text-white text-base font-bold shadow-glow hover:shadow-glow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
                {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        Enviar consulta <Send className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
