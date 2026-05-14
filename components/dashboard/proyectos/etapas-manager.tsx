"use client";

import { useState } from "react";
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, Package, X, Save, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createEtapa, updateEtapa, deleteEtapa } from "@/lib/actions/etapas";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ManzanasManager from "./manzanas-manager";

interface EtapasManagerProps {
    proyectoId: string;
    etapas: any[];
}

export default function EtapasManager({ proyectoId, etapas }: EtapasManagerProps) {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());

    const [form, setForm] = useState({
        nombre: "",
        descripcion: "",
        orden: "",
    });

    const resetForm = () => {
        setForm({ nombre: "", descripcion: "", orden: "" });
        setEditingId(null);
        setShowForm(false);
        setErrors({});
    };

    const handleEdit = (etapa: any) => {
        setForm({
            nombre: etapa.nombre,
            descripcion: etapa.descripcion || "",
            orden: etapa.orden?.toString() || "",
        });
        setEditingId(etapa.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        setErrors({});
        if (!form.nombre.trim()) {
            setErrors({ nombre: "El nombre es obligatorio" });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre,
                descripcion: form.descripcion || undefined,
                orden: form.orden ? parseInt(form.orden) : undefined,
            };

            const result = editingId
                ? await updateEtapa(editingId, payload)
                : await createEtapa({ ...payload, proyectoId });

            if (result.success) {
                router.refresh();
                resetForm();
            } else {
                setErrors({ submit: result.error || "Error al guardar" });
            }
        } catch (e: any) {
            setErrors({ submit: e.message || "Error inesperado" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const deletePromise = deleteEtapa(id).then((res) => {
            if (res.success) {
                router.refresh();
                return "Etapa eliminada";
            }
            throw new Error(res.error || "Error al eliminar etapa");
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando etapa...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedEtapas);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedEtapas(newExpanded);
    };

    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-900 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-brand-500" />
                    Etapas del Proyecto
                </h3>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nueva Etapa
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="glass-card p-6 border-2 border-brand-500/20 animate-slide-down">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-900 dark:text-white">
                            {editingId ? "Editar Etapa" : "Nueva Etapa"}
                        </h4>
                        <button onClick={resetForm} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Nombre de la Etapa *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Ej: Etapa 1"
                                className={cn(inputClass, errors.nombre && "border-rose-400")}
                            />
                            {errors.nombre && <span className="text-xs text-rose-400 mt-1 block">{errors.nombre}</span>}
                        </div>

                        <div>
                            <label className={labelClass}>Descripción</label>
                            <textarea
                                value={form.descripcion}
                                onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                placeholder="Descripción opcional..."
                                rows={2}
                                className={inputClass}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>Orden</label>
                            <input
                                type="number"
                                value={form.orden}
                                onChange={(e) => setForm(prev => ({ ...prev, orden: e.target.value }))}
                                placeholder="Se asigna automáticamente"
                                className={inputClass}
                            />
                        </div>

                        {errors.submit && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {errors.submit}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={resetForm}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-4 py-2 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {etapas.length === 0 ? (
                    <div className="glass-card p-8 text-center text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay etapas creadas aún</p>
                        <p className="text-xs mt-1">Crea la primera etapa para organizar tu proyecto</p>
                    </div>
                ) : (
                    etapas.map((etapa) => (
                        <div key={etapa.id} className="glass-card overflow-hidden">
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <button
                                        onClick={() => toggleExpand(etapa.id)}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        {expandedEtapas.has(etapa.id) ? (
                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 dark:text-white">{etapa.nombre}</h4>
                                        {etapa.descripcion && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{etapa.descripcion}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                            Orden: {etapa.orden}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500 font-bold">
                                            {etapa.manzanas?.length || 0} Manzanas
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => handleEdit(etapa)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(etapa.id)}
                                        className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-rose-400" />
                                    </button>
                                </div>
                            </div>

                            {expandedEtapas.has(etapa.id) && etapa.manzanas && (
                                <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 pt-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                        {etapa.manzanas.length} manzanas en esta etapa
                                    </p>
                                    <ManzanasManager
                                        etapaId={etapa.id}
                                        manzanas={etapa.manzanas || []}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
