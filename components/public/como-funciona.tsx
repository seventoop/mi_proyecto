"use client";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";

export default function ComoFunciona() {
    const { dictionary: t } = useLanguage();

    const PASOS = [
        { num: "01", title: t.howItWorks.steps["01"].title, desc: t.howItWorks.steps["01"].desc },
        { num: "02", title: t.howItWorks.steps["02"].title, desc: t.howItWorks.steps["02"].desc },
        { num: "03", title: t.howItWorks.steps["03"].title, desc: t.howItWorks.steps["03"].desc },
        { num: "04", title: t.howItWorks.steps["04"].title, desc: t.howItWorks.steps["04"].desc },
        { num: "05", title: t.howItWorks.steps["05"].title, desc: t.howItWorks.steps["05"].desc },
        { num: "06", title: t.howItWorks.steps["06"].title, desc: t.howItWorks.steps["06"].desc },
        { num: "07", title: t.howItWorks.steps["07"].title, desc: t.howItWorks.steps["07"].desc },
        { num: "08", title: t.howItWorks.steps["08"].title, desc: t.howItWorks.steps["08"].desc },
    ];

    return (
        <section id="como-funciona" className="py-24 bg-background overflow-hidden relative border-t border-border/40">
            {/* Soft ambient background */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 md:mb-24">
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-sm mb-4 block">
                        {t.howItWorks.badge}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                        {t.howItWorks.title}
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mt-6">
                        {t.howItWorks.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PASOS.map((paso, idx) => (
                        <motion.div
                            key={paso.num}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                            className="bg-card/50 dark:bg-white/5 border border-border/60 dark:border-white/10 rounded-2xl p-6 group hover:border-brand-orange/40 hover:bg-card dark:hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-brand-orange/5 flex flex-col h-full"
                        >
                            {/* Step Indicator */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-background border border-brand-orange/30 rounded-full flex items-center justify-center shadow-sm z-10 relative group-hover:border-brand-orange transition-colors">
                                    <span className="text-sm font-black text-brand-orange">{paso.num}</span>
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-brand-orange/20 to-transparent" />
                            </div>

                            {/* Step Content */}
                            <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-brand-orange transition-colors line-clamp-2">
                                {paso.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                {paso.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
