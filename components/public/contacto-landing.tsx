"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle, Mail, MessageSquare, Briefcase } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { crearConsultaContacto } from "@/lib/actions/leads";
import { useLanguage } from "@/components/providers/language-provider";

type FormValues = {
    nombre: string;
    email: string;
    telefono: string;
    asunto: string;
    mensaje: string;
};

function ContactoFormContent() {
    const { dictionary: t } = useLanguage();
    const copy = t.publicContact;
    const searchParams = useSearchParams();
    const defaultAsunto = searchParams.get("asunto") || "consulta_general";

    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formSchema = z.object({
        nombre: z.string().min(2, copy.validation.name),
        email: z.string().email(copy.validation.email),
        telefono: z.string().min(8, copy.validation.phone),
        asunto: z.string().min(2, copy.validation.subject),
        mensaje: z.string().min(10, copy.validation.message),
    });

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
                setError(res.error || copy.errors.submit);
            }
        } catch (e) {
            setError(copy.errors.connection);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center py-16 bg-card rounded-[2rem] border border-border shadow-xl">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black text-brand-gray dark:text-white mb-4">{copy.successTitle}</h3>
                <p className="text-brand-muted dark:text-white/70 max-w-sm mx-auto mb-8">
                    {copy.successDescription}
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="px-8 py-3 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-brand-gray dark:text-white font-bold hover:border-brand-orange transition-colors"
                >
                    {copy.sendAnother}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-card p-8 md:p-10 rounded-[2rem] border border-border shadow-xl space-y-6 relative overflow-hidden">
            <h3 className="text-2xl font-black text-foreground mb-2 z-10 relative">{copy.formTitle}</h3>
            <p className="text-muted-foreground mb-8 z-10 relative">{copy.formDescription}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 z-10 relative">
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">{copy.labels.name}</label>
                    <input
                        {...register("nombre")}
                        placeholder={copy.placeholders.name}
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all"
                    />
                    {errors.nombre && <p className="text-xs text-rose-500 font-semibold">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">{copy.labels.phone}</label>
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
                    <label className="text-sm font-bold text-foreground/80">{copy.labels.email}</label>
                    <input
                        {...register("email")}
                        type="email"
                        placeholder={copy.placeholders.email}
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all"
                    />
                    {errors.email && <p className="text-xs text-rose-500 font-semibold">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground/80">{copy.labels.subject}</label>
                    <select
                        {...register("asunto")}
                        className="w-full px-5 py-3.5 rounded-xl bg-background border border-border text-foreground outline-none focus:border-brand-orange transition-all appearance-none cursor-pointer"
                    >
                        <option value="" disabled>{copy.placeholders.subject}</option>
                        <option value="consulta_general">{copy.subjects.general}</option>
                        <option value="publicar">{copy.subjects.publish}</option>
                        <option value="alianza_b2b">{copy.subjects.alliance}</option>
                        <option value="membresia_vip">{copy.subjects.vip}</option>
                        <option value="soporte">{copy.subjects.support}</option>
                    </select>
                    {errors.asunto && <p className="text-xs text-rose-500 font-semibold">{errors.asunto.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5 z-10 relative">
                <label className="text-sm font-bold text-foreground/80">{copy.labels.message}</label>
                <textarea
                    {...register("mensaje")}
                    rows={4}
                    placeholder={copy.placeholders.message}
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
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> {copy.submit}</>}
            </button>
        </form>
    );
}

export default function ContactoLanding() {
    const { dictionary: t } = useLanguage();
    const copy = t.publicContact;

    return (
        <section id="contacto" className="pt-32 pb-24 bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-16">

                {/* Info Text */}
                <div className="lg:col-span-2 flex flex-col justify-center">
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-4 block">
                        {copy.eyebrow}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight mb-6">
                        {copy.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-10 max-w-md">
                        {copy.description}
                    </p>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                                <MessageSquare className="w-6 h-6 text-brand-orange" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">{copy.info.generalTitle}</h4>
                                <p className="text-sm text-muted-foreground">{copy.info.generalDescription}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                                <Briefcase className="w-6 h-6 text-brand-orange" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">{copy.info.alliancesTitle}</h4>
                                <p className="text-sm text-muted-foreground">{copy.info.alliancesDescription}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                                <Mail className="w-6 h-6 text-brand-orange" />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">{copy.info.emailTitle}</h4>
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
