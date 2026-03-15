"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle, Mail, MessageSquare, Briefcase } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { crearConsultaContacto } from "@/lib/actions/leads";

const formSchema = z.object({
    nombre: z.string().min(2, "Ingresá tu nombre"),
    email: z.string().email("Ingresá un email válido"),
    telefono: z.string().min(8, "Ingresá un teléfono válido"),
    asunto: z.string().min(2, "Seleccioná un asunto"),
    mensaje: z.string().min(10, "El mensaje debe ser más descriptivo"),
});

type FormValues = z.infer<typeof formSchema>;

function ContactoFormContent() {
    const searchParams = useSearchParams();
    const defaultAsunto = searchParams.get("asunto") || "consulta_general";

    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            asunto: defaultAsunto !== "consulta_general" ? defaultAsunto : "",
        },
    });

    const onSubmit = async (data: FormValues) => {
        setError(null);
        try {
            const res = await crearConsultaContacto({
                ...data,
                origen: "landing_contacto"
            });

            if (res.success) {
                setIsSuccess(true);
                reset();
            } else {
                setError(res.error || "Ocurrió un error al enviar tu consulta.");
            }
        } catch (e) {
            setError("Error de conexión. Intenta nuevamente.");
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-16 bg-card rounded-[2rem] border border-border shadow-xl">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black text-brand-gray dark:text-white mb-4">¡Mensaje Recibido!</h3>
                <p className="text-brand-muted dark:text-white/70 max-w-sm mx-auto mb-8">
                    Nuestro equipo revisará tu consulta y se pondrá en contacto pronto.
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="px-8 py-3 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-brand-gray dark:text-white font-bold hover:border-brand-orange transition-colors"
                >
                    Enviar otro mensaje
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-card p-8 md:p-10 rounded-[2rem] border border-border shadow-xl space-y-6 relative overflow-hidden">
            <h3 className="text-2xl font-black text-foreground mb-2 z-10 relative">Dejanos tu mensaje</h3>
            <p className="text-muted-foreground mb-8 z-10 relative">Establezcamos una línea directa de comunicación.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 z-10 relative">
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">Nombre / Empresa</label>
                    <input
                        {...register("nombre")}
                        placeholder="Ej: Juan Pérez / Empresa S.A."
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all"
                    />
                    {errors.nombre && <p className="text-xs text-rose-500 font-semibold">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">Teléfono</label>
                    <input
                        {...register("telefono")}
                        placeholder="+54 9 11..."
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all"
                    />
                    {errors.telefono && <p className="text-xs text-rose-500 font-semibold">{errors.telefono.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 z-10 relative">
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">Correo Electrónico</label>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder="tu@email.com"
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all"
                    />
                    {errors.email && <p className="text-xs text-rose-500 font-semibold">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">Motivo de Contacto</label>
                    <select
                        {...register("asunto")}
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all appearance-none cursor-pointer"
                    >
                        <option value="" disabled>Seleccioná un motivo...</option>
                        <option value="consulta_general">Consulta General</option>
                        <option value="publicar">Publicar un Desarrollo</option>
                        <option value="alianza_b2b">Alianza / B2B</option>
                        <option value="membresia_vip">Suscripción VIP</option>
                        <option value="soporte">Soporte Técnico</option>
                    </select>
                    {errors.asunto && <p className="text-xs text-rose-500 font-semibold">{errors.asunto.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5 z-10 relative">
                <label className="text-sm font-bold text-foreground/80">Mensaje</label>
                <textarea
                    {...register("mensaje")}
                    rows={4}
                    placeholder="Contanos más sobre tu necesidad o proyecto..."
                    className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all resize-none"
                />
                {errors.mensaje && <p className="text-xs text-rose-500 font-semibold">{errors.mensaje.message}</p>}
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold z-10 relative">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand-orange hover:bg-brand-orangeDark text-white font-black text-lg transition-all shadow-xl hover:scale-[1.02] disabled:opacity-50 z-10 relative"
            >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Enviar Mensaje</>}
            </button>
        </form>
    );
}

export default function ContactoLanding() {
    return (
        <section id="contacto" className="pt-32 pb-24 bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-16">

                {/* Info Text */}
                <div className="lg:col-span-2 flex flex-col justify-center">
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-4 block">
                        Hablemos
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-6">
                        Contacto Directo
                    </h2>
                    <p className="text-lg text-muted-foreground mb-10 max-w-md">
                        SevenToop es el ecosistema ideal para impulsar ventas o encontrar grandes oportunidades. Estamos aquí para facilitarlo.
                    </p>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                                <MessageSquare className="w-6 h-6 text-brand-orange" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Consultas Generales</h4>
                                <p className="text-sm text-muted-foreground">Resolvemos tus dudas operativas.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                                <Briefcase className="w-6 h-6 text-brand-orange" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Alianzas y B2B</h4>
                                <p className="text-sm text-muted-foreground">Integración de grandes carteras, partners y desarrolladores.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                                <Mail className="w-6 h-6 text-brand-orange" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">Email Directo</h4>
                                <p className="text-sm text-muted-foreground">hola@seventoop.com</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="lg:col-span-3">
                    <Suspense fallback={<div className="h-[600px] w-full animate-pulse bg-white/5 rounded-[2rem]" />}>
                        <ContactoFormContent />
                    </Suspense>
                </div>
            </div>
        </section>
    );
}
