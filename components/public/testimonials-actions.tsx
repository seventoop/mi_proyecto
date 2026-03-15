"use client";

import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/providers/language-provider";

const TestimonioForm = dynamic(() => import("./testimonio-form"), {
    ssr: false,
    loading: () => <div className="p-12 text-center animate-pulse">Cargando formulario...</div>,
});

export default function TestimonialsActions() {
    const { dictionary: t } = useLanguage();
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-orange text-white rounded-xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-orange/25"
            >
                <MessageSquarePlus className="w-5 h-5" />
                {t.testimonials.actions.shareExperience}
            </button>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <TestimonioForm />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
