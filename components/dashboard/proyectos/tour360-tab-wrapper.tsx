"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    ImageIcon,
    Info,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock,
} from "lucide-react";
import {
    createTour,
    getProjectTours,
    updateTour,
    deleteTour,
    approveTour,
    rejectTour,
    publishTour360,
    unpublishTour360,
} from "@/lib/actions/tours";
import {
    addProyectoImagen,
    deleteProyectoImagen,
    getProyectoImagenes,
    updateProyectoImagen,
} from "@/lib/actions/proyectos";
import TourCreator from "@/components/tour360/tour-creator";
import TourViewer from "@/components/tour360/tour-viewer";
import { Scene } from "@/components/tour360/tour-viewer";
import { toast } from "sonner";
import {
    galleryCategoryToSceneCategory,
    isTour360Category,
    sceneCategoryToGalleryCategory,
    toStoredTourSceneCategory,
} from "@/lib/tour-media";

interface Tour360TabWrapperProps {
    proyectoId: string;
    tours: any[];
    userRole: string;
}

interface SaveTourOptions {
    keepEditing?: boolean;
    successMessage?: string;
    suppressSuccessToast?: boolean;
    targetSceneId?: string;
}

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

function galleryImageToScene(img: ProyectoImagen): Scene {
    const category = galleryCategoryToSceneCategory(img.categoria);
    const overlay = img.masterplanOverlay as any;

    return {
        id: img.id,
        title: overlay?.title || img.categoria?.replaceAll("_", " ") || "Imagen",
        direction: overlay?.direction || undefined,
        imageUrl: img.url,
        thumbnailUrl: img.url,
        hotspots: [],
        category,
        galleryImageId: img.id,
        masterplanOverlay: img.masterplanOverlay || { isVisible: true, opacity: 0.55 },
    } as Scene;
}

function hydrateTourScenesForEditor(tour: any): Scene[] {
    return (tour.scenes || []).map((s: any) => ({
        ...s,
        hotspots: s.hotspots || [],
        polygons: s.masterplanOverlay?.polygons || s.polygons || [],
        floatingLabels: s.masterplanOverlay?.floatingLabels || s.floatingLabels || [],
        frames: s.masterplanOverlay?.frames || s.frames || [],
        images: s.masterplanOverlay?.images || s.images || [],
        category: s.category || "tour360",
    }));
}

