"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Heart, TrendingUp } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useTransition } from "react";
import { toggleFavorito } from "@/lib/actions/investor-actions";
import { toast } from "sonner";

interface ProjectCardProps {
    proyecto: {
        id: string;
        nombre: string;
        ubicacion: string | null;
        descripcion: string | null;
        imagenPortada: string | null;
        precioM2Inversor: any;
        precioM2Mercado: any;
        metaM2Objetivo: any;
        m2VendidosInversores: any;
        isFavorite?: boolean;
    };
    showFavorite?: boolean;
}

export default function InvestorProjectCard({ proyecto, showFavorite = true }: ProjectCardProps) {
    const [isFavorite, setIsFavorite] = useState(proyecto.isFavorite);
    const [isPending, startTransition] = useTransition();

    const progress = proyecto.metaM2Objetivo
        ? (Number(proyecto.m2VendidosInversores) / Number(proyecto.metaM2Objetivo)) * 100
        : 0;

    const roi = proyecto.precioM2Inversor && proyecto.precioM2Mercado
        ? ((Number(proyecto.precioM2Mercado) - Number(proyecto.precioM2Inversor)) / Number(proyecto.precioM2Inversor)) * 100
        : 0;

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        startTransition(async () => {
            const res = await toggleFavorito(proyecto.id);
            if (res.success) {
                setIsFavorite(res.isFavorite);
                toast.success(res.isFavorite ? "Añadido a favoritos" : "Eliminado de favoritos");
            } else {
                toast.error("Error al actualizar favoritos");
            }
        });
    };

    return (
        <div className="glass-card overflow-hidden hover:border-brand-500/50 transition-all group flex flex-col h-full relative">
            {showFavorite && (
                <button
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className={cn(
                        "absolute top-4 right-4 z-10 p-2.5 rounded-2xl transition-all shadow-lg",
                        isFavorite
                            ? "bg-rose-500 text-white shadow-rose-500/20"
                            : "bg-white/80 dark:bg-slate-900/80 text-slate-400 hover:text-rose-500 backdrop-blur-md"
                    )}
                >
                    <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                </button>
            )}

            <Link href={`/dashboard/inversor/proyectos/${proyecto.id}`} className="flex-1 flex flex-col">
                {proyecto.imagenPortada ? (
                    <div className="h-48 overflow-hidden relative">
                        <Image
                            src={proyecto.imagenPortada}
                            alt={proyecto.nombre}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/60 to-transparent" />
                        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-widest">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ROI +{roi.toFixed(1)}%
                        </div>
                    </div>
                ) : (
                    <div className="h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-slate-300" />
                    </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-brand-500 transition-colors">
                        {proyecto.nombre}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3">
                        <MapPin className="w-3.5 h-3.5" />
                        {proyecto.ubicacion || "Ubicación por definir"}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-6 flex-1">
                        {proyecto.descripcion || "Oportunidad de inversión en activo real bajo esquema de fondeo colectivo."}
                    </p>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs uppercase font-black tracking-widest text-slate-400 mb-0.5">Precio M²</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">
                                    {formatCurrency(Number(proyecto.precioM2Inversor) || 0)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase font-black tracking-widest text-slate-400 mb-0.5">Fondeado</p>
                                <p className="text-lg font-black text-brand-500">
                                    {progress.toFixed(0)}%
                                </p>
                            </div>
                        </div>

                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={cn(
                                    "h-full transition-all duration-1000",
                                    progress >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-brand-500 to-brand-600"
                                )}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
