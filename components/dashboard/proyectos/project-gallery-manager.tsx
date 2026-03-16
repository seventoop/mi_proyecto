"use client";

import { useState, useEffect } from "react";
import {
    Image as ImageIcon,
    Upload,
    Trash2,
    Star,
    GripVertical,
    Loader2,
    CheckCircle2,
    Download,
    Plus,
    X
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    rectSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    getProyectoImagenes,
    addProyectoImagen,
    deleteProyectoImagen,
    updateProyectoImagenesOrder,
    setMainProyectoImagen
} from "@/lib/actions/proyectos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProyectoImagen {
    id: string;
    proyectoId: string;
    url: string;
    categoria: string;
    esPrincipal: boolean;
    orden: number;
    createdAt: Date | string;
}

interface ProjectGalleryManagerProps {
    proyectoId: string;
}

const CATEGORIES = ["RENDER", "AVANCE_OBRA", "MASTERPLAN", "INTERIOR", "EXTERIOR"];

export default function ProjectGalleryManager({ proyectoId }: ProjectGalleryManagerProps) {
    const [imagenes, setImagenes] = useState<ProyectoImagen[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("RENDER");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadImagenes();
    }, [proyectoId]);

    async function loadImagenes() {
        setLoading(true);
        const res = await getProyectoImagenes(proyectoId);
        if (res.success) {
            setImagenes(res.data);
        }
        setLoading(false);
    }

    const handleExportZip = async () => {
        const toastId = toast.loading("Preparando exportación de galería...");
        try {
            window.location.href = `/api/export/projects/${proyectoId}/gallery-zip`;
            toast.success("Iniciando descarga de ZIP", { id: toastId });
        } catch (error) {
            toast.error("Error al exportar galería", { id: toastId });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        const toastId = toast.loading(`Importando 0 de ${files.length} imágenes...`);

        try {
            let count = 0;
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const uploadData = await res.json();
                if (!uploadData.success) throw new Error(uploadData.error);

                await addProyectoImagen({
                    proyectoId,
                    url: uploadData.url,
                    categoria: selectedCategory,
                    orden: imagenes.length + count
                });

                count++;
                toast.loading(`Importando ${count} de ${files.length} imágenes...`, { id: toastId });
            }
            toast.success("Imágenes importadas correctamente", { id: toastId });
            loadImagenes();
        } catch (error: any) {
            toast.error(error.message || "Error al importar imágenes", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setImagenes((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Update order in DB
                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    orden: index
                }));
                updateProyectoImagenesOrder(updates, proyectoId);

                return newItems;
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta imagen de la galería?")) return;
        const res = await deleteProyectoImagen(id, proyectoId);
        if (res.success) {
            setImagenes(prev => prev.filter(img => img.id !== id));
            toast.success("Imagen eliminada");
        }
    };

    const handleSetMain = async (id: string) => {
        const res = await setMainProyectoImagen(id, proyectoId);
        if (res.success) {
            setImagenes(prev => prev.map(img => ({
                ...img,
                esPrincipal: img.id === id
            })));
            toast.success("Imagen principal actualizada");
        }
    };

    if (loading && imagenes.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-brand-500" />
                            Gestión de Medios
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                            Importa imágenes y exporta la galería completa
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                            <label className={cn(
                                "cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20",
                                uploading && "opacity-50 pointer-events-none"
                            )}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? "Importando..." : "Importar"}
                                <input type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                            </label>

                            {imagenes.length > 0 && (
                                <button
                                    onClick={handleExportZip}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Exportar ZIP
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={imagenes.map(i => i.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {imagenes.map((img) => (
                                <SortableImage
                                    key={img.id}
                                    img={img}
                                    onDelete={handleDelete}
                                    onSetMain={handleSetMain}
                                />
                            ))}
                            {imagenes.length === 0 && !uploading && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm text-slate-400">La galería está vacía</p>
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}

function SortableImage({ img, onDelete, onSetMain }: {
    img: ProyectoImagen;
    onDelete: (id: string) => void;
    onSetMain: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: img.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 transition-all",
                isDragging && "shadow-2xl scale-105 opacity-80 ring-2 ring-brand-500",
                img.esPrincipal && "ring-2 ring-brand-500"
            )}
        >
            <img
                src={img.url}
                alt={img.categoria}
                className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between items-start">
                    <div {...attributes} {...listeners} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg cursor-grab active:cursor-grabbing transition-colors">
                        <GripVertical className="w-4 h-4 text-white" />
                    </div>
                    <button
                        onClick={() => onDelete(img.id)}
                        className="p-1.5 bg-rose-500/20 hover:bg-rose-500/80 rounded-lg text-white transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="px-2 py-0.5 bg-black/60 rounded text-[9px] font-black text-white uppercase tracking-widest w-fit">
                        {img.categoria.replace("_", " ")}
                    </div>
                    <button
                        onClick={() => onSetMain(img.id)}
                        className={cn(
                            "w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all",
                            img.esPrincipal
                                ? "bg-brand-500 text-white"
                                : "bg-white/20 hover:bg-white/80 text-white hover:text-slate-900"
                        )}
                    >
                        <Star className={cn("w-3 h-3", img.esPrincipal && "fill-current")} />
                        {img.esPrincipal ? "PRINCIPAL" : "HACER PRINCIPAL"}
                    </button>
                </div>
            </div>

            {img.esPrincipal && (
                <div className="absolute top-2 left-2 p-1.5 bg-brand-500 text-white rounded-lg shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                </div>
            )}
        </div>
    );
}
