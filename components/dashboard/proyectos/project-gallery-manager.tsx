"use client";

import { useState, useEffect } from "react";
import {
    Image as ImageIcon,
    Upload,
    Trash2,
    Star,
    GripVertical,
    Loader2,
    Download,
    Plus,
} from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    getProyectoImagenes,
    addProyectoImagen,
    deleteProyectoImagen,
    updateProyectoImagenesOrder,
    setMainProyectoImagen,
    updateProyectoImagen,
} from "@/lib/actions/proyectos";
import { createTour, getProjectTours, updateTour } from "@/lib/actions/tours";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    galleryCategoryToSceneCategory,
    normalizeGalleryCategory,
    sceneCategoryToGalleryCategory,
} from "@/lib/tour-media";
import TourSceneOverlayEditor from "@/components/tour360/tour-scene-overlay-editor";
import TourCreator from "@/components/tour360/tour-creator";
import type { Scene } from "@/components/tour360/tour-viewer";

interface ProyectoImagen {
    id: string;
    proyectoId: string;
    url: string;
    categoria: string;
    esPrincipal: boolean;
    orden: number;
    createdAt: Date | string;
    masterplanOverlay?: any;
}

interface TourSaveOptions {
    keepEditing?: boolean;
    successMessage?: string;
    suppressSuccessToast?: boolean;
    targetSceneId?: string;
}

interface ProjectGalleryManagerProps {
    proyectoId: string;
}

const CATEGORIES = ["MASTERPLAN", "EXTERIOR", "INTERIOR", "RENDER", "AVANCE_OBRA"] as const;

function galleryImageToScene(img: ProyectoImagen): Scene {
    const category = galleryCategoryToSceneCategory(img.categoria);

    return {
        id: img.id,
        title: img.categoria?.replaceAll("_", " ") || "Imagen",
        imageUrl: img.url,
        thumbnailUrl: img.url,
        hotspots: [],
        category,
        galleryImageId: img.id,
        masterplanOverlay: img.masterplanOverlay || { isVisible: true, opacity: 0.55 },
    } as Scene;
}

