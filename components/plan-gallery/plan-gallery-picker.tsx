"use client";

import { useEffect, useState, useRef } from "react";
import { ImageIcon, Upload, Trash2, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface PlanGalleryItem {
    id: string;
    nombre: string;
    imageUrl: string;
    tipo: "render" | "croquis" | "subdivision" | "catastral" | "otro";
    uploadedAt: string;
}

interface PlanGalleryPickerProps {
    proyectoId: string;
    items: PlanGalleryItem[];
    selectedId?: string | null;
    onSelect: (item: PlanGalleryItem) => void;
    onItemsChange?: (items: PlanGalleryItem[]) => void;
    /** If true shows upload UI. Default true. */
    allowUpload?: boolean;
    /** If true shows delete buttons. Default true. */
    allowDelete?: boolean;
}

const TIPO_LABELS: Record<PlanGalleryItem["tipo"], string> = {
    render: "Render",
    croquis: "Croquis",
    subdivision: "Subdivisión",
    catastral: "Catastral",
    otro: "Otro",
};

export default function PlanGalleryPicker({
    proyectoId,
    items: initialItems,
    selectedId,
    onSelect,
    onItemsChange,
    allowUpload = true,
    allowDelete = true,
}: PlanGalleryPickerProps) {
    const [items, setItems] = useState<PlanGalleryItem[]>(initialItems);
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadName, setUploadName] = useState("");
    const [uploadTipo, setUploadTipo] = useState<PlanGalleryItem["tipo"]>("render");
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const updateItems = (next: PlanGalleryItem[]) => {
        setItems(next);
        onItemsChange?.(next);
    };

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setUploadName(file.name.replace(/\.[^.]+$/, ""));
        setShowUploadForm(true);
    };

    const handleUpload = async () => {
        if (!pendingFile) return;
        setIsUploading(true);
        try {
            const form = new FormData();
            form.append("file", pendingFile);
            form.append("nombre", uploadName || pendingFile.name);
            form.append("tipo", uploadTipo);

            const res = await fetch(`/api/proyectos/${proyectoId}/plan-gallery`, {
                method: "POST",
                body: form,
            });
            if (!res.ok) throw new Error("Error al subir");
            const { item } = await res.json();
            const next = [...items, item];
            updateItems(next);
            toast.success("Plano agregado a la galería");
            setShowUploadForm(false);
            setPendingFile(null);
            setUploadName("");
            if (fileRef.current) fileRef.current.value = "";
        } catch {
            toast.error("No se pudo subir el plano");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (planId: string) => {
        try {
            const res = await fetch(`/api/proyectos/${proyectoId}/plan-gallery?planId=${planId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error();
            const next = items.filter(i => i.id !== planId);
            updateItems(next);
            toast.success("Plano eliminado");
        } catch {
            toast.error("No se pudo eliminar");
        }
    };

    return (
        <div className="space-y-3">
            {/* Gallery grid */}
            {items.length === 0 ? (
                <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                    <ImageIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">No hay planos en la galería</p>
                    {allowUpload && (
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                            Subir el primer plano
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={cn(
                                "group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
                                selectedId === item.id
                                    ? "border-indigo-500 shadow-lg shadow-indigo-500/20"
                                    : "border-slate-700/50 hover:border-slate-500"
                            )}
                            onClick={() => onSelect(item)}
                        >
                            <div className="aspect-video bg-slate-800 relative">
                                <img
                                    src={item.imageUrl}
                                    alt={item.nombre}
                                    className="w-full h-full object-cover"
                                />
                                {selectedId === item.id && (
                                    <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                        <Check className="w-8 h-8 text-white drop-shadow" />
                                    </div>
                                )}
                                {allowDelete && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg text-rose-400 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="px-2 py-1.5 bg-slate-900">
                                <p className="text-xs font-semibold text-white truncate">{item.nombre}</p>
                                <p className="text-[10px] text-slate-500">{TIPO_LABELS[item.tipo]}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload form */}
            {showUploadForm && pendingFile && (
                <div className="bg-slate-800 rounded-xl p-3 space-y-2 border border-slate-700">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white">Agregar plano</p>
                        <button onClick={() => { setShowUploadForm(false); setPendingFile(null); }} className="text-slate-400 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <input
                        value={uploadName}
                        onChange={e => setUploadName(e.target.value)}
                        placeholder="Nombre del plano"
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                        value={uploadTipo}
                        onChange={e => setUploadTipo(e.target.value as PlanGalleryItem["tipo"])}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                        {Object.entries(TIPO_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all"
                    >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {isUploading ? "Subiendo..." : "Confirmar y subir"}
                    </button>
                </div>
            )}

            {/* Upload button */}
            {allowUpload && !showUploadForm && (
                <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-300 text-xs font-semibold transition-all"
                >
                    <Upload className="w-3.5 h-3.5" /> Subir nuevo plano
                </button>
            )}
            <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.dxf,.svg"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
