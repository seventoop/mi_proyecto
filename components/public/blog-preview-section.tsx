"use client";

import { motion } from "framer-motion";
import { BookOpen, Calendar, ArrowRight, Tag, Star } from "lucide-react";
import Link from "next/link";

const posts = [
    {
        title: "Tendencias del Urbanismo en 2026: Sostenibilidad y Tecnología",
        excerpt: "Cómo la integración de datos geoespaciales está cambiando el diseño de las nuevas ciudades...",
        date: "12 Feb 2026",
        category: "Tecnología",
        image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80",
    },
    {
        title: "Invertir en Tierras: Por qué el 2026 es el Año de las Urbanizaciones",
        excerpt: "Analizamos el mercado inmobiliario y las oportunidades de crecimiento en las zonas periféricas...",
        date: "10 Feb 2026",
        category: "Inversión",
        image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
    },
    {
        title: "Paseos Virtuales 360°: El Nuevo Estándar de Ventas",
        excerpt: "Descubre cómo las inmobiliarias están cerrando ventas internacionales sin que el cliente viaje...",
        date: "08 Feb 2026",
        category: "Marketing",
        image: "https://images.unsplash.com/photo-1592591544537-1286be604246?auto=format&fit=crop&w=800&q=80",
    },
];

export default function BlogPreviewSection() {
    return (
        <section id="blog" className="py-24 relative overflow-hidden bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-xs font-bold uppercase tracking-wider">
                            <Star className="w-4 h-4 text-brand-orange" />
                            <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent">
                                Nuestro Blog
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                            Perspectivas e Inteligencia del Sector
                        </h2>
                        <p className="text-foreground/60 leading-relaxed text-lg">
                            Explora las últimas noticias sobre urbanismo, tecnología aplicada y el mercado inmobiliario global.
                        </p>
                    </div>
                    <Link
                        href="/blog"
                        className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all group shrink-0 shadow-lg shadow-brand-orange/25"
                    >
                        Ver todos
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {posts.map((post, idx) => (
                        <motion.article
                            key={post.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="group flex flex-col bg-white dark:bg-black rounded-[2rem] overflow-hidden border border-slate-200 dark:border-white/5 shadow-lg hover:shadow-2xl hover:shadow-brand-500/10 hover:border-brand-500/50 dark:hover:border-brand-500/30 transition-all"
                        >
                            <div className="relative h-56 overflow-hidden">
                                <img
                                    src={post.image}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md bg-brand-orange/90 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                                    <Tag className="w-3 h-3" />
                                    {post.category}
                                </div>
                            </div>

                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex items-center gap-2 text-xs text-foreground/40 mb-3">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {post.date}
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-brand-orange transition-colors leading-tight line-clamp-2">
                                    <Link href="/blog/slug">{post.title}</Link>
                                </h3>
                                <p className="text-foreground/60 text-sm leading-relaxed mb-6 line-clamp-3">
                                    {post.excerpt}
                                </p>
                                <Link
                                    href="/blog/slug"
                                    className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-brand-orange hover:gap-3 transition-all"
                                >
                                    Leer más
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}
