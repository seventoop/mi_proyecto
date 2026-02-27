"use client";

import { useState } from "react";
import { Plus, Edit3, Trash2, Home, DollarSign, CheckCircle, Clock, Ban } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { createUnidad, updateUnidad, deleteUnidad, updateUnidadEstado } from "@/lib/actions/unidades";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UnidadesManagerProps {
    manzanaId: string;
    unidades: any[];
    compact?: boolean;
}

const estadoConfig: Record<string, { label: string; icon: any; class: string }> = {
    DISPONIBLE: { label: "Disponible", icon: CheckCircle, class: "bg-brand-orange/10 text-brand-orange border-brand-orange/20" },
    RESERVADA: { label: "Reservada", icon: Clock, class: "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20" },
    VENDIDA: { label: "Vendida", icon: Ban, class: "bg-brand-gray/10 text-brand-gray border-brand-gray/20" },
};

export default function UnidadesManager({ manzanaId, unidades, compact = false }: UnidadesManagerProps) {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        numero: "",
        lote: "",
        superficie: "",
        precio: "",
        estado: "DISPONIBLE",
    });

    const resetForm = () => {
        setForm({ numero: "", lote: "", superficie: "", precio: "", estado: "DISPONIBLE" });
        setEditingId(null);
        setShowForm(false);
        setErrors({});
    };

    const handleEdit = (unidad: any) => {
        setForm({
            numero: unidad.numero,
            lote: unidad.lote || "",
            superficie: unidad.superficie?.toString() || "",
            precio: unidad.precio?.toString() || "",
            estado: unidad.estado || "DISPONIBLE",
        });
        setEditingId(unidad.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        setErrors({});
        const newErrors: Record<string, string> = {};
        if (!form.numero.trim()) newErrors.numero = "Requerido";
        if (!form.superficie) newErrors.superficie = "Requerido";
        if (!form.precio) newErrors.precio = "Requerido";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                numero: form.numero,
                lote: form.lote || undefined,
                superficie: parseFloat(form.superficie),
                precio: parseFloat(form.precio),
                estado: form.estado,
            };

            const result = editingId
                ? await updateUnidad(editingId, payload)
                : await createUnidad({ ...payload, manzanaId });

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
        const deletePromise = deleteUnidad(id).then((res) => {
            if (res.success) {
                router.refresh();
                return "Unidad eliminada";
            }
            throw new Error(res.error || "Error al eliminar unidad");
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando unidad...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const handleChangeEstado = async (id: string, estado: string) => {
        setLoading(true);
        try {
            const result = await updateUnidadEstado(id, estado);
            if (result.success) router.refresh();
            else alert(result.error);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "px-3 py-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Home className="w-4 h-4 text-brand-orange" /> Unidades
                </h5>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-black uppercase tracking-widest hover:bg-brand-orangeDark transition-all flex items-center gap-1 shadow-lg shadow-brand-orange/20"
                >
                    <Plus className="w-3 h-3" /> Nueva
                </button>
            </div>

            {showForm && (
                <div className="p-4 bg-white dark:bg-slate-900/60 rounded-lg border border-brand-orange/20">
                    <h6 className="text-sm font-bold mb-3 text-slate-900 dark:text-white">
                        {editingId ? "Editar Unidad" : "Nueva Unidad"}
                    </h6>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Número *</label>
                            <input
                                type="text"
                                value={form.numero}
                                onChange={(e) => setForm(prev => ({ ...prev, numero: e.target.value }))}
                                placeholder="Ej: 101"
                                className={cn(inputClass, "w-full", errors.numero && "border-rose-400")}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Lote</label>
                            <input
                                type="text"
                                value={form.lote}
                                onChange={(e) => setForm(prev => ({ ...prev, lote: e.target.value }))}
                                placeholder="Ej: 5A"
                                className={cn(inputClass, "w-full")}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Superficie (m²) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.superficie}
                                onChange={(e) => setForm(prev => ({ ...prev, superficie: e.target.value }))}
                                placeholder="0.00"
                                className={cn(inputClass, "w-full", errors.superficie && "border-rose-400")}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Precio (USD) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.precio}
                                onChange={(e) => setForm(prev => ({ ...prev, precio: e.target.value }))}
                                placeholder="0.00"
                                className={cn(inputClass, "w-full", errors.precio && "border-rose-400")}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Estado</label>
                            <select
                                value={form.estado}
                                onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                                className={cn(inputClass, "w-full")}
                            >
                                <option value="DISPONIBLE">Disponible</option>
                                <option value="RESERVADA">Reservada</option>
                                <option value="VENDIDA">Vendida</option>
                            </select>
                        </div>
                    </div>
                    {errors.submit && <p className="text-xs text-rose-400 mt-2">{errors.submit}</p>}
                    <div className="flex gap-2 mt-3">
                        <button onClick={resetForm} className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-medium">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-black uppercase tracking-widest hover:bg-brand-orangeDark disabled:opacity-50 transition-all shadow-lg shadow-brand-orange/20"
                        >
                            {loading ? "..." : "Guardar"}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unidades.map((unidad) => {
                    const estadoInfo = estadoConfig[unidad.estado] || estadoConfig.DISPONIBLE;
                    const Icon = estadoInfo.icon;
                    return (
                        <div key={unidad.id} className="p-3 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 group hover:border-brand-orange/40 transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Home className="w-4 h-4 text-brand-orange" />
                                    <span className="font-bold text-slate-900 dark:text-white">#{unidad.numero}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(unidad)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                                        <Edit3 className="w-3 h-3 text-slate-400" />
                                    </button>
                                    <button onClick={() => handleDelete(unidad.id)} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded">
                                        <Trash2 className="w-3 h-3 text-rose-400" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {unidad.superficie} m² • {formatCurrency(unidad.precio)}
                                </p>
                                <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold", estadoInfo.class)}>
                                    <Icon className="w-3 h-3" />
                                    {estadoInfo.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