export default function Tour360TabWrapper({
    proyectoId,
    tours: initialTours,
    userRole,
}: Tour360TabWrapperProps) {
    const router = useRouter();
    const [tours, setTours] = useState(initialTours || []);
    const [viewMode, setViewMode] = useState<"LIST" | "EDIT" | "VIEW" | "CREATE">("LIST");

    const [activeTour, setActiveTour] = useState<any | null>(null);
    const [editorScenes, setEditorScenes] = useState<Scene[]>([]);
    const [tourName, setTourName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingGallery, setIsLoadingGallery] = useState(false);

    useEffect(() => {
        setTours(initialTours || []);
    }, [initialTours]);

    const loadGalleryScenes = async () => {
        setIsLoadingGallery(true);
        try {
            const res = await getProyectoImagenes(proyectoId);
            if (!res.success) {
                throw new Error("No se pudo cargar la Galería de Imágenes");
            }
            const galleryScenes = (res.data ?? []).map((img: any) =>
                galleryImageToScene(img)
            );
            setEditorScenes(galleryScenes);
            return galleryScenes;
        } catch (error: any) {
            toast.error(error.message || "No se pudo cargar la Galería de Imágenes");
            setEditorScenes([]);
            return [];
        } finally {
            setIsLoadingGallery(false);
        }
    };

    const handleCreateClick = async () => {
        setActiveTour(null);
        setTourName("");
        setViewMode("CREATE");
        await loadGalleryScenes();
    };

    const handleEditClick = (tour: any) => {
        const hydratedScenes = hydrateTourScenesForEditor(tour);
        setEditorScenes(hydratedScenes);
        setTourName(tour.nombre);
        setActiveTour(tour);
        setViewMode("EDIT");
    };

    const handleViewClick = (tour: any) => {
        const viewableScenes = (tour.scenes || [])
            .filter((scene: any) => isTour360Category(scene))
            .map((s: any) => ({
                ...s,
                polygons: s.masterplanOverlay?.polygons || s.polygons || [],
                floatingLabels: s.masterplanOverlay?.floatingLabels || s.floatingLabels || [],
                frames: s.masterplanOverlay?.frames || s.frames || [],
                images: s.masterplanOverlay?.images || s.images || [],
            }));
        setEditorScenes(viewableScenes);
        setActiveTour(tour);
        setViewMode("VIEW");
    };

    const handleDeleteClick = async (tourId: string) => {
        const deletePromise = deleteTour(tourId).then((res) => {
            if (res.success) {
                setTours((prev) => prev.filter((tour) => tour.id !== tourId));

                if (activeTour?.id === tourId) {
                    setActiveTour(null);
                    setEditorScenes([]);
                    setTourName("");
                    setViewMode("LIST");
                }

                router.refresh();
                return "Tour eliminado";
            }

            throw new Error((res as any).error || "Error al eliminar el tour");
        });

        toast.promise(deletePromise, {
            loading: "Eliminando tour...",
            success: (data) => data,
            error: (err) => err.message,
        });
    };

    const handleSaveGalleryImage = async (scene: Scene) => {
        try {
            const categoria = sceneCategoryToGalleryCategory(scene.category, "EXTERIOR");

            if (scene.galleryImageId) {
                const res = await updateProyectoImagen(scene.galleryImageId, {
                    proyectoId,
                    url: scene.imageUrl,
                    categoria,
                    masterplanOverlay: scene.masterplanOverlay,
                });

                if (!res.success || !res.data) {
                    return { success: false, error: (res as any).error || "Update failed" };
                }

                const nextScene = {
                    ...scene,
                    category: galleryCategoryToSceneCategory(res.data.categoria),
                } as Scene;

                setEditorScenes((prev) => {
                    const idx = prev.findIndex((item) => item.id === scene.id);
                    if (idx !== -1) return prev.map((item) => (item.id === scene.id ? nextScene : item));
                    return [...prev, nextScene];
                });
                return { success: true, data: nextScene };
            }

            const res = await addProyectoImagen({
                proyectoId,
                url: scene.imageUrl,
                categoria,
                masterplanOverlay: scene.masterplanOverlay,
            });

            if (!res.success || !res.data) {
                return { success: false, error: (res as any).error || "Add failed" };
            }

            const nextScene = {
                ...scene,
                id: res.data.id,
                galleryImageId: res.data.id,
                category: galleryCategoryToSceneCategory(res.data.categoria),
            } as Scene;

            setEditorScenes((prev) => {
                const idx = prev.findIndex((item) => item.id === scene.id);
                if (idx !== -1) return prev.map((item) => (item.id === scene.id ? nextScene : item));
                return [...prev, nextScene];
            });

            return { success: true, data: nextScene };
        } catch (error) {
            console.error("Gallery save error:", error);
            return { success: false };
        }
    };

    const handleSaveGalleryScenes = async (scenes: Scene[], options: SaveTourOptions = {}) => {
        const toastId = toast.loading("Guardando en Galería de Imágenes...");
        try {
            const targetSceneId = options.targetSceneId;
            const scenesToSave = targetSceneId ? scenes.filter((scene) => scene.id === targetSceneId) : scenes;
            const nextScenes = scenes.map((scene) => ({ ...scene }));

            for (const scene of scenesToSave) {
                const categoria = sceneCategoryToGalleryCategory(scene.category, "EXTERIOR");

                if (scene.galleryImageId) {
                    const res = await updateProyectoImagen(scene.galleryImageId, {
                        proyectoId,
                        url: scene.imageUrl,
                        categoria,
                        masterplanOverlay: scene.masterplanOverlay,
                    });

                    if (!res.success) {
                        throw new Error((res as any).error || "Error al actualizar imagen en Galería");
                    }
                } else {
                    const res = await addProyectoImagen({
                        proyectoId,
                        url: scene.imageUrl,
                        categoria,
                        masterplanOverlay: scene.masterplanOverlay,
                    });

                    if (!res.success) {
                        throw new Error((res as any).error || "Error al guardar imagen en Galería");
                    }
                    if (!res.data) {
                        throw new Error("Datos de imagen no devueltos tras guardado");
                    }

                    const index = nextScenes.findIndex((item) => item.id === scene.id);
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

            setEditorScenes(nextScenes);
            toast.success(options.successMessage || "Cambios guardados en Galería de Imágenes", { id: toastId });
            router.refresh();
            return { success: true, scenes: nextScenes };
        } catch (error: any) {
            toast.error(error.message || "Error al guardar en Galería de Imágenes", { id: toastId });
            return false;
        }
    };

    const handleDeleteGalleryImage = async (scene: Scene) => {
        if (!scene.galleryImageId) {
            setEditorScenes((prev) => prev.filter((item) => item.id !== scene.id));
            return true;
        }

        if (!confirm("¿Eliminar esta imagen de la Galería de Imágenes?")) return false;

        const res = await deleteProyectoImagen(scene.galleryImageId, proyectoId);
        if (!res.success) {
            toast.error((res as any).error || "Error al eliminar imagen de la Galería");
            return false;
        }

        setEditorScenes((prev) => prev.filter((item) => item.id !== scene.id));
        toast.success("Imagen eliminada de la Galería");
        router.refresh();
        return true;
    };

    const handleSendGalleryImageToTour = async (scene: Scene) => {
        const galleryImageId = scene.galleryImageId ?? scene.id;
        const toastId = toast.loading("Enviando a Tour 360 y Biblioteca...");

        try {
            const toursRes = await getProjectTours(proyectoId);
            let targetTourId: string | null = null;
            let currentScenes: any[] = [];

            if (toursRes.success && toursRes.data && toursRes.data.length > 0) {
                const biblio =
                    toursRes.data.find((tour: any) => String(tour.nombre || "").toLowerCase().includes("biblioteca")) ||
                    toursRes.data[0];
                targetTourId = biblio.id;
                currentScenes = biblio.scenes || [];
            }

            const duplicateScene = currentScenes.find(
                (item: any) =>
                    item.galleryImageId === galleryImageId ||
                    item.masterplanOverlay?.galleryImageId === galleryImageId
            );

            if (duplicateScene) {
                toast.info("Esta imagen ya fue enviada a Tour 360 y Biblioteca", { id: toastId });
                return;
            }

            const galleryCategory = sceneCategoryToGalleryCategory(scene.category, "EXTERIOR");
            const newScene = {
                title: scene.title || galleryCategory.replaceAll("_", " "),
                imageUrl: scene.imageUrl,
                thumbnailUrl: scene.thumbnailUrl ?? scene.imageUrl,
                category: galleryCategoryToSceneCategory(galleryCategory),
                galleryImageId,
                masterplanOverlay: {
                    ...(scene.masterplanOverlay ?? {}),
                    galleryImageId,
                },
                hotspots: [],
            };

            if (targetTourId) {
                await updateTour(targetTourId, {
                    nombre: "Tour 360 y Biblioteca",
                    scenes: [...currentScenes.map((item: any) => ({ ...item, hotspots: item.hotspots || [] })), newScene],
                });
            } else {
                await createTour({
                    proyectoId,
                    nombre: "Tour 360 y Biblioteca",
                    scenes: [newScene],
                });
            }

            toast.success("Imagen enviada a Tour 360 y Biblioteca", { id: toastId });
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Error al enviar a Tour 360 y Biblioteca", { id: toastId });
        }
    };

    const handleSaveTour = async (scenes: Scene[], options: SaveTourOptions = {}) => {
        if (!tourName.trim()) {
            alert("El nombre del tour es obligatorio");
            return false;
        }

        if (scenes.length === 0) {
            alert("Debés agregar al menos una escena");
            return false;
        }

        setIsSaving(true);

        const HOTSPOT_TYPE_MAP: Record<string, "INFO" | "SCENE" | "LINK" | "UNIT"> = {
            info: "INFO",
            scene: "SCENE",
            link: "LINK",
            unit: "UNIT",
            lot: "UNIT",
            check: "INFO",
            sold: "INFO",
            gallery: "INFO",
            video: "LINK",
            arrow: "INFO",
            house: "INFO",
            tree: "INFO",
            camera: "INFO",
        };

        const normalizedScenes = scenes.map((s: any, idx) => ({
            ...(s.id?.startsWith("scene-") ? {} : { id: s.id }),
            clientSceneId: s.id,
            title: s.title || "Sin título",
            imageUrl: s.imageUrl,
            thumbnailUrl: s.thumbnailUrl ?? s.imageUrl,
            masterplanOverlay: {
                ...(s.masterplanOverlay || {}),
                ...(s.direction ? { direction: s.direction } : {}),
                polygons: s.polygons || [],
                floatingLabels: s.floatingLabels || [],
                frames: s.frames || [],
                images: s.images || [],
            },
            isDefault: s.isDefault || (idx === 0 && !scenes.some((sc) => sc.isDefault)),
            order: idx,
            category: toStoredTourSceneCategory(s.category),
            hotspots: (s.hotspots || []).map((h: any) => ({
                unidadId: h.unidadId || null,
                type: HOTSPOT_TYPE_MAP[h.type?.toLowerCase()] ?? "INFO",
                pitch: h.pitch ?? 0,
                yaw: h.yaw ?? 0,
                text: h.text ?? null,
                targetSceneId: h.targetSceneId ?? null,
            })),
        }));

        let res;

        if (viewMode === "EDIT") {
            res = await updateTour(activeTour.id, {
                nombre: tourName.trim(),
                scenes: normalizedScenes,
            });
        } else {
            // CREATE ya no usa TourCreator para guardar galería.
            setIsSaving(false);
            return false;
        }

        setIsSaving(false);

        if (res?.success) {
            if (!options.suppressSuccessToast && options.successMessage) {
                toast.success(options.successMessage);
            }
            if (!options.suppressSuccessToast && !options.successMessage) {
                toast.success("Tour actualizado con éxito");
            }

            const tourData = (res as any).data;
            const hydratedScenes = hydrateTourScenesForEditor(tourData);

            setTours((prev) => {
                const exists = prev.some((tour) => tour.id === tourData.id);
                if (!exists) return [tourData, ...prev];
                return prev.map((tour) => (tour.id === tourData.id ? tourData : tour));
            });

            if (options.keepEditing) {
                setActiveTour(tourData);
                setEditorScenes(hydratedScenes);
                setTourName(tourData?.nombre || tourName.trim());
                setViewMode("EDIT");
            } else {
                setViewMode("LIST");
            }

            router.refresh();
            return { success: true, tour: tourData, scenes: hydratedScenes };
        } else {
            toast.error(res && "error" in res ? String(res.error) : "Error");
            return false;
        }
    };

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleApprove = async (tourId: string) => {
        const approvePromise = approveTour(tourId).then((res) => {
            if (res.success) {
                const approvedTour = (res as any).data;
                setTours((prev) =>
                    prev.map((tour) =>
                        tour.id === tourId
                            ? {
                                ...tour,
                                estado: approvedTour?.estado ?? "APROBADO",
                                notasAdmin: approvedTour?.notasAdmin ?? null,
                            }
                            : tour
                    )
                );
                router.refresh();
                return "Tour aprobado";
            }
            throw new Error("error" in res ? String(res.error) : "Error al aprobar el tour");
        });

        toast.promise(approvePromise, {
            loading: "Aprobando tour...",
            success: (data) => data,
            error: (err) => err.message,
        });
    };

    const handleReject = async (tourId: string) => {
        const reason = prompt("Motivo del rechazo:");
        if (!reason) return;

        const rejectPromise = rejectTour(tourId, reason).then((res) => {
            if (res.success) {
                const rejectedTour = (res as any).data;
                setTours((prev) =>
                    prev.map((tour) =>
                        tour.id === tourId
                            ? {
                                ...tour,
                                estado: rejectedTour?.estado ?? "RECHAZADO",
                                notasAdmin: rejectedTour?.notasAdmin ?? reason.trim(),
                            }
                            : tour
                    )
                );
                router.refresh();
                return "Tour rechazado";
            }
            throw new Error("error" in res ? String(res.error) : "Error al rechazar el tour");
        });

        toast.promise(rejectPromise, {
            loading: "Rechazando tour...",
            success: (data) => data,
            error: (err) => err.message,
        });
    };

    const handlePublish = async (tourId: string) => {
        const publishPromise = publishTour360(proyectoId, tourId).then((res) => {
            if (res.success) {
                const publishedTour = (res as any).data;
                setTours((prev) =>
                    prev.map((tour) =>
                        tour.id === tourId
                            ? { ...tour, ...publishedTour, isPublished: true }
                            : { ...tour, isPublished: false }
                    )
                );
                router.refresh();
                return "Tour publicado en la landing";
            }
            throw new Error("error" in res ? String(res.error) : "Error al publicar el tour");
        });

        toast.promise(publishPromise, {
            loading: "Publicando tour...",
            success: (data) => data,
            error: (err) => err.message,
        });
    };

    const handleUnpublish = async (tourId: string) => {
        const unpublishPromise = unpublishTour360(proyectoId, tourId).then((res) => {
            if (res.success) {
                const unpublishedTour = (res as any).data;
                setTours((prev) =>
                    prev.map((tour) =>
                        tour.id === tourId
                            ? { ...tour, ...unpublishedTour, isPublished: false }
                            : tour
                    )
                );
                router.refresh();
                return "Tour quitado de la landing";
            }
            throw new Error("error" in res ? String(res.error) : "Error al quitar el tour de la landing");
        });

        toast.promise(unpublishPromise, {
            loading: "Quitando tour de la landing...",
            success: (data) => data,
            error: (err) => err.message,
        });
    };

    const getStatusBadge = (status: string) => {
        if (!mounted) {
            return (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                    Cargando...
                </span>
            );
        }

        switch (status) {
            case "APROBADO":
                return (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Aprobado
                    </span>
                );
            case "RECHAZADO":
                return (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">
                        <XCircle className="w-3 h-3" /> Rechazado
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Pendiente
                    </span>
                );
        }
    };

    if (viewMode === "LIST") {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tours 360 y Biblioteca</h2>
                        <p className="text-sm text-slate-500">
                            Carga imágenes, trabájalas en la galería y después decide qué material mandar al tour.
                        </p>
                    </div>
                    {["SUPERADMIN", "ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole) && (
                        <button
                            onClick={handleCreateClick}
                            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Cargar imágenes
                        </button>
                    )}
                </div>

                {tours.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <ImageIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        {["SUPERADMIN", "ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole) ? (
                            <>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No hay material cargado</h3>
                                <p className="text-sm text-slate-400 mb-6">
                                    Empezá subiendo imágenes a la galería. Después podés editarlas y mandar las que quieras al tour.
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No hay tours disponibles</h3>
                                <p className="text-sm text-slate-400 mb-6">
                                    El desarrollador aún no cargó material visual para este proyecto.
                                </p>
                            </>
                        )}
                        {["SUPERADMIN", "ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole) && (
                            <button onClick={handleCreateClick} className="text-brand-500 font-bold text-sm hover:underline">
                                Cargar imágenes
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tours.map((tour) => {
                            const tour360Scenes = (tour.scenes || []).filter((scene: any) => isTour360Category(scene));
                            const thumbnail = tour360Scenes[0]?.imageUrl ?? tour.scenes?.[0]?.imageUrl;
                            const canViewTour360 = tour360Scenes.length > 0;

                            return (
                                <div
                                    key={tour.id}
                                    className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
                                >
                                    <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                        {thumbnail ? (
                                            <img
                                                src={thumbnail}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                alt={tour.nombre}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300">
                                                <ImageIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            {canViewTour360 && (
                                                <button
                                                    onClick={() => handleViewClick(tour)}
                                                    className="p-2 bg-white/20 rounded-full text-white hover:bg-white hover:text-brand-600 transition-colors"
                                                    title="Ver Tour"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            )}
                                            {["SUPERADMIN", "ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole) && (
                                                <>
                                                    <button
                                                        onClick={() => handleEditClick(tour)}
                                                        className="p-2 bg-white/20 rounded-full text-white hover:bg-white hover:text-blue-600 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(tour.id)}
                                                        className="p-2 bg-white/20 rounded-full text-white hover:bg-white hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-bold text-slate-800 dark:text-white truncate">{tour.nombre}</h3>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-slate-500">{tour.scenes?.length || 0} escenas</p>
                                            {getStatusBadge(tour.estado || "PENDIENTE")}
                                        </div>

                                        {tour.isPublished && (
                                            <div className="mt-2">
                                                <span className="inline-flex items-center rounded-full bg-brand-500/10 px-2 py-1 text-xs font-bold text-brand-500">
                                                    Publicado en landing
                                                </span>
                                            </div>
                                        )}

                                        {["SUPERADMIN", "ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole) && canViewTour360 && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    onClick={() => (tour.isPublished ? handleUnpublish(tour.id) : handlePublish(tour.id))}
                                                    className={`w-full rounded-lg py-2 text-xs font-bold transition-colors ${tour.isPublished
                                                        ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                                        : "bg-brand-500 text-white hover:bg-brand-600"
                                                        }`}
                                                >
                                                    {tour.isPublished ? "Quitar de landing" : "Publicar en landing"}
                                                </button>
                                            </div>
                                        )}

                                        {["SUPERADMIN", "ADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole) && tour.estado !== "APROBADO" && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    onClick={() => handleApprove(tour.id)}
                                                    className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleReject(tour.id)}
                                                    className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Rechazar
                                                </button>
                                            </div>
                                        )}

                                        {tour.estado === "RECHAZADO" && tour.notasAdmin && (
                                            <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
                                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-start gap-1">
                                                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                                    {tour.notasAdmin}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (viewMode === "CREATE") {
        return (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col min-h-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                    <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <button
                        onClick={() => setViewMode("LIST")}
                        className="shrink-0 font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-brand-500 dark:text-slate-300"
                    >
                        {"<- Volver"}
                    </button>
                    <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                    <p className="min-w-0 flex-1 truncate">
                        Acá trabajás la Galería de Imágenes del proyecto. Guardar imagen y editar imagen persisten acá sin crear tours automáticamente.
                    </p>
                    {isLoadingGallery && (
                        <span className="shrink-0 font-bold text-brand-500 animate-pulse">Cargando...</span>
                    )}
                </div>

                <div className="min-h-0 flex-1">
                    <TourCreator
                        key={`gallery-${proyectoId}`}
                        proyectoId={proyectoId}
                        initialScenes={editorScenes as any}
                        onSave={handleSaveGalleryScenes}
                        onSaveGalleryImage={handleSaveGalleryImage}
                        onDeleteGalleryImage={handleDeleteGalleryImage}
                        onSendToTourImage={handleSendGalleryImageToTour}
                    />
                </div>
            </div>
        );
    }

    if (viewMode === "EDIT") {
        return (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300 h-full flex flex-col min-h-0">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                    <Info className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <button
                        onClick={() => setViewMode("LIST")}
                        className="shrink-0 font-bold uppercase tracking-wider text-slate-600 transition-colors hover:text-brand-500 dark:text-slate-300"
                    >
                        {"<- Volver"}
                    </button>
                    <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
                    <p className="min-w-0 flex-1 truncate">
                        Editá el Tour 360 sin mezclar este flujo con el guardado de Galería de Imágenes.
                    </p>
                    {isSaving && (
                        <span className="shrink-0 font-bold text-brand-500 animate-pulse">Guardando...</span>
                    )}
                </div>

                <div className="min-h-0 flex-1">
                    <TourCreator
                        key={activeTour?.id || "edit-tour"}
                        proyectoId={proyectoId}
                        tourId={activeTour?.id}
                        initialScenes={editorScenes as any}
                        onSave={handleSaveTour}
                    />
                </div>
            </div>
        );
    }

    if (viewMode === "VIEW") {
        return (
            <div className="fixed inset-0 z-[2000] bg-black">
                <button
                    onClick={() => setViewMode("LIST")}
                    className="absolute top-4 right-4 z-[9999] bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold transition-all border border-white/20"
                >
                    Cerrar
                </button>
                <TourViewer
                    scenes={editorScenes}
                    initialSceneId={editorScenes[0]?.id}
                    className="w-full h-full"
                    autoRotate={true}
                    onPolygonClick={(poly) => {
                        alert(`Click en polígono: ${poly.hoverText || "Sin nombre"}`);
                    }}
                />
            </div>
        );
    }

    return null;
}
