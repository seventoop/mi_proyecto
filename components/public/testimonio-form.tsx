"use client";

import { useState } from "react";
import { Star, User, Briefcase, Send, CheckCircle, UploadCloud, X } from "lucide-react";
import { createTestimonio } from "@/lib/actions/testimonios";
import { cn } from "@/lib/utils";

export default function TestimonioForm() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [form, setForm] = useState({
        autorNombre: "",
        autorTipo: "USUARIO", // USUARIO, EMPRESA
        autorContacto: "", // Opcional: Email o LinkedIn
        texto: "",
        rating: 5,
        mediaUrl: "", // Opcional: Foto de perfil
    });

    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let mediaUrl = "";
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (data.success) mediaUrl = data.url;
            }

            const res = await createTestimonio({
                ...form,
                mediaUrl
            });

            if (res.success) {
                setSent(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="bg-brand-orange/10 p-8 rounded-3xl border border-brand-orange/20 text-center animate-fade-in">
                <div className="w-16 h-16 bg-brand-orange text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-orange/20">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">¡Gracias por tu opinión!</h3>
                <p className="text-slate-600 dark:text-slate-300">
                    Tu testimonio ha sido enviado y será revisado por nuestro equipo antes de ser publicado.
                </p>
                <button onClick={() => setSent(false)} className="mt-6 text-sm font-bold text-brand-orange hover:text-brand-orangeDark hover:underline transition-colors">
                    Enviar otro testimonio
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-orange via-brand-yellow to-brand-orangeDark" />

            <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Déjanos tu opinión</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Tu experiencia nos ayuda a mejorar.</p>
            </div>

            <div className="space-y-5">
                {/* Rating */}
                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            type="button"
                            key={star}
                            onClick={() => setForm({ ...form, rating: star })}
                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                        >
                            <Star className={cn("w-8 h-8", star <= form.rating ? "fill-brand-yellow text-brand-yellow" : "text-slate-200 dark:text-slate-700")} />
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                            required
                            placeholder="Tu Nombre"
                            value={form.autorNombre}
                            onChange={(e) => setForm({ ...form, autorNombre: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange/50 transition-all dark:text-white"
                        />
                    </div>
                    <div className="relative">
                        <Briefcase className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <select
                            value={form.autorTipo}
                            onChange={(e) => setForm({ ...form, autorTipo: e.target.value })}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange/50 transition-all dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="USUARIO">Soy Inversor / Comprador</option>
                            <option value="EMPRESA">Soy Empresa / Partner</option>
                        </select>
                    </div>
                </div>

                <textarea
                    required
                    rows={4}
                    placeholder="Escribe aquí tu experiencia con nosotros..."
                    value={form.texto}
                    onChange={(e) => setForm({ ...form, texto: e.target.value })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange/50 transition-all dark:text-white resize-none"
                />

                {/* File Upload (Optional Avatar/Logo) */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        {file ? (
                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-slate-400" />
                        )}
                    </div>
                    <label className="flex-1 cursor-pointer group">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 transition-colors">
                            <UploadCloud className="w-4 h-4" />
                            {file ? "Cambiar foto" : "Subir foto de perfil (Opcional)"}
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                    {file && (
                        <button type="button" onClick={() => setFile(null)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-brand-orange hover:bg-brand-orangeDark text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg shadow-brand-orange/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                    {loading ? "Enviando..." : (
                        <>
                            Enviar Testimonio <Send className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
