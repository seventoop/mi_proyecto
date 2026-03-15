"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle, MapPin, Building2, TrendingUp, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearLeadLanding } from "@/lib/actions/leads";
import { useLanguage } from "@/components/providers/language-provider";

const formSchema = z.object({
    nombre: z.string().min(2, "Ingresá tu nombre completo"),
    whatsapp: z.string().min(8, "Ingresá un celular válido"),
    provincia: z.string().min(2, "Ingresá tu provincia"),
    ciudad: z.string().min(2, "Ingresá tu ciudad"),
    zona: z.string().min(2, "Ingresá tu zona (ej: Norte)"),
    intencion: z.enum(["VIVIR", "INVERTIR"], {
        message: "Seleccioná tu intención"
    }),
    categoriaProyecto: z.string().min(1, "Seleccioná una categoría"),
    subtipoProyecto: z.string().min(1, "Seleccioná un subtipo"),
    presupuestoMinUsd: z.coerce.number({ message: "Debe ser un número" }).min(1, "Mínimo requerido").int(),
    presupuestoMaxUsd: z.coerce.number({ message: "Debe ser un número" }).min(1, "Máximo requerido").int(),
}).refine(data => data.presupuestoMaxUsd >= data.presupuestoMinUsd, {
    message: "El máximo debe ser mayor o igual al mínimo",
    path: ["presupuestoMaxUsd"]
});

type FormValues = z.infer<typeof formSchema>;

