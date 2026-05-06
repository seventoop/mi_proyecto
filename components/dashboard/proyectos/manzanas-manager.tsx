"use client";

import { useState } from "react";
import { Plus, Edit3, Trash2, Save, X, AlertCircle, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createManzana, updateManzana, deleteManzana } from "@/lib/actions/manzanas";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import UnidadesManager from "./unidades-manager";

interface ManzanasManagerProps {
    etapaId: string;
    manzanas: any[];
}

export default function ManzanasManager({ etapaId, manzanas }: ManzanasManagerProps) {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({ nombre: "" });

    const resetForm = () => {
        setForm({ nombre: "" });
        setEditingId(null);
        setShowForm(false);
        setErrors({});
    };

    const handleEdit = (manzana: any) => {
        setForm({ nombre: manzana.nombre });
        setEditingId(manzana.id);
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
            const result = editingId
                ? await updateManzana(editingId, { nombre: form.nombre })
                : await createManzana({ etapaId, nombre: form.nombre });

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
        const deletePromise = deleteManzana(id).then((res) => {
            if (res.success) {
                router.refresh();
                return "Manzana eliminada";
            }
            throw new Error((res as any).error || "Error al eliminar manzana");
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando manzana...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const [selectedManzana, setSelectedManzana] = useState<any | null>(null);

    const inputClass = "w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Grid3x3 className="w-4 h-4 text-brand-500" /> Manzanas
                </h5>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" /> Nueva
                </button>
            </div>

            {/* Modal de Gestión de Unidades */}
            {selectedManzana && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
                    <div className="glass-card w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Unidades: {selectedManzana.nombre}
                                </h3>
                                <p className="text-xs text-slate-500">Gestina las unidades de esta manzana</p>
                            </div>
                            <button
                                onClick={() => setSelectedManzana(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <UnidadesManager
                                manzanaId={selectedManzana.id}
                                unidades={selectedManzana.unidades || []}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-lg border border-brand-500/20">
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(e) => setForm({ nombre: e.target.value })}
                            placeholder="Nombre de la manzana (Ej: Manzana A)"
                            className={cn(inputClass, errors.nombre && "border-rose-400")}
                        />
                        {errors.submit && (
                            <p className="text-xs text-rose-400">{errors.submit}</p>
                        )}
                        <div className="flex gap-2">
                            <button onClick={resetForm} className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-700">
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-3 py-1 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 disabled:opacity-50"
                            >
                                {loading ? "..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {manzanas.map((manzana) => (
                    <div key={manzana.id} className="p-3 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 group hover:border-brand-500/40 transition-all flex flex-col justify-between min-h-[100px]">
                        <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate" title={manzana.nombre}>{manzana.nombre}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(manzana)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                                    <Edit3 className="w-3 h-3 text-slate-400" />
                                </button>
                                <button onClick={() => handleDelete(manzana.id)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded">
                                    <Trash2 className="w-3 h-3 text-rose-400" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <span className="text-xs text-slate-500 block mb-2">
                                {manzana.unidades?.length || 0} unidades
                            </span>
                            <button
                                onClick={() => setSelectedManzana(manzana)}
                                className="w-full py-1.5 text-xs font-medium text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
                            >
                                Gestionar Unidades
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
