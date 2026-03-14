"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Eye, PauseCircle, CheckCircle, XCircle, Image as ImageIcon, Archive } from "lucide-react";
import Image from "next/image";
import BannerEditor from "@/components/dashboard/banners/banner-editor";
import {
    getBanners,
    getMyProyectos,
    deleteBanner,
    publishBanner,
    rejectBanner,
    pauseBanner,
    archiveBanner,
} from "@/lib/actions/banners";
import { BANNER_ESTADOS } from "@/lib/actions/banners-constants";
import { cn } from "@/lib/utils";

interface Banner {
    id: string;
    titulo: string;
    internalName?: string | null;
    mediaUrl: string;
    tipo: string;
    estado: string;
    context?: string | null;
    headline?: string | null;
    notasAdmin?: string | null;
    creadoPorId?: string | null;
}

const STATE_LABEL: Record<string, string> = {
    DRAFT: "Borrador",
    PENDING_APPROVAL: "Por Aprobar",
    PUBLISHED: "Publicado",
    REJECTED: "Rechazado",
    PAUSED: "Pausado",
    ARCHIVED: "Archivado",
};

const STATE_STYLE: Record<string, string> = {
    PUBLISHED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    PENDING_APPROVAL: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    DRAFT: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    PAUSED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    REJECTED: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    ARCHIVED: "bg-slate-600/20 text-slate-400 border-slate-600/30",
};

const FILTERS = [
    { id: "TODOS", label: "Todos" },
    { id: BANNER_ESTADOS.PENDING_APPROVAL, label: "Por Aprobar" },
    { id: BANNER_ESTADOS.PUBLISHED, label: "Publicados" },
    { id: BANNER_ESTADOS.PAUSED, label: "Pausados" },
    { id: BANNER_ESTADOS.DRAFT, label: "Borradores" },
    { id: BANNER_ESTADOS.REJECTED, label: "Rechazados" },
    { id: BANNER_ESTADOS.ARCHIVED, label: "Archivados" },
];

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [projects, setProjects] = useState<{ id: string; nombre: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [filter, setFilter] = useState("TODOS");
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    const fetchBanners = async () => {
        setLoading(true);
        const res = await getBanners();
        if (res.success) setBanners((res.data as Banner[]) || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBanners();
        getMyProyectos().then((res) => { if (res.success) setProjects((res.data as { id: string; nombre: string }[]) || []); });
    }, []);

    const handlePublish = async (id: string) => {
        await publishBanner(id);
        fetchBanners();
    };

    const handleRejectSubmit = async () => {
        if (!rejectingId) return;
        await rejectBanner(rejectingId, rejectReason.trim() || undefined);
        setRejectingId(null);
        setRejectReason("");
        fetchBanners();
    };

    const handlePause = async (id: string) => {
        await pauseBanner(id);
        fetchBanners();
    };

    const handleArchive = async (id: string) => {
        if (confirm("¿Archivar este banner?")) {
            await archiveBanner(id);
            fetchBanners();
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar definitivamente este banner?")) {
            await deleteBanner(id);
            fetchBanners();
        }
    };

    const pendingCount = banners.filter(b => b.estado === BANNER_ESTADOS.PENDING_APPROVAL).length;

    const filteredBanners = banners.filter(b =>
        filter === "TODOS" ? true : b.estado === filter
    );

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Banners</h1>
                    <p className="text-slate-600 dark:text-slate-400">Aprueba, pausa y administra todos los banners de la plataforma.</p>
                </div>
                <button
                    onClick={() => { setEditingBanner(null); setShowEditor(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium shadow-lg shadow-brand-600/20 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Banner
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border flex items-center gap-2",
                            filter === f.id
                                ? "bg-white dark:bg-slate-800 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                    >
                        {f.label}
                        {f.id === BANNER_ESTADOS.PENDING_APPROVAL && pendingCount > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                                {pendingCount}
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
                            {/* Media Preview */}
                            <div className="aspect-video relative bg-slate-100 dark:bg-slate-800">
                                {banner.tipo === "VIDEO" ? (
                                    <video src={banner.mediaUrl} className="w-full h-full object-cover" muted loop />
                                ) : (
                                    <Image
                                        src={banner.mediaUrl}
                                        alt={banner.titulo}
                                        fill
                                        className="object-cover"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-4 right-4 text-white">
                                    <h3 className="font-bold truncate text-sm">{banner.internalName || banner.titulo}</h3>
                                    {banner.headline && (
                                        <p className="text-xs text-white/60 truncate">{banner.headline}</p>
                                    )}
                                </div>
                                <div className="absolute top-3 right-3">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border",
                                        STATE_STYLE[banner.estado] || STATE_STYLE.DRAFT
                                    )}>
                                        {STATE_LABEL[banner.estado] || banner.estado}
                                    </span>
                                </div>
                                {banner.context && (
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-black/40 text-white/70 uppercase tracking-wider backdrop-blur-sm">
                                            {banner.context === "PROJECT_LANDING" ? "Proyecto" : "Org"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-1">
                                    {banner.estado === BANNER_ESTADOS.PENDING_APPROVAL && (
                                        <>
                                            <button
                                                onClick={() => handlePublish(banner.id)}
                                                title="Aprobar y Publicar"
                                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setRejectingId(banner.id); setRejectReason(""); }}
                                                title="Rechazar"
                                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {banner.estado === BANNER_ESTADOS.PUBLISHED && (
                                        <button
                                            onClick={() => handlePause(banner.id)}
                                            title="Pausar"
                                            className="p-2 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 rounded-lg transition-colors"
                                        >
                                            <PauseCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    {banner.estado === BANNER_ESTADOS.PAUSED && (
                                        <button
                                            onClick={() => handlePublish(banner.id)}
                                            title="Republicar"
                                            className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
                                        >
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}
                                    {(banner.estado === BANNER_ESTADOS.REJECTED || banner.estado === BANNER_ESTADOS.PAUSED || banner.estado === BANNER_ESTADOS.DRAFT) && (
                                        <button
                                            onClick={() => handleArchive(banner.id)}
                                            title="Archivar"
                                            className="p-2 hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { setEditingBanner(banner); setShowEditor(true); }}
                                        title="Editar"
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {banner.estado === BANNER_ESTADOS.DRAFT && (
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            title="Eliminar"
                                            className="p-2 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <BannerEditor
                            banner={editingBanner}
                            isAdmin
                            projects={projects}
                            onClose={() => { setShowEditor(false); fetchBanners(); }}
                            onSaved={() => { setShowEditor(false); fetchBanners(); }}
                        />
                    </div>
                </div>
            )}

            {/* Reject Reason Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Rechazar Banner</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Opcionalmente indicá el motivo (se notificará al creador).
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none mb-4"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setRejectingId(null)}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition-colors"
                            >
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
