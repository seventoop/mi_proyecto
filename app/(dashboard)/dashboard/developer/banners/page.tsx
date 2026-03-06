"use client";

import { useState, useEffect } from "react";
import { Plus, Image as ImageIcon, ExternalLink, Clock, CheckCircle, XCircle, DollarSign } from "lucide-react";
import Image from "next/image";
import DeveloperBannerForm from "@/components/dashboard/banners/developer-banner-form";
import { getBanners } from "@/lib/actions/banners";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
interface Banner {
    id: string;
    titulo: string;
    tipo: string;
    mediaUrl: string;
    estado: string;
    fechaInicio?: string | Date | null;
    fechaFin?: string | Date | null;
    linkDestino?: string | null;
}

export default function DeveloperBannersPage() {
    const { data: session } = useSession();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const fetchBanners = async () => {
        if (!session?.user) return;
        setLoading(true);
        const res = await getBanners({ userId: session.user.id });
        if (res.success) {
            setBanners(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBanners();
    }, [session]);

    return (
        <div className="p-6 space-y-8 max-w-[1200px] mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mis Anuncios</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                        Promociona tus proyectos en la página principal para obtener más leads.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-105"
                >
                    <Plus className="w-5 h-5" />
                    Crear Nuevo Anuncio
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />)}
                </div>
            ) : banners.length === 0 ? (
                <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ImageIcon className="w-8 h-8 text-brand-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aún no tienes anuncios</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
                        Crea campañas visuales de alto impacto para destacar tus desarrollos frente a miles de inversores.
                    </p>
                    <button onClick={() => setShowForm(true)} className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-50 transition-colors">
                        Comenzar Ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {banners.map(banner => (
                        <div key={banner.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                            {/* Media */}
                            <div className="aspect-video relative bg-slate-100">
                                {banner.tipo === "VIDEO" ? (
                                    <video src={banner.mediaUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <Image
                                        src={banner.mediaUrl}
                                        alt={banner.titulo}
                                        fill
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Status Badge */}
                                <div className="absolute top-4 right-4">
                                    <span className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg",
                                        banner.estado === "APROBADO" ? "bg-emerald-500 text-white" :
                                            banner.estado === "PENDIENTE" ? "bg-amber-500 text-white" :
                                                banner.estado === "PENDIENTE_PAGO" ? "bg-slate-800 text-white" :
                                                    "bg-rose-500 text-white"
                                    )}>
                                        {banner.estado === "PENDIENTE_PAGO" ? "Falta Pago" : banner.estado}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{banner.titulo}</h3>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {banner.fechaInicio ? new Date(banner.fechaInicio).toLocaleDateString() : "Inicio inmediato"}
                                            {" -> "}
                                            {banner.fechaFin ? new Date(banner.fechaFin).toLocaleDateString() : "Indefinido"}
                                        </span>
                                    </div>
                                    {banner.linkDestino && (
                                        <div className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="truncate max-w-[200px]">{banner.linkDestino}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Status Explanation */}
                                <div className={cn(
                                    "p-4 rounded-xl text-sm font-medium border",
                                    banner.estado === "PENDIENTE_PAGO" ? "bg-slate-100 border-slate-200 text-slate-700" :
                                        banner.estado === "PENDIENTE" ? "bg-amber-50 border-amber-100 text-amber-700" :
                                            banner.estado === "APROBADO" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                                "bg-rose-50 border-rose-100 text-rose-700"
                                )}>
                                    {banner.estado === "PENDIENTE_PAGO" && (
                                        <div className="flex items-start gap-3">
                                            <DollarSign className="w-5 h-5 shrink-0" />
                                            <p>Debes subir el comprobante de pago para que revisemos tu anuncio.</p>
                                        </div>
                                    )}
                                    {banner.estado === "PENDIENTE" && (
                                        <div className="flex items-start gap-3">
                                            <Clock className="w-5 h-5 shrink-0" />
                                            <p>Tu pago está en revisión. Te notificaremos cuando el banner sea aprobado.</p>
                                        </div>
                                    )}
                                    {banner.estado === "APROBADO" && (
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 shrink-0" />
                                            <p>¡Tu anuncio está activo y visible para todos los usuarios!</p>
                                        </div>
                                    )}
                                    {banner.estado === "RECHAZADO" && (
                                        <div className="flex items-start gap-3">
                                            <XCircle className="w-5 h-5 shrink-0" />
                                            <p>Tu anuncio fue rechazado. Revisa tu correo para más detalles o contacta soporte.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && <DeveloperBannerForm onClose={() => { setShowForm(false); fetchBanners(); }} />}
        </div>
    );
}
