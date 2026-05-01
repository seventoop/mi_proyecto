"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Camera, Maximize2, X } from "lucide-react";
import Image from "next/image";

interface ProyectoImagen {
    id: string;
    url: string;
    categoria: string;
    esPrincipal: boolean;
}

interface PublicProjectGalleryProps {
    imagenes: ProyectoImagen[];
}

const CATEGORY_NAMES: Record<string, string> = {
    RENDER: "Renders",
    AVANCE_OBRA: "Avance de obra",
    MASTERPLAN: "Masterplan",
    INTERIOR: "Interiores",
    EXTERIOR: "Exteriores",
};

export default function PublicProjectGallery({ imagenes }: PublicProjectGalleryProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("TODOS");
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    const categories = ["TODOS", ...Array.from(new Set(imagenes.map((img) => img.categoria)))];

    const filteredImagenes =
        selectedCategory === "TODOS"
            ? imagenes
            : imagenes.filter((img) => img.categoria === selectedCategory);

    return (
        <section className="py-24 bg-background">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Explora el proyecto</h2>
                    <p className="text-lg text-muted-foreground leading-8 max-w-2xl mx-auto">
                        Visualiza cada detalle a través de nuestra galería profesional. Renders de alta calidad y seguimiento de obra.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "px-6 py-3 rounded-full text-base font-bold transition-all border shadow-sm",
                                selectedCategory === cat
                                    ? "bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/20 scale-105"
                                    : "bg-card border-border text-muted-foreground hover:border-brand-500 hover:text-foreground"
                            )}
                        >
                            {cat === "TODOS" ? "Todas" : CATEGORY_NAMES[cat] || cat}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredImagenes.map((img, idx) => (
                        <div
                            key={img.id}
                            className={cn(
                                "group relative aspect-[4/3] rounded-3xl overflow-hidden cursor-pointer border border-border bg-card shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
                                idx % 5 === 0 ? "lg:col-span-2 lg:row-span-1" : ""
                            )}
                            onClick={() => setLightboxImage(img.url)}
                        >
                            <Image
                                src={img.url}
                                alt={img.categoria}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                placeholder="blur"
                                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                                <p className="text-brand-400 font-bold text-sm uppercase tracking-widest mb-2">
                                    {CATEGORY_NAMES[img.categoria] || img.categoria}
                                </p>
                                <div className="flex items-center justify-between">
                                    <h4 className="text-white font-bold text-xl">Ver imagen</h4>
                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <Maximize2 className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {imagenes.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card/40">
                        <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">Aún no hay imágenes disponibles para este proyecto.</p>
                    </div>
                )}
            </div>

            {lightboxImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-fade-in"
                    />
                </div>
            )}
        </section>
    );
}