export default function FormularioCaptura() {
    const { dictionary: t } = useLanguage();
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            intencion: undefined as unknown as "VIVIR" | "INVERTIR",
            categoriaProyecto: "",
            subtipoProyecto: "",
            presupuestoMinUsd: 0,
            presupuestoMaxUsd: 0,
        },
    });

    const onSubmit = async (data: FormValues) => {
        setError(null);
        try {
            const res = await crearLeadLanding({
                nombre: data.nombre,
                whatsapp: data.whatsapp,
                provincia: data.provincia,
                ciudad: data.ciudad,
                zona: data.zona,
                intencion: data.intencion,
                categoriaProyecto: data.categoriaProyecto,
                subtipoProyecto: data.subtipoProyecto,
                presupuestoMinUsd: data.presupuestoMinUsd,
                presupuestoMaxUsd: data.presupuestoMaxUsd,
                origen: "formulario_landing"
            });

            if (res.success) {
                setIsSuccess(true);
            } else {
                setError(res.error || "Ocurrió un error al enviar tu solicitud.");
            }
        } catch (e) {
            setError("Error de conexión. Intenta nuevamente.");
        }
    };

    const beneficios = [
        { icon: MapPin, title: t.profile.benefits.zones.title, desc: t.profile.benefits.zones.desc },
        { icon: Building2, title: t.profile.benefits.premium.title, desc: t.profile.benefits.premium.desc },
        { icon: TrendingUp, title: t.profile.benefits.profit.title, desc: t.profile.benefits.profit.desc },
        { icon: ShieldCheck, title: t.profile.benefits.security.title, desc: t.profile.benefits.security.desc }
    ];

    const watchCategoria = watch("categoriaProyecto");

    return (
        <section id="oportunidades" className="py-24 bg-background relative overflow-hidden">
            {/* Background embellishments */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-orange/5 blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
                {/* Left side: Copy & Benefits */}
                <div className="flex flex-col justify-center">
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-4 block">
                        {t.profile.vipAccess}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground mb-6 leading-tight">
                        {t.profile.title}
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 max-w-lg">
                        {t.profile.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {beneficios.map((b, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0 border border-brand-orange/20 shadow-sm">
                                    <b.icon className="w-6 h-6 text-brand-orange" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground mb-1">{b.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right side: Form */}
                <div className="bg-card p-8 md:p-10 rounded-[2.5rem] border border-border shadow-2xl relative">
                    {/* Inner glow */}
                    <div className="absolute inset-0 rounded-[2.5rem] border border-white/40 dark:border-white/5 pointer-events-none" />

                    {isSuccess ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-3xl font-black text-brand-gray dark:text-white mb-4">{t.profile.form.successTitle}</h3>
                            <p className="text-brand-muted dark:text-white/70 max-w-sm mx-auto mb-8 text-lg">
                                {t.profile.form.successDesc}
                            </p>
                            <button
                                onClick={() => setIsSuccess(false)}
                                className="px-8 py-3 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-brand-gray dark:text-white font-bold hover:border-brand-orange transition-colors"
                            >
                                {t.profile.form.sendAnother}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-5">
                            <div className="flex flex-col gap-1 mb-4">
                                <h3 className="text-2xl font-black text-foreground">{t.profile.form.completeProfile}</h3>
                                <p className="text-xs text-muted-foreground font-medium italic">
                                    {t.profile.form.noProjectsWarning}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.fullName}</label>
                                    <input
                                        {...register("nombre")}
                                        placeholder={t.profile.form.fullNamePlaceholder}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                    />
                                    {errors.nombre && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.nombre.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.whatsapp}</label>
                                    <input
                                        {...register("whatsapp")}
                                        placeholder={t.profile.form.whatsappPlaceholder}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                    />
                                    {errors.whatsapp && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.whatsapp.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.province}</label>
                                    <input
                                        {...register("provincia")}
                                        placeholder={t.profile.form.provincePlaceholder}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                    />
                                    {errors.provincia && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.provincia.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.city}</label>
                                    <input
                                        {...register("ciudad")}
                                        placeholder={t.profile.form.cityPlaceholder}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                    />
                                    {errors.ciudad && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.ciudad.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.zone}</label>
                                    <input
                                        {...register("zona")}
                                        placeholder={t.profile.form.zonePlaceholder}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                    />
                                    {errors.zona && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.zona.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-foreground/80">{t.profile.form.liveOrInvest}</label>
                                <select
                                    {...register("intencion")}
                                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                >
                                    <option value="">{t.profile.form.selectIntention}</option>
                                    <option value="VIVIR">{t.profile.form.toLive}</option>
                                    <option value="INVERTIR">{t.profile.form.toInvest}</option>
                                </select>
                                {errors.intencion && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.intencion.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.projectCategory}</label>
                                    <select
                                        {...register("categoriaProyecto")}
                                        onChange={(e) => {
                                            setValue("categoriaProyecto", e.target.value, { shouldValidate: true });
                                            setValue("subtipoProyecto", "");
                                        }}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                    >
                                        <option value="">{t.profile.form.selectCategory}</option>
                                        <option value="LOTE_URBANIZACION">{t.profile.form.categories.lote}</option>
                                        <option value="DEPARTAMENTO">{t.profile.form.categories.depto}</option>
                                    </select>
                                    {errors.categoriaProyecto && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.categoriaProyecto.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-foreground/80">{t.profile.form.projectSubtype}</label>
                                    <select
                                        {...register("subtipoProyecto")}
                                        disabled={!watchCategoria}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium disabled:opacity-50"
                                    >
                                        <option value="">{t.profile.form.selectSubtype}</option>
                                        {watchCategoria === "LOTE_URBANIZACION" && (
                                            <>
                                                <option value="Barrio abierto">{t.profile.form.subtypes.lote.abierto}</option>
                                                <option value="Barrio privado">{t.profile.form.subtypes.lote.privado}</option>
                                                <option value="Country">{t.profile.form.subtypes.lote.country}</option>
                                                <option value="Club de campo">{t.profile.form.subtypes.lote.club}</option>
                                                <option value="Lote de quinta">{t.profile.form.subtypes.lote.quinta}</option>
                                            </>
                                        )}
                                        {watchCategoria === "DEPARTAMENTO" && (
                                            <>
                                                <option value="En pozo">{t.profile.form.subtypes.depto.pozo}</option>
                                                <option value="Condominio">{t.profile.form.subtypes.depto.condo}</option>
                                                <option value="Complejo residencial">{t.profile.form.subtypes.depto.complejo}</option>
                                                <option value="Torre / Edificio">{t.profile.form.subtypes.depto.torre}</option>
                                            </>
                                        )}
                                    </select>
                                    {errors.subtipoProyecto && <p className="text-xs text-rose-500 font-semibold mt-1">{errors.subtipoProyecto.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground/80">{t.profile.form.investmentBudget}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">USD</span>
                                        <input
                                            type="number"
                                            {...register("presupuestoMinUsd")}
                                            placeholder={t.profile.form.budgetMin}
                                            className="w-full pl-14 pr-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">USD</span>
                                        <input
                                            type="number"
                                            {...register("presupuestoMaxUsd")}
                                            placeholder={t.profile.form.budgetMax}
                                            className="w-full pl-14 pr-4 py-3 rounded-xl bg-muted/30 border border-border text-foreground focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                {(errors.presupuestoMinUsd || errors.presupuestoMaxUsd) && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">
                                        {errors.presupuestoMinUsd?.message || errors.presupuestoMaxUsd?.message}
                                    </p>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand-orange hover:bg-brand-orangeDark text-white font-black text-lg shadow-xl shadow-brand-orange/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 mt-4"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        {t.profile.form.submitButton} <Send className="w-5 h-5 ml-1" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[10px] text-muted-foreground font-medium mt-2 leading-tight">
                                {t.profile.form.privacy}
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
