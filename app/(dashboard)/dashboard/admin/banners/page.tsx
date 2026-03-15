"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Eye, PauseCircle, CheckCircle, XCircle, DollarSign, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import BannerForm from "@/components/dashboard/banners/banner-form";
import { getBanners, deleteBanner, updateBanner } from "@/lib/actions/banners";
import { cn } from "@/lib/utils";

interface Banner {
    id: string;
    titulo: string;
    mediaUrl: string;
    tipo: string;
    estado: string;
    creadoPorId?: string | null;
    pago?: {
        id: string;
        monto: any;
        estado: string;
        comprobanteUrl?: string | null;
    } | null;
}

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [filter, setFilter] = useState("TODOS");

    const fetchBanners = async () => {
        setLoading(true);
        const res = await getBanners();
        if (res.success) {
            setBanners(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleCreate = () => {
        setEditingBanner(null);
        setShowForm(true);
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setShowForm(true);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateBanner(id, { estado: newStatus });
        fetchBanners();
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este banner?")) {
            await deleteBanner(id);
            fetchBanners();
        }
    };

    // Filter logic
    const filteredBanners = banners.filter(b => {
        if (filter === "TODOS") return true;
        return b.estado === filter;
    });

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Banners</h1>
                    <p className="text-slate-600 dark:text-slate-400">Administra la publicidad y banners destacados de la plataforma.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium shadow-lg shadow-brand-600/20 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Banner
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {[
                    { id: "TODOS", label: "Ver Todos" },
                    { id: "PENDIENTE", label: "Por Revisar (Pagos)", count: banners.filter(b => b.estado === "PENDIENTE").length },
                    { id: "APROBADO", label: "Activos" },
                    { id: "PENDIENTE_PAGO", label: "Esperando Pago" },
                    { id: "RECHAZADO", label: "Rechazados" }
                ].map((status) => (
                    <button
                        key={status.id}
                        onClick={() => setFilter(status.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border flex items-center gap-2",
                            filter === status.id
                                ? "bg-white dark:bg-slate-800 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                    >
                        {status.label}
                        {status.count !== undefined && status.count > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                                {status.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                    ))}
                </div>
            ) : filteredBanners.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay banners en esta categoría</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBanners.map((banner) => (
                        <div key={banner.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300">
                            {/* Image Preview */}
                            <div className="aspect-video relative bg-slate-100 dark:bg-slate-800 group">
                                {banner.tipo === "VIDEO" ? (
                                    <video src={banner.mediaUrl} className="w-full h-full object-cover" muted loop />
                                ) : (
                                    <Image
                                        src={banner.mediaUrl}
                                        alt={banner.titulo}
                                        fill
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                                <div className="absolute bottom-3 left-4 right-4 text-white">
                                    <h3 className="font-bold truncate text-sm">{banner.titulo}</h3>
                                    <p className="text-xs text-white/70">{banner.creadoPorId ? "Creado por Externo" : "Interno"}</p>
                                </div>

                                <div className="absolute top-3 right-3 flex gap-2">
                                    {banner.pago?.comprobanteUrl && (
                                        <a href={banner.pago.comprobanteUrl} target="_blank" rel="noopener noreferrer"
                                            className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" /> Pago
                                        </a>
                                    )}
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md",
                                        banner.estado === "APROBADO" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                                            banner.estado === "PENDIENTE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                                banner.estado === "PENDIENTE_PAGO" ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" :
                                                    "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    )}>
                                        {banner.estado === "PENDIENTE" ? "REVISIÓN" : banner.estado}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Overlay (Hover) */}
                            <div className="p-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs text-slate-500">
                                    {banner.estado === "PENDIENTE" && "Requiere Acción:"}
                                </div>
                                <div className="flex items-center gap-1">
                                    {banner.estado === "PENDIENTE" && (
                                        <>
                                            <button onClick={() => handleStatusChange(banner.id, "APROBADO")} title="Aprobar y Publicar"
                                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleStatusChange(banner.id, "RECHAZADO")} title="Rechazar"
                                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {banner.estado === "APROBADO" && (
                                        <button onClick={() => handleStatusChange(banner.id, "PAUSADO")} title="Pausar"
                                            className="p-2 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 rounded-lg transition-colors">
                                            <PauseCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    {(banner.estado === "PAUSADO" || banner.estado === "RECHAZADO") && (
                                        <button onClick={() => handleStatusChange(banner.id, "APROBADO")} title="Reactivar"
                                            className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors">
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                                    <button onClick={() => handleEdit(banner)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(banner.id)}
                                        className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <BannerForm
                    banner={editingBanner}
                    onClose={() => {
                        setShowForm(false);
                        fetchBanners(); // Refresh list on close
                    }}
                />
            )}
        </div>
    );
}
