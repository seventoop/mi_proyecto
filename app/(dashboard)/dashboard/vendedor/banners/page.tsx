"use client";

import { useState, useEffect } from "react";
import { Plus, Image as ImageIcon, Clock, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";
import Image from "next/image";
import BannerEditor from "@/components/dashboard/banners/banner-editor";
import { getBanners, getMyProyectos } from "@/lib/actions/banners";
import { BANNER_ESTADOS } from "@/lib/actions/banners-constants";
import { cn } from "@/lib/utils";

interface Banner {
    id: string;
    titulo: string;
    internalName?: string | null;
    tipo: string;
    mediaUrl: string;
    estado: string;
    headline?: string | null;
    notasAdmin?: string | null;
    fechaInicio?: string | Date | null;
    fechaFin?: string | Date | null;
}

const STATE_LABEL: Record<string, string> = {
    DRAFT: "Borrador",
    PENDING_APPROVAL: "En Revisión",
    PUBLISHED: "Publicado",
    REJECTED: "Rechazado",
    PAUSED: "Pausado",
    ARCHIVED: "Archivado",
};

const STATE_BADGE: Record<string, string> = {
    PUBLISHED: "bg-emerald-500 text-white",
    PENDING_APPROVAL: "bg-amber-500 text-white",
    DRAFT: "bg-slate-500 text-white",
    PAUSED: "bg-blue-500 text-white",
    REJECTED: "bg-rose-500 text-white",
    ARCHIVED: "bg-slate-600 text-white",
};

const STATE_INFO: Record<string, { icon: React.ElementType; text: string; style: string }> = {
    DRAFT: {
        icon: AlertCircle,
        text: "Guardado como borrador. Envialo a revisión cuando esté listo.",
        style: "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
    },
    PENDING_APPROVAL: {
        icon: Clock,
        text: "Tu anuncio está en revisión. Te notificaremos cuando sea aprobado.",
        style: "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
    },
    PUBLISHED: {
        icon: CheckCircle,
        text: "¡Tu anuncio está activo y visible para todos los usuarios!",
        style: "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300",
    },
    REJECTED: {
        icon: XCircle,
        text: "Tu anuncio fue rechazado. Podés editarlo y volver a enviarlo.",
        style: "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300",
    },
    PAUSED: {
        icon: AlertCircle,
        text: "Tu anuncio está pausado temporalmente por el administrador.",
        style: "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
    },
};

const FILTERS = [
    { id: "TODOS", label: "Todos" },
    { id: BANNER_ESTADOS.DRAFT, label: "Borradores" },
    { id: BANNER_ESTADOS.PENDING_APPROVAL, label: "En Revisión" },
    { id: BANNER_ESTADOS.PUBLISHED, label: "Publicados" },
    { id: BANNER_ESTADOS.REJECTED, label: "Rechazados" },
];

export default function VendedorBannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [projects, setProjects] = useState<{ id: string; nombre: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [filter, setFilter] = useState("TODOS");

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

    const filteredBanners = banners.filter(b =>
        filter === "TODOS"
            ? b.estado !== BANNER_ESTADOS.ARCHIVED
            : b.estado === filter
    );

    return (
        <div className="p-6 space-y-8 max-w-[1200px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mis Anuncios</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                        Promociona los proyectos en la página principal para obtener más leads.
                    </p>
                </div>
                <button
                    onClick={() => { setEditingBanner(null); setShowEditor(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-105"
                >
                    <Plus className="w-5 h-5" />
                    Crear Nuevo Anuncio
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border",
                            filter === f.id
                                ? "bg-white dark:bg-slate-800 border-brand-500 text-brand-600 dark:text-brand-400 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />)}
                </div>
            ) : filteredBanners.length === 0 ? (
                <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ImageIcon className="w-8 h-8 text-brand-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aún no tienes anuncios</h3>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
                        Crea campañas visuales de alto impacto para destacar los proyectos frente a miles de inversores.
                    </p>
                    <button
                        onClick={() => { setEditingBanner(null); setShowEditor(true); }}
                        className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Comenzar Ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredBanners.map(banner => {
                        const stateInfo = STATE_INFO[banner.estado];
                        const Icon = stateInfo?.icon || AlertCircle;

                        return (
                            <div key={banner.id} className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                                {/* Media */}
                                <div className="aspect-video relative bg-slate-100 dark:bg-slate-800">
                                    {banner.tipo === "VIDEO" ? (
                                        <video src={banner.mediaUrl} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <Image
                                            src={banner.mediaUrl}
                                            alt={banner.titulo}
                                            fill
                                            className="object-cover"
                                        />
                                    )}
                                    <div className="absolute top-4 right-4">
                                        <span className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg",
                                            STATE_BADGE[banner.estado] || STATE_BADGE.DRAFT
                                        )}>
                                            {STATE_LABEL[banner.estado] || banner.estado}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">
                                        {banner.internalName || banner.titulo}
                                    </h3>
                                    {banner.headline && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-1">{banner.headline}</p>
                                    )}
                                    {banner.fechaInicio && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>
                                                {new Date(banner.fechaInicio).toLocaleDateString()}
                                                {banner.fechaFin ? ` → ${new Date(banner.fechaFin).toLocaleDateString()}` : " · Sin fecha fin"}
                                            </span>
                                        </div>
                                    )}

                                    {/* Rejection reason */}
                                    {banner.estado === BANNER_ESTADOS.REJECTED && banner.notasAdmin && (
                                        <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                                            <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-0.5">Motivo:</p>
                                            <p className="text-xs text-rose-600 dark:text-rose-300">{banner.notasAdmin}</p>
                                        </div>
                                    )}

                                    {/* State info */}
                                    {stateInfo && (
                                        <div className={cn("p-3 rounded-xl text-sm font-medium border flex items-start gap-3", stateInfo.style)}>
                                            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="text-xs">{stateInfo.text}</p>
                                        </div>
                                    )}

                                    {/* Edit button */}
                                    {(banner.estado === BANNER_ESTADOS.DRAFT || banner.estado === BANNER_ESTADOS.REJECTED) && (
                                        <button
                                            onClick={() => { setEditingBanner(banner); setShowEditor(true); }}
                                            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Editar Anuncio
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <BannerEditor
                            banner={editingBanner}
                            isAdmin={false}
                            projects={projects}
                            onClose={() => { setShowEditor(false); fetchBanners(); }}
                            onSaved={() => { setShowEditor(false); fetchBanners(); }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
