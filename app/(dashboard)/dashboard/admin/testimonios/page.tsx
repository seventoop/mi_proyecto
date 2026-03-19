"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Trash2, Star, MessageSquareQuote, Building, User } from "lucide-react";
import { getTestimoniosAdmin, updateTestimonioStatus, deleteTestimonio } from "@/lib/actions/testimonios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default function AdminTestimoniosPage() {
    const [testimonios, setTestimonios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("PENDIENTE");

    const fetchTestimonios = async () => {
        setLoading(true);
        const res = await getTestimoniosAdmin();
        if (res.success) {
            setTestimonios(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTestimonios();
    }, []);

    const handleStatusChange = async (id: string, status: string) => {
        const res = await updateTestimonioStatus(id, status);
        if (res.success) {
            toast.success(`Testimonio ${status.toLowerCase()}`);
            fetchTestimonios();
        } else {
            toast.error("Error al actualizar");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este testimonio?")) return;
        const res = await deleteTestimonio(id);
        if (res.success) {
            toast.success("Testimonio eliminado");
            fetchTestimonios();
        } else {
            toast.error("Error al eliminar");
        }
    };

    const filteredTestimonios = filter === "TODOS"
        ? testimonios
        : testimonios.filter(t => t.estado === filter);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminTestimonios} />
                </div>
            </div>

            <div className="flex gap-2 bg-[#0A0A0C] border border-white/[0.06] p-1.5 rounded-xl w-fit overflow-x-auto">
                {["PENDIENTE", "APROBADO", "RECHAZADO", "TODOS"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            filter === f
                                ? "bg-white/[0.06] text-white"
                                : "text-slate-500 hover:text-white"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />)}
                </div>
            ) : filteredTestimonios.length === 0 ? (
                <div className="text-center py-20 bg-[#0A0A0C] border border-white/[0.06] rounded-3xl shadow-sm">
                    <MessageSquareQuote className="w-12 h-12 text-white/[0.06] mx-auto mb-4" />
                    <p className="text-[12px] font-black uppercase tracking-widest text-slate-500">No hay testimonios en esta categoría.</p>
                </div>
            ) : (
                <div className="masonry-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTestimonios.map((t) => (
                        <div key={t.id} className="bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all group flex flex-col h-full shadow-sm">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-white",
                                        t.autorTipo === "EMPRESA" ? "bg-indigo-500" : "bg-brand-500"
                                    )}>
                                        {t.autorTipo === "EMPRESA" ? <Building className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h3 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{t.autorNombre}</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.autorTipo}</p>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={cn("w-3 h-3", i < (t.rating || 5) ? "fill-amber-500 text-amber-500" : "text-white/[0.06]")} />
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 mb-6 relative">
                                <MessageSquareQuote className="absolute -top-2 -left-2 w-6 h-6 text-brand-500/[0.08] -z-10" />
                                <p className="text-slate-400 text-[12px] font-medium leading-relaxed italic z-10 relative">"{t.texto}"</p>
                                {t.proyecto && (
                                    <div className="mt-4 inline-block px-2.5 py-1 bg-white/[0.04] rounded-md text-[9px] font-black text-brand-500 uppercase tracking-widest">
                                        PROYECTO: {t.proyecto.nombre}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                                <span className={cn(
                                    "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                                    t.estado === "APROBADO" ? "bg-emerald-500/10 text-emerald-500" :
                                        t.estado === "RECHAZADO" ? "bg-rose-500/10 text-rose-500" :
                                            "bg-amber-500/10 text-amber-500"
                                )}>
                                    {t.estado}
                                </span>

                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t.estado === "PENDIENTE" && (
                                        <>
                                            <button onClick={() => handleStatusChange(t.id, "APROBADO")} title="Aprobar"
                                                className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-colors">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleStatusChange(t.id, "RECHAZADO")} title="Rechazar"
                                                className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg transition-colors">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {t.estado === "RECHAZADO" && (
                                        <button onClick={() => handleStatusChange(t.id, "APROBADO")} title="Aprobar"
                                            className="p-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-colors">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    {t.estado === "APROBADO" && (
                                        <button onClick={() => handleStatusChange(t.id, "PENDIENTE")} title="Pausar/Revisar"
                                            className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="w-px h-4 bg-white/[0.06] mx-1" />
                                    <button onClick={() => handleDelete(t.id)} title="Eliminar"
                                        className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
