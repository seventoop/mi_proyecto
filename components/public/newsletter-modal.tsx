"use client";

import { useState } from "react";
import { X, Mail, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NewsletterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewsletterModal({ isOpen, onClose }: NewsletterModalProps) {
    const [email, setEmail] = useState("");
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !acceptTerms) return;

        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsLoading(false);
        setIsSubmitted(true);

        // Reset after 3 seconds
        setTimeout(() => {
            setIsSubmitted(false);
            setEmail("");
            setAcceptTerms(false);
            onClose();
        }, 3000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black rounded-3xl shadow-2xl max-w-lg w-full p-8 relative overflow-hidden ring-1 ring-white/10 cursor-default"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground/60 hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    {/* Header */}
                                    <div className="text-center mb-8">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-orange/20">
                                            <Mail className="w-8 h-8 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-black text-foreground mb-2">
                                            Suscríbete a nuestro Newsletter
                                        </h2>
                                        <p className="text-foreground/60">
                                            Recibe las últimas novedades, proyectos exclusivos y tendencias del urbanismo digital.
                                        </p>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Email Input */}
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-bold text-foreground mb-2">
                                                Correo Electrónico
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="tu@email.com"
                                                required
                                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                                            />
                                        </div>

                                        {/* Terms Checkbox */}
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                id="terms"
                                                checked={acceptTerms}
                                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                                required
                                                className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-brand-orange focus:ring-brand-orange focus:ring-offset-0 cursor-pointer"
                                            />
                                            <label htmlFor="terms" className="text-sm text-foreground/70 leading-relaxed">
                                                Acepto recibir comunicaciones de Seventoop y he leído los{" "}
                                                <a href="/terminos" className="text-brand-orange hover:text-brand-orangeDark hover:underline font-semibold transition-colors">
                                                    Términos y Condiciones
                                                </a>{" "}
                                                y la{" "}
                                                <a href="/privacidad" className="text-brand-orange hover:text-brand-orangeDark hover:underline font-semibold transition-colors">
                                                    Política de Privacidad
                                                </a>
                                                .
                                            </label>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={!email || !acceptTerms || isLoading}
                                            className="w-full px-8 py-4 bg-brand-orange hover:bg-brand-orangeDark disabled:bg-slate-800 text-white rounded-2xl font-black shadow-lg shadow-brand-orange/20 hover:shadow-brand-orangeDark/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Suscribiendo...
                                                </>
                                            ) : (
                                                <>
                                                    <Mail className="w-5 h-5" />
                                                    Suscribirme
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Footer Note */}
                                    <p className="text-xs text-center text-foreground/40 mt-6">
                                        Puedes cancelar tu suscripción en cualquier momento.
                                    </p>
                                </>
                            ) : (
                                // Success State
                                <div className="text-center py-8">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", duration: 0.5 }}
                                        className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-orange/20"
                                    >
                                        <CheckCircle className="w-10 h-10 text-white" />
                                    </motion.div>
                                    <h3 className="text-2xl font-black text-foreground mb-2">
                                        ¡Bienvenido a la comunidad!
                                    </h3>
                                    <p className="text-foreground/60">
                                        Hemos enviado un correo de confirmación a <strong>{email}</strong>
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
