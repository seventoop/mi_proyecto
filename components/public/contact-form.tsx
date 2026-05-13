"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearConsultaContacto } from "@/lib/actions/leads";
import { useLanguage } from "@/components/providers/language-provider";
import { formatCurrency, formatMessage } from "@/lib/i18n/format";

type LoteSeleccionado = {
    id: string;
    numero: string;
    estado?: string;
    precio?: number | null;
    moneda?: string | null;
    superficie?: number | null;
};

interface ContactFormProps {
    proyectoId?: string;
    compact?: boolean;
    className?: string;
    origen?: string;
}

export default function ContactForm({ proyectoId, compact, className, origen }: ContactFormProps) {
    const { locale, dictionary: t } = useLanguage();
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lote, setLote] = useState<LoteSeleccionado | null>(null);
    const formSchema = useMemo(
        () =>
            z.object({
                nombre: z.string().min(2, t.contactForm.validation.name),
                email: z.string().email(t.contactForm.validation.email),
                telefono: z.string().min(6, t.contactForm.validation.phone),
                mensaje: z.string().optional(),
            }),
        [t],
    );

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<LoteSeleccionado>).detail;
            if (!detail || !detail.numero) return;
            setLote(detail);
            setValue("mensaje", formatMessage(t.contactForm.selectedLotMessage, { lot: detail.numero }));
        };
        window.addEventListener("seventoop:select-lote", handler as EventListener);
        return () => window.removeEventListener("seventoop:select-lote", handler as EventListener);
    }, [setValue, t]);

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        setError(null);
        try {
            const lotePrefix = lote
                ? `${formatMessage(t.contactForm.lotPrefix, {
                      lot: lote.numero,
                      price: lote.precio
                          ? ` · ${formatCurrency(lote.precio, locale, lote.moneda || "USD")}`
                          : "",
                  })}\n`
                : "";
            const res = await crearConsultaContacto({
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                mensaje: lotePrefix + (data.mensaje || ""),
                proyectoId,
                origen:
                    origen ||
                    (lote
                        ? "WEB_LOTE_CONSULTA"
                        : proyectoId
                          ? "WEB_PROYECTO"
                          : "WEB_CONTACTO"),
            });

            if (res.success) {
                setIsSuccess(true);
            } else {
                setError(res.error || t.contactForm.errors.submit);
            }
        } catch {
            setError(t.contactForm.errors.connection);
        }
    };

    if (isSuccess) {
        return (
            <div className={cn("text-center py-10 bg-brand-orange/10 rounded-2xl border border-brand-orange/20 shadow-sm", className)}>
                <div className="w-16 h-16 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-orange/20">
                    <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{t.contactForm.successTitle}</h3>
                <p className="text-base text-muted-foreground max-w-xs mx-auto mb-6 leading-7">
                    {t.contactForm.successDescription}
                </p>
                <button
                    onClick={() => setIsSuccess(false)}
                    className="text-base font-semibold text-brand-orange hover:text-brand-orangeDark hover:underline"
                >
                    {t.contactForm.sendAnother}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
            {lote && (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-orange/20 text-brand-orange">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                                {t.contactForm.selectedLot}
                            </p>
                            <p className="text-sm font-bold text-foreground">
                                {lote.numero}
                                {lote.superficie ? ` · ${lote.superficie} m²` : ""}
                                {lote.precio ? ` · ${formatCurrency(lote.precio, locale, lote.moneda || "USD")}` : ""}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setLote(null)}
                        aria-label={t.contactForm.removeLot}
                        className="rounded-lg p-1 text-brand-orange hover:bg-brand-orange/10"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[15px] font-semibold text-foreground">{t.contactForm.labels.name}</label>
                    <input
                        {...register("nombre")}
                        placeholder={t.contactForm.placeholders.name}
                        className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                    />
                    {errors.nombre && <p className="text-sm text-rose-500">{errors.nombre.message}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[15px] font-semibold text-foreground">{t.contactForm.labels.phone}</label>
                    <input
                        {...register("telefono")}
                        placeholder={t.contactForm.placeholders.phone}
                        className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                    />
                    {errors.telefono && <p className="text-sm text-rose-500">{errors.telefono.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[15px] font-semibold text-foreground">{t.contactForm.labels.email}</label>
                <input
                    {...register("email")}
                    type="email"
                    placeholder={t.contactForm.placeholders.email}
                    className="w-full px-4 py-3.5 rounded-xl bg-background border border-border text-base text-foreground placeholder:text-base placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all shadow-sm"
                />
                {errors.email && <p className="text-sm text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
                <label className="text-[15px] font-semibold text-foreground">{t.contactForm.labels.message}</label>
                <textarea
                    {...register("mensaje")}
                    rows={compact ? 2 : 4}
                    placeholder={t.contactForm.placeholders.message}
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
                        {t.contactForm.submit} <Send className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
