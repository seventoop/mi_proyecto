"use client";

import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, XCircle, Star, User, Building2, Quote, Trash2 } from "lucide-react";
import { getTestimoniosAdmin, moderarTestimonio, deleteTestimonio } from "@/lib/actions/testimonios";
import { cn } from "@/lib/utils";

export default function TestimoniosPage() {
    const [testimonios, setTestimonios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleModerate = async (id: string, status: "APROBADO" | "RECHAZADO") => {
        await moderarTestimonio({ id, estado: status });
        fetchTestimonios();
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar este testimonio permanentemente?")) {
            await deleteTestimonio(id);
            fetchTestimonios();
        }
    }

    const Column = ({ title, status, icon: Icon, colorClass }: any) => {
        const items = testimonios.filter(t => t.estado === status);

        return (
            <div className="flex-1 min-w-[300px] flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                <div className={cn("p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between rounded-t-2xl", colorClass)}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <Icon className="w-4 h-4" />
                        {title}
                    </div>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs font-bold">{items.length}</span>
                </div>

                <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin">
                    {items.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Quote className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No hay testimonios</p>
                        </div>
                    ) : (
                        items.map((t) => (
                            <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        {t.autorTipo === "EMPRESA" ? <Building2 className="w-4 h-4 text-brand-500" /> : <User className="w-4 h-4 text-slate-500" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{t.autorNombre}</h4>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={cn("w-3 h-3", i < (t.rating || 5) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200 dark:text-slate-700")} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <blockquote className="text-xs text-slate-600 dark:text-slate-300 italic mb-3 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                    "{t.texto}"
                                </blockquote>

                                {t.proyecto && (
                                    <div className="mb-3 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded w-fit">
                                        Sobre: <span className="font-medium text-slate-600 dark:text-slate-300">{t.proyecto.nombre}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors mr-auto">
                                        <Trash2 className="w-4 h-4" />
                                    </button>

                                    {status !== "APROBADO" && (
                                        <button onClick={() => handleModerate(t.id, "APROBADO")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg text-xs font-medium transition-all">
                                            <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                                        </button>
                                    )}

                                    {status !== "RECHAZADO" && (
                                        <button onClick={() => handleModerate(t.id, "RECHAZADO")}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-lg text-xs font-medium transition-all">
                                            <XCircle className="w-3.5 h-3.5" /> Rechazar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 h-[calc(100vh-64px)] flex flex-col max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex flex-col mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Moderación de Testimonios</h1>
                <p className="text-slate-500 dark:text-slate-400">Revisa y aprueba las reseñas de clientes y desarrolladores.</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-3 gap-6 h-full">
                    {[1, 2, 3].map(i => <div key={i} className="h-full bg-slate-100 dark:bg-slate-800/30 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                    <Column title="Pendientes" status="PENDIENTE" icon={MessageSquare} colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" />
                    <Column title="Aprobados" status="APROBADO" icon={CheckCircle} colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" />
                    <Column title="Rechazados" status="RECHAZADO" icon={XCircle} colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" />
                </div>
            )}
        </div>
    );
}
