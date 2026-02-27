"use client";

import { useState } from "react";
import { Users, Send, CheckCircle2, Loader2, Sparkles, Crown, Megaphone, Eye, Clock, MessageCircle } from "lucide-react";
import { joinOpenCommunity } from "@/lib/actions/ai";
import { toast } from "sonner";

const openBenefits = [
    { icon: Megaphone, text: "Publicaciones directas de desarrolladores verificados" },
    { icon: Clock, text: "Acceso anticipado a lanzamientos inmobiliarios" },
    { icon: Eye, text: "Novedades sincronizadas con el banner dinámico de la landing" },
];

const vipBenefits = [
    { icon: Crown, text: "Membresía paga con cupos limitados por ciclo de lanzamiento" },
    { icon: Clock, text: "Acceso anticipado: recibís la información antes que la comunidad abierta" },
    { icon: MessageCircle, text: "Canal directo con el desarrollador del proyecto" },
    { icon: Sparkles, text: "Información prioritaria: planos, disponibilidad y condiciones desde el día uno" },
];

export default function CommunityCTA() {
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [formData, setFormData] = useState({ nombre: "", telefono: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await joinOpenCommunity(formData);
            if (res.success) {
                setJoined(true);
                toast.success("¡Bienvenido a la comunidad!");
            } else {
                toast.error(res.error || "Error al unirse");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    if (joined) {
        return (
            <section className="py-20 px-6 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/5">
                <div className="max-w-3xl mx-auto bg-brand-orange/10 border border-brand-orange/20 rounded-3xl p-12 text-center animate-in zoom-in duration-500">
                    <CheckCircle2 className="w-16 h-16 text-brand-orange mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-foreground mb-2">¡Ya sos parte de la Comunidad!</h3>
                    <p className="text-foreground/60">Revisá tu WhatsApp, te enviamos un mensaje de bienvenida.</p>
                </div>
            </section>
        );
    }

    return (
        <section id="comunidad" className="py-20 px-6 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/5">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Users className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Comunidad SevenToop
                        </span>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-foreground leading-[1.1] tracking-tight">
                        Tu canal directo con los{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            próximos lanzamientos
                        </span>
                    </h2>

                    <p className="text-lg text-foreground/60 leading-relaxed">
                        Un ecosistema donde los desarrolladores publican directamente y la audiencia accede antes que nadie.
                        Lo que se muestra en el banner de la landing, se comparte en la comunidad. Exposición coordinada, acceso real.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Open Community */}
                    <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Gratis</span>
                            </div>
                            <h3 className="text-2xl font-black text-foreground mb-2">Comunidad Abierta</h3>
                            <p className="text-sm text-foreground/60 mb-6">
                                Grupo de WhatsApp gratuito para quienes buscan estar al tanto de los desarrollos que se lanzan en la plataforma.
                            </p>
                            <ul className="space-y-4">
                                {openBenefits.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <item.icon className="w-4 h-4 text-brand-orange" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground/70">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* VIP Group */}
                    <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-brand-orange/20 p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-orange/10 rounded-full blur-3xl -mr-20 -mt-20" />
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 mb-4">
                                <Crown className="w-3.5 h-3.5 text-brand-orange" />
                                <span className="text-xs font-bold text-brand-orange uppercase tracking-widest">VIP</span>
                            </div>
                            <h3 className="text-2xl font-black text-foreground mb-2">Grupo VIP</h3>
                            <p className="text-sm text-foreground/60 mb-6">
                                Membresía paga con cupos limitados. Información prioritaria, acceso anticipado a cada lanzamiento y canal directo con el desarrollador.
                            </p>
                            <ul className="space-y-4">
                                {vipBenefits.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <item.icon className="w-4 h-4 text-brand-orange" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground/70">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Join Form */}
                <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/10 p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16" />

                    <div className="relative z-10 text-center mb-8">
                        <h3 className="text-xl font-black text-foreground mb-2">Sumate a la comunidad abierta</h3>
                        <p className="text-sm text-foreground/60">Gratis. Sin compromiso. Solo contenido relevante.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground/70 ml-1">Tu Nombre</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Nombre..."
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground/70 ml-1">WhatsApp</label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="+54 9 11 ..."
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-brand-orange text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-orange/20 hover:bg-brand-orangeDark hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    Unirme Gratis
                                    <Send className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
                            Al unirte aceptás recibir notificaciones vía WhatsApp. Podés salir en cualquier momento.
                            <br />
                            SevenToop no intermedia operaciones inmobiliarias. La información compartida en la comunidad
                            es de carácter informativo y no constituye asesoramiento financiero ni garantía de ningún tipo.
                        </p>
                    </form>
                </div>
            </div>
        </section>
    );
}
