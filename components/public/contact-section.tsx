import { Mail, Phone } from "lucide-react";
import ContactForm from "@/components/public/contact-form";
import ContactActions from "./contact-actions";
import ScrollAnimationWrapper from "./scroll-animation-wrapper";

const contactInfo = [
    { icon: Mail, label: "Email", value: "contacto@seventoop.com", sub: "Respuesta en 24hs" },
    { icon: Phone, label: "Teléfono", value: "+54 9 11 1234-5678", sub: "Lun a Vie, 9hs a 18hs" },
];

export default function ContactSection() {
    return (
        <section id="contacto" className="py-20 px-6 bg-slate-50/80 dark:bg-white/[0.02] relative overflow-hidden border-t border-slate-200/60 dark:border-white/5">
            {/* Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-orange/5 rounded-full blur-[200px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    {/* Left: Info */}
                    <ScrollAnimationWrapper direction="right" className="space-y-8">
                        <div className="space-y-4">
                            <span className="text-brand-orange font-black tracking-widest text-xs uppercase">
                                Contacto
                            </span>
                            <h2 className="text-4xl md:text-5xl font-black text-foreground leading-[1.1] tracking-tight">
                                Estamos para{" "}
                                <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                                    ayudarte
                                </span>
                            </h2>
                            <p className="text-foreground/60 text-lg max-w-md leading-relaxed">
                                Completá el formulario y un asesor se comunicará con vos a la brevedad.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {contactInfo.map((item, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center group-hover:bg-brand-orange group-hover:shadow-lg group-hover:shadow-brand-orange/20 transition-all">
                                        <item.icon className="w-5 h-5 text-brand-orange group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-0.5">{item.label}</p>
                                        <p className="text-base font-bold text-foreground">{item.value}</p>
                                        <p className="text-xs text-foreground/40">{item.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <ContactActions />
                    </ScrollAnimationWrapper>

                    {/* Right: Form */}
                    <ScrollAnimationWrapper direction="left" className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-orange/10 to-brand-yellow/10 blur-[80px] rounded-full z-0" />
                        <div className="bg-white dark:bg-[#111116]/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl relative z-10">
                            <h3 className="text-xl font-bold text-foreground mb-6">Envianos un mensaje</h3>
                            <ContactForm />
                        </div>
                    </ScrollAnimationWrapper>
                </div>
            </div>
        </section>
    );
}
