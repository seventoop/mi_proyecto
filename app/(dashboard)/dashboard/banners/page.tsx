"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreVertical, Image, Play, Eye, PauseCircle, CheckCircle, XCircle, Trash2 } from "lucide-react";
import BannerForm from "@/components/dashboard/banners/banner-form";
import { getBanners, deleteBanner, updateBanner } from "@/lib/actions/banners";
import { cn } from "@/lib/utils";

export default function BannersPage() {
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBanner, setEditingBanner] = useState<any>(null);
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

    const handleEdit = (banner: any) => {
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Banners</h1>
                    <p className="text-slate-500 dark:text-slate-400">Administra la publicidad y banners destacados de la plataforma.</p>
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
                {["TODOS", "PENDIENTE", "APROBADO", "PAUSADO", "RECHAZADO"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border",
                            filter === status
                                ? "bg-white dark:bg-slate-800 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                    >
                        {status === "TODOS" ? "Todos" : status.charAt(0) + status.slice(1).toLowerCase()}
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
                        <Image className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay banners</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">No se encontraron banners con el filtro seleccionado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBanners.map((banner) => (
                        <div key={banner.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300">
                            {/* Image Preview */}
                            <div className="aspect-video relative bg-slate-100 dark:bg-slate-800">
                                <img src={banner.mediaUrl} alt={banner.titulo} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                <div className="absolute bottom-3 left-4 right-4">
                                    <h3 className="text-white font-bold truncate">{banner.titulo}</h3>
                                    <p className="text-white/80 text-xs truncate">{banner.posicion}</p>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md",
                                        banner.estado === "APROBADO" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                                            banner.estado === "PENDIENTE" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                                                banner.estado === "PAUSADO" ? "bg-slate-500/20 text-slate-300 border border-slate-500/30" :
                                                    "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    )}>
                                        {banner.estado}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Overlay (Hover) */}
                            <div className="p-4 flex items-center justify-between gap-2">
                                <div className="text-xs text-slate-500">
                                    Prioridad: <span className="font-semibold text-slate-700 dark:text-slate-300">{banner.prioridad}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {banner.estado === "PENDIENTE" && (
                                        <button onClick={() => handleStatusChange(banner.id, "APROBADO")} title="Aprobar"
                                            className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
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

                                    <button onClick={() => handleEdit(banner)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(banner.id)}
                                        className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
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
