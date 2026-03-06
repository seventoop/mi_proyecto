"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Trash2, Star, MessageSquareQuote, Building, User } from "lucide-react";
import { getTestimoniosAdmin, updateTestimonioStatus, deleteTestimonio } from "@/lib/actions/testimonios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Moderación de Testimonios
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Revisa y aprueba las opiniones de los usuarios para mostrarlas en la web.
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {["PENDIENTE", "APROBADO", "RECHAZADO", "TODOS"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                filter === f
                                    ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />)}
                </div>
            ) : filteredTestimonios.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <MessageSquareQuote className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No hay testimonios en esta categoría.</p>
                </div>
            ) : (
                <div className="masonry-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTestimonios.map((t) => (
                        <div key={t.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                                        t.autorTipo === "EMPRESA" ? "bg-indigo-500" : "bg-brand-500"
                                    )}>
                                        {t.autorTipo === "EMPRESA" ? <Building className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{t.autorNombre}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{t.autorTipo.toLowerCase()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={cn("w-3 h-3", i < (t.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700")} />
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 mb-6 relative">
                                <MessageSquareQuote className="absolute -top-2 -left-2 w-6 h-6 text-brand-100 dark:text-brand-900/30 -z-10" />
                                <p className="text-slate-600 dark:text-slate-300 text-sm italic leading-relaxed">"{t.texto}"</p>
                                {t.proyecto && (
                                    <div className="mt-3 inline-block px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        Proy: {t.proyecto.nombre}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                <span className={cn(
                                    "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                                    t.estado === "APROBADO" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                        t.estado === "RECHAZADO" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" :
                                            "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                )}>
                                    {t.estado}
                                </span>

                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t.estado === "PENDIENTE" && (
                                        <>
                                            <button onClick={() => handleStatusChange(t.id, "APROBADO")} title="Aprobar"
                                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleStatusChange(t.id, "RECHAZADO")} title="Rechazar"
                                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {t.estado === "RECHAZADO" && (
                                        <button onClick={() => handleStatusChange(t.id, "APROBADO")} title="Aprobar"
                                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    {t.estado === "APROBADO" && (
                                        <button onClick={() => handleStatusChange(t.id, "PENDIENTE")} title="Pausar/Revisar"
                                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg">
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                                    <button onClick={() => handleDelete(t.id)} title="Eliminar"
                                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg">
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
