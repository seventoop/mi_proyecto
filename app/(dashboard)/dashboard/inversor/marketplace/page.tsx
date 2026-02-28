import prisma from "@/lib/db";
import Link from "next/link";
import Image from "next/image";
import { MapPin, TrendingUp, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function MarketplacePage() {
    const proyectos = await prisma.proyecto.findMany({
        where: {
            invertible: true,
            estado: { in: ["PLANIFICACION", "EN_CONSTRUCCION"] },
            visibilityStatus: "PUBLICADO",
            OR: [
                { isDemo: false },
                {
                    isDemo: true,
                    demoExpiresAt: { gt: new Date() }
                }
            ]
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            nombre: true,
            ubicacion: true,
            descripcion: true,
            imagenPortada: true,
            precioM2Inversor: true,
            precioM2Mercado: true,
            metaM2Objetivo: true,
            m2VendidosInversores: true,
            fechaLimiteFondeo: true,
        }
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Marketplace de Inversiones</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Oportunidades de inversión en etapa temprana</p>
            </div>

            {proyectos.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No hay proyectos disponibles</h3>
                    <p className="text-slate-500 dark:text-slate-400">Vuelve pronto para ver nuevas oportunidades</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {proyectos.map((proyecto) => {
                        const progress = proyecto.metaM2Objetivo
                            ? (Number(proyecto.m2VendidosInversores) / Number(proyecto.metaM2Objetivo)) * 100
                            : 0;
                        const roi = proyecto.precioM2Inversor && proyecto.precioM2Mercado
                            ? ((Number(proyecto.precioM2Mercado) - Number(proyecto.precioM2Inversor)) / Number(proyecto.precioM2Inversor)) * 100
                            : 0;

                        return (
                            <Link
                                key={proyecto.id}
                                href={`/dashboard/proyectos/${proyecto.id}`}
                                className="glass-card overflow-hidden hover:border-brand-500/50 transition-all group"
                            >
                                {proyecto.imagenPortada && (
                                    <div className="h-48 overflow-hidden relative">
                                        <Image
                                            src={proyecto.imagenPortada}
                                            alt={proyecto.nombre}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                )}
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{proyecto.nombre}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {proyecto.ubicacion}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">
                                        {proyecto.descripcion}
                                    </p>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Precio/M²</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(Number(proyecto.precioM2Inversor) || 0)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">ROI Proyectado</p>
                                                <p className="text-sm font-semibold text-emerald-400">
                                                    +{roi.toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                <span>Progreso de Fondeo</span>
                                                <span>{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