export default function ProjectGalleryManager({ proyectoId }: ProjectGalleryManagerProps) {
    const [imagenes, setImagenes] = useState<ProyectoImagen[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("MASTERPLAN");
    const [editingImage, setEditingImage] = useState<ProyectoImagen | null>(null);
    const [showSceneEditor, setShowSceneEditor] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isSavingImageEditor, setIsSavingImageEditor] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        void loadImagenes();
    }, [proyectoId]);

    async function loadImagenes() {
        setLoading(true);
        const res = await getProyectoImagenes(proyectoId);
        if (res.success) {
            setImagenes((res.data ?? []).map((img: any) => ({ ...img, categoria: normalizeGalleryCategory(img.categoria) })));
        }
        setLoading(false);
    }

    const handleExportZip = async () => {
        const toastId = toast.loading("Preparando exportación de galería...");
        try {
            window.location.href = `/api/export/projects/${proyectoId}/gallery-zip`;
            toast.success("Iniciando descarga de ZIP", { id: toastId });
        } catch {
            toast.error("Error al exportar galería", { id: toastId });
        }
    };

    const handleImportClick = () => {
        setShowImportModal(true);
    };

    const handleSaveGalleryImage = async (scene: Scene) => {
        try {
            const categoria = sceneCategoryToGalleryCategory(scene.category, selectedCategory);

            if (scene.galleryImageId) {
                const res = await updateProyectoImagen(scene.galleryImageId, {
                    proyectoId,
                    url: scene.imageUrl,
                    categoria,
                    masterplanOverlay: scene.masterplanOverlay,
                });

                if (!res.success || !res.data) {
                    return { success: false };
                }

                await loadImagenes();

                return {
                    success: true,
                    data: {
                        ...scene,
                        id: res.data.id,
                        galleryImageId: res.data.id,
                        category: galleryCategoryToSceneCategory(res.data.categoria),
                    } as Scene,
                };
            }

            const res = await addProyectoImagen({
                proyectoId,
                url: scene.imageUrl,
                categoria,
                masterplanOverlay: scene.masterplanOverlay,
            });

            if (!res.success || !res.data) {
                return { success: false };
            }

            await loadImagenes();

            return {
                success: true,
                data: {
                    ...scene,
                    id: res.data.id,
                    galleryImageId: res.data.id,
                    category: galleryCategoryToSceneCategory(res.data.categoria),
                } as Scene,
            };
        } catch (error) {
            console.error("Gallery save error:", error);
            return { success: false };
        }
    };

    const handleImportSave = async (scenes: Scene[], options?: TourSaveOptions) => {
        const toastId = toast.loading("Guardando en Galería...");
        try {
            const targetSceneId = options?.targetSceneId;
            const scenesToSave = targetSceneId
                ? scenes.filter((scene) => scene.id === targetSceneId)
                : scenes;

            const nextScenes = scenes.map((scene) => ({ ...scene }));

            for (const scene of scenesToSave) {
                const categoria = sceneCategoryToGalleryCategory(scene.category, selectedCategory);

                if (scene.galleryImageId) {
                    const res = await updateProyectoImagen(scene.galleryImageId, {
                        proyectoId,
                        url: scene.imageUrl,
                        categoria,
                        masterplanOverlay: scene.masterplanOverlay,
                    });

                    if (!res.success) {
                        throw new Error((res as any).error || "Error al actualizar imagen en galería");
                    }
                } else {
                    const res = await addProyectoImagen({
                        proyectoId,
                        url: scene.imageUrl,
                        categoria,
                        masterplanOverlay: scene.masterplanOverlay,
                    });

                    if (!res.success || !res.data) {
                        throw new Error((res as any).error || "Error al guardar imagen en galería");
                    }

                    const index = nextScenes.findIndex((s) => s.id === scene.id);
                    if (index !== -1) {
                        nextScenes[index] = {
                            ...nextScenes[index],
                            id: res.data.id,
                            galleryImageId: res.data.id,
                            category: galleryCategoryToSceneCategory(res.data.categoria),
                        };
                    }
                }
            }

            await loadImagenes();
            toast.success(options?.successMessage || "Imágenes guardadas en Galería", { id: toastId });

            if (!targetSceneId) {
                setShowImportModal(false);
            }

            return { success: true, scenes: nextScenes };
        } catch (error: any) {
            toast.error(error.message || "Error al guardar en galería", { id: toastId });
            return false;
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setImagenes((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                const updates = newItems.map((item, index) => ({
                    id: item.id,
                    orden: index,
                }));

                void updateProyectoImagenesOrder(updates, proyectoId);
                return newItems;
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar esta imagen de la galería?")) return;
        const res = await deleteProyectoImagen(id, proyectoId);
        if (res.success) {
            setImagenes((prev) => prev.filter((img) => img.id !== id));
            toast.success("Imagen eliminada");
        }
    };

    const handleSetMain = async (id: string) => {
        const res = await setMainProyectoImagen(id, proyectoId);
        if (res.success) {
            setImagenes((prev) =>
                prev.map((img) => ({
                    ...img,
                    esPrincipal: img.id === id,
                }))
            );
            toast.success("Imagen principal actualizada");
        }
    };

    const handleSendToTour = async (img: ProyectoImagen) => {
        const toastId = toast.loading("Enviando a Tour 360...");
        try {
            const toursRes = await getProjectTours(proyectoId);
            let targetTourId: string | null = null;
            let currentScenes: any[] = [];

            if (toursRes.success && toursRes.data && toursRes.data.length > 0) {
                const biblio =
                    toursRes.data.find((t: any) => String(t.nombre || "").toLowerCase().includes("biblioteca")) ||
                    toursRes.data[0];
                targetTourId = biblio.id;
                currentScenes = biblio.scenes || [];
            }

            const sceneCategory = galleryCategoryToSceneCategory(img.categoria);
            const duplicateScene = currentScenes.find(
                (scene: any) =>
                    scene.galleryImageId === img.id ||
                    scene.masterplanOverlay?.galleryImageId === img.id
            );

            if (duplicateScene) {
                toast.info("Esta imagen ya fue enviada a Tour 360 y Biblioteca", { id: toastId });
                return;
            }

            const newScene = {
                title: img.categoria?.replaceAll("_", " ") || "Imagen de galería",
                imageUrl: img.url,
                thumbnailUrl: img.url,
                category: sceneCategory,
                galleryImageId: img.id,
                masterplanOverlay: {
                    ...(img.masterplanOverlay ?? {}),
                    galleryImageId: img.id,
                },
                hotspots: [],
            };

            if (targetTourId) {
                await updateTour(targetTourId, {
                    nombre: "Tour 360 y Biblioteca",
                    scenes: [...currentScenes.map((s: any) => ({ ...s, hotspots: s.hotspots || [] })), newScene],
                });
            } else {
                await createTour({
                    proyectoId,
                    nombre: "Tour 360 y Biblioteca",
                    scenes: [newScene],
                });
            }

            toast.success("Imagen enviada a Tour 360 y Biblioteca", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Error al enviar a tour", { id: toastId });
        }
    };

    const handleSaveImageEditor = async (overlay: any) => {
        if (!editingImage || isSavingImageEditor) return;

        setIsSavingImageEditor(true);
        try {
            const res = await updateProyectoImagen(editingImage.id, {
                proyectoId,
                masterplanOverlay: overlay,
            });

            if (!res.success) {
                throw new Error((res as any).error || "Error al guardar edición en galería");
            }

            toast.success("Edición guardada en Galería");
            await loadImagenes();
            setShowSceneEditor(false);
            setEditingImage(null);
        } catch (error: any) {
            toast.error(error.message || "Error al guardar edición en galería");
        } finally {
            setIsSavingImageEditor(false);
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
                        <p className="text-xs text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                            Importa imágenes y exporta la galería completa
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(normalizeGalleryCategory(e.target.value))}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {c.replace("_", " ")}
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleImportClick}
                                className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                Cargar imágenes
                            </button>

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

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={imagenes.map((i) => i.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {imagenes.map((img) => (
                                <SortableImage
                                    key={img.id}
                                    img={img}
                                    onDelete={handleDelete}
                                    onSetMain={handleSetMain}
                                    onEdit={(img) => {
                                        setEditingImage(img);
                                        setShowSceneEditor(true);
                                    }}
                                    onSendToTour={handleSendToTour}
                                />
                            ))}

                            {imagenes.length === 0 && (
                                <div
                                    onClick={handleImportClick}
                                    className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-500/5 rounded-2xl cursor-pointer transition-all group"
                                >
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300 group-hover:text-brand-500 transition-colors" />
                                    <p className="text-sm text-slate-400 group-hover:text-brand-500 transition-colors font-medium">
                                        Hacé clic para cargar imágenes a la galería
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Podrás definir título y categoría para cada una.
                                    </p>
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {showSceneEditor && editingImage && (
                <TourSceneOverlayEditor
                    proyectoId={proyectoId}
                    scene={{
                        id: editingImage.id,
                        title: editingImage.categoria,
                        imageUrl: editingImage.url,
                        masterplanOverlay: editingImage.masterplanOverlay || {
                            isVisible: true,
                            opacity: 0.55,
                        },
                    }}
                    units={[] as any}
                    overlayBounds={[[0, 0], [0, 0]] as any}
                    overlayRotation={0}
                    svgViewBox={{ minX: 0, minY: 0, width: 0, height: 0 } as any}
                    planGalleryItems={[]}
                    projectScenes={[]}
                    onClose={() => {
                        if (isSavingImageEditor) return;
                        setShowSceneEditor(false);
                        setEditingImage(null);
                    }}
                    saveMode="parent-controlled"
                    onSaved={handleSaveImageEditor}
                />
            )}

            {showImportModal && (
                <TourCreator
                    proyectoId={proyectoId}
                    initialScenes={imagenes.map(galleryImageToScene)}
                    onSaveGalleryImage={handleSaveGalleryImage}
                    onSave={handleImportSave}
                    onClose={() => setShowImportModal(false)}
                />
            )}
        </div>
    );
}

function SortableImage({
    img,
    onDelete,
    onSetMain,
    onEdit,
    onSendToTour,
}: {
    img: ProyectoImagen;
    onDelete: (id: string) => void;
    onSetMain: (id: string) => void;
    onEdit: (img: ProyectoImagen) => void;
    onSendToTour: (img: ProyectoImagen) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
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
            <img src={img.url} alt={img.categoria} className="w-full h-full object-cover" />

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col p-2">
                <div className="flex justify-between items-start">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                    >
                        <GripVertical className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => onEdit(img)}
                            className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500/80 rounded-lg text-white transition-colors"
                            title="Editar imagen"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(img.id)}
                            className="p-1.5 bg-rose-500/20 hover:bg-rose-500/80 rounded-lg text-white transition-colors"
                            title="Eliminar imagen"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-1.5">
                    <button
                        onClick={() => onSendToTour(img)}
                        className="w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Mandar a Tour
                    </button>

                    <div className="flex gap-1">
                        <div className="px-2 py-1 bg-black/60 rounded text-[9px] font-black text-white uppercase tracking-widest truncate flex-1">
                            {img.categoria.replaceAll("_", " ")}
                        </div>
                        <button
                            onClick={() => onSetMain(img.id)}
                            className={cn(
                                "px-2 py-1 rounded text-[9px] font-black transition-all",
                                img.esPrincipal
                                    ? "bg-brand-500 text-white"
                                    : "bg-white/20 hover:bg-white/80 text-white hover:text-slate-900"
                            )}
                            title="Marcar como principal"
                        >
                            <Star className={cn("w-3 h-3", img.esPrincipal && "fill-current")} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
