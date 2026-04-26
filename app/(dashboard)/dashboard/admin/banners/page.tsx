"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Eye, PauseCircle, CheckCircle, XCircle, Image as ImageIcon, Archive, Send, Pencil, Trash2 } from "lucide-react";
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
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

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
        const res = await publishBanner(id);
        if (res.success) fetchBanners();
        else alert(res.error || "Error al publicar");
    };

    const handleRejectSubmit = async () => {
        if (!rejectingId) return;
        const res = await rejectBanner(rejectingId, rejectReason.trim() || undefined);
        if (res.success) {
            setRejectingId(null);
            setRejectReason("");
            fetchBanners();
        } else {
            alert(res.error || "Error al rechazar");
        }
    };

    const handlePause = async (id: string) => {
        const res = await pauseBanner(id);
        if (res.success) fetchBanners();
        else alert(res.error || "Error al pausar");
    };

    const handleArchive = async (id: string) => {
        if (confirm("¿Archivar este banner?")) {
            const res = await archiveBanner(id);
            if (res.success) fetchBanners();
            else alert(res.error || "Error al archivar");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar definitivamente este banner?")) {
            const res = await deleteBanner(id);
            if (res.success) fetchBanners();
            else alert(res.error || "Error al eliminar");
        }
    };

    const pendingCount = banners.filter(b => b.estado === BANNER_ESTADOS.PENDING_APPROVAL).length;

    const filteredBanners = banners.filter(b =>
        filter === "TODOS" ? true : b.estado === filter
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminBanners} />
                </div>
                <button
                    onClick={() => { setEditingBanner(null); setShowEditor(true); }}
                    className="mt-1 flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs uppercase font-black tracking-widest text-white transition-all shadow-lg shadow-brand-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Banner
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 bg-white dark:bg-[#0A0A0C] border border-white/[0.06] p-1.5 rounded-xl w-fit overflow-x-auto">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            filter === f.id
                                ? "bg-white/[0.06] text-white"
                                : "text-slate-500 hover:text-white"
                        )}
                    >
                        {f.label}
                        {f.id === BANNER_ESTADOS.PENDING_APPROVAL && pendingCount > 0 && (
                            <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-md flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
                    ))}
                </div>
            ) : filteredBanners.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-3xl">
                    <div className="w-16 h-16 bg-white/[0.02] border border-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-white/[0.06]" />
                    </div>
                    <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">No hay banners en esta categoría</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBanners.map((banner) => (
                        <div key={banner.id} className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl group flex flex-col h-full overflow-hidden transition-all shadow-sm">
                            {/* Media Preview */}
                            <div className="aspect-video relative bg-white/[0.02]">
                                {banner.mediaUrl ? (
                                    banner.tipo === "VIDEO" ? (
                                        <video src={banner.mediaUrl} className="w-full h-full object-cover" muted loop />
                                    ) : (
                                        <Image
                                            src={banner.mediaUrl}
                                            alt={banner.titulo}
                                            fill
                                            className="object-cover"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/[0.06]">
                                        <ImageIcon className="w-8 h-8" />
                                        <p className="text-xs uppercase font-black tracking-widest">Sin Media</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-3 left-4 right-4 text-white">
                                    <h3 className="font-black truncate text-[12px] uppercase tracking-tight">{banner.internalName || banner.titulo}</h3>
                                    {banner.headline && (
                                        <p className="text-xs text-white/60 truncate uppercase tracking-widest">{banner.headline}</p>
                                    )}
                                </div>
                                <div className="absolute top-3 right-3">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest border-none",
                                        STATE_STYLE[banner.estado] || STATE_STYLE.DRAFT
                                    )}>
                                        {STATE_LABEL[banner.estado] || banner.estado}
                                    </span>
                                </div>
                                {banner.context && (
                                    <div className="absolute top-3 left-3">
                                        <span
                                            className={cn(
                                                "px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest backdrop-blur-sm border-none",
                                                banner.context === "SEVENTOOP_GLOBAL"
                                                    ? "bg-blue-500/30 text-blue-100 ring-1 ring-blue-300/40"
                                                    : banner.context === "PROJECT_LANDING"
                                                        ? "bg-amber-500/25 text-amber-100"
                                                        : "bg-white/[0.06] text-slate-300"
                                            )}
                                            title={
                                                banner.context === "SEVENTOOP_GLOBAL"
                                                    ? "Banner global — visible en la home pública de SevenToop"
                                                    : banner.context === "PROJECT_LANDING"
                                                        ? "Banner de un proyecto específico"
                                                        : "Banner de una organización"
                                            }
                                        >
                                            {banner.context === "SEVENTOOP_GLOBAL"
                                                ? "GLOBAL"
                                                : banner.context === "PROJECT_LANDING"
                                                    ? "PROYECTO"
                                                    : "ORG"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="p-4 flex items-center justify-between gap-2 border-t border-white/[0.06] mt-auto">
                                <div className="flex items-center gap-1">
                                    {(banner.estado === BANNER_ESTADOS.PENDING_APPROVAL || 
                                      banner.estado === BANNER_ESTADOS.DRAFT || 
                                      banner.estado === BANNER_ESTADOS.REJECTED) && (
                                        <>
                                            <button
                                                onClick={() => handlePublish(banner.id)}
                                                disabled={!banner.mediaUrl}
                                                title={banner.estado === BANNER_ESTADOS.PENDING_APPROVAL ? "Aprobar y Publicar" : "Publicar Ahora"}
                                                className={cn(
                                                    "p-1.5 rounded-lg transition-colors",
                                                    banner.mediaUrl 
                                                        ? "hover:bg-emerald-500/10 text-emerald-500"
                                                        : "opacity-30 cursor-not-allowed text-slate-500"
                                                )}
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            {banner.estado === BANNER_ESTADOS.PENDING_APPROVAL && (
                                                <button
                                                    onClick={() => { setRejectingId(banner.id); setRejectReason(""); }}
                                                    title="Rechazar"
                                                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {banner.estado === BANNER_ESTADOS.PUBLISHED && (
                                        <button
                                            onClick={() => handlePause(banner.id)}
                                            title="Pausar"
                                            className="p-1.5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-500 rounded-lg transition-colors"
                                        >
                                            <PauseCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    {banner.estado === BANNER_ESTADOS.PAUSED && (
                                        <button
                                            onClick={() => handlePublish(banner.id)}
                                            title="Republicar"
                                            className="p-1.5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
                                        >
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}
                                    {(banner.estado === BANNER_ESTADOS.REJECTED || banner.estado === BANNER_ESTADOS.PAUSED || banner.estado === BANNER_ESTADOS.DRAFT) && (
                                        <button
                                            onClick={() => handleArchive(banner.id)}
                                            title="Archivar"
                                            className="p-1.5 hover:bg-slate-500/10 text-slate-400 hover:text-slate-300 rounded-lg transition-colors"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { setEditingBanner(banner); setShowEditor(true); }}
                                        title="Editar"
                                        className="p-1.5 hover:bg-white/[0.06] text-slate-400 hover:text-white rounded-lg transition-colors"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(banner.id)}
                                        title="Eliminar"
                                        className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
                    <div className="bg-white dark:bg-[#0A0A0C] rounded-2xl border border-white/[0.06] ring-1 ring-white/[0.04] p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-[14px] font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Rechazar Banner</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-bold">
                            Opcionalmente indicá el motivo (se notificará al creador).
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[12px] font-bold text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/40 resize-none mb-4 placeholder:text-slate-500/50"
                        />
                        <div className="flex gap-3 justify-end mt-4">
                            <button
                                onClick={() => setRejectingId(null)}
                                className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-white/[0.04] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRejectSubmit}
                                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs uppercase font-black tracking-widest transition-colors shadow-lg shadow-rose-500/20"
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
