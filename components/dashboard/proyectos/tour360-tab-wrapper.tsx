"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Eye, ImageIcon } from "lucide-react";
import { createTour, updateTour, deleteTour, approveTour, rejectTour } from "@/lib/actions/tours";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import TourCreator from "@/components/tour360/tour-creator";
import TourViewer from "@/components/tour360/tour-viewer";
import { Scene } from "@/components/tour360/tour-viewer"; // Import type
import { toast } from "sonner";

interface Tour360TabWrapperProps {
    proyectoId: string;
    tours: any[]; // Prisma type
    userRole: string;
}

export default function Tour360TabWrapper({
    proyectoId,
    tours: initialTours,
    userRole
}: Tour360TabWrapperProps) {
    const router = useRouter();
    const [tours, setTours] = useState(initialTours || []);
    const [viewMode, setViewMode] = useState<"LIST" | "EDIT" | "VIEW" | "CREATE">("LIST");

    // State for Editor/Viewer
    const [activeTour, setActiveTour] = useState<any | null>(null);
    const [editorScenes, setEditorScenes] = useState<Scene[]>([]);
    const [tourName, setTourName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleCreateClick = () => {
        setTourName("Nuevo Tour");
        setEditorScenes([]);
        setActiveTour(null);
        setViewMode("CREATE");
    };

    const handleEditClick = (tour: any) => {
        try {
            const scenes = JSON.parse(tour.escenas || "[]");
            setEditorScenes(scenes);
            setTourName(tour.nombre);
            setActiveTour(tour);
            setViewMode("EDIT");
        } catch (e) {
            console.error("Error parsing scenes", e);
            alert("Error al cargar escenas del tour");
        }
    };

    const handleViewClick = (tour: any) => {
        try {
            const scenes = JSON.parse(tour.escenas || "[]");
            setEditorScenes(scenes); // Viewer uses same Scene type structure
            setActiveTour(tour);
            setViewMode("VIEW");
        } catch (e) {
            console.error("Error parsing scenes", e);
            alert("Error al cargar escenas");
        }
    };

    const handleDeleteClick = async (tourId: string) => {
        const deletePromise = deleteTour(tourId).then((res) => {
            if (res.success) {
                setTours(tours.filter(t => t.id !== tourId));
                router.refresh();
                return "Tour eliminado";
            }
            throw new Error(res.error || "Error al eliminar tour");
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando tour...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const handleSaveTour = async (scenes: Scene[]) => {
        if (!tourName) return alert("El nombre es obligatorio");
        if (scenes.length === 0) return alert("Debes agregar al menos una escena");

        setIsSaving(true);
        const scenesJson = JSON.stringify(scenes);

        let res;
        if (viewMode === "CREATE") {
            res = await createTour({
                proyectoId,
                nombre: tourName,
                escenas: scenesJson
            });
        } else {
            res = await updateTour(activeTour.id, {
                nombre: tourName,
                escenas: scenesJson
            });
        }

        setIsSaving(false);

        if (res.success) {
            toast.success(viewMode === "CREATE" ? "Tour creado con éxito" : "Tour actualizado con éxito");

            // Optimistic update for immediate feedback
            if (viewMode === "CREATE") {
                setTours(prev => [res.data, ...prev]);
            } else {
                setTours(prev => prev.map(t => t.id === res.data.id ? res.data : t));
            }

            router.refresh();
            setViewMode("LIST");
        } else {
            toast.error(res.error);
        }
    };

    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch for icons/status
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleApprove = async (tourId: string) => {
        const approvePromise = approveTour(tourId).then((res) => {
            if (res.success) {
                router.refresh();
                return "Tour aprobado";
            }
            throw new Error(res.error || "Error al aprobar tour");
        });

        toast.promise(approvePromise, {
            loading: 'Aprobando tour...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const handleReject = async (tourId: string) => {
        const reason = prompt("Motivo del rechazo:");
        if (!reason) return;

        const rejectPromise = rejectTour(tourId, reason).then((res) => {
            if (res.success) {
                router.refresh();
                return "Tour rechazado";
            }
            throw new Error(res.error || "Error al rechazar tour");
        });

        toast.promise(rejectPromise, {
            loading: 'Rechazando tour...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const getStatusBadge = (status: string) => {
        if (!mounted) return <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">Cargando...</span>;

        switch (status) {
            case "APROBADO":
                return <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> Aprobado</span>;
            case "RECHAZADO":
                return <span className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Rechazado</span>;
            default:
                return <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> Pendiente</span>;
        }
    };

    if (viewMode === "LIST") {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recorridos Virtuales 360°</h2>
                        <p className="text-sm text-slate-500">Gestiona experiencias inmersivas para tus inversores.</p>
                    </div>
                    {["VENDEDOR", "ADMIN", "DESARROLLADOR"].includes(userRole) && (
                        <button
                            onClick={handleCreateClick}
                            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Tour
                        </button>
                    )}
                </div>

                {tours.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <ImageIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                        {["VENDEDOR", "ADMIN", "DESARROLLADOR"].includes(userRole) ? (
                            <>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No hay tours creados</h3>
                                <p className="text-sm text-slate-400 mb-6">Crea el primer recorrido virtual para impresionar a tus clientes.</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No hay recorridos disponibles</h3>
                                <p className="text-sm text-slate-400 mb-6">El desarrollador aún no ha cargado recorridos virtuales para este proyecto.</p>
                            </>
                        )}
                        {["VENDEDOR", "ADMIN", "DESARROLLADOR"].includes(userRole) && (
                            <button onClick={handleCreateClick} className="text-brand-500 font-bold text-sm hover:underline">
                                Crear uno ahora
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tours.map(tour => {
                            // Try to get thumbnail from first scene
                            let thumbnail = null;
                            try {
                                const s = JSON.parse(tour.escenas || "[]");
                                if (s.length > 0) thumbnail = s[0].imageUrl;
                            } catch { }

                            return (
                                <div key={tour.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                                    <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                        {thumbnail ? (
                                            <img src={thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={tour.nombre} />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300">
                                                <ImageIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <button onClick={() => handleViewClick(tour)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white hover:text-brand-600 transition-colors" title="Ver Tour">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            {["VENDEDOR", "ADMIN", "DESARROLLADOR"].includes(userRole) && (
                                                <>
                                                    <button onClick={() => handleEditClick(tour)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white hover:text-blue-600 transition-colors" title="Editar">
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(tour.id)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white hover:text-red-600 transition-colors" title="Eliminar">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-slate-800 dark:text-white truncate">{tour.nombre}</h3>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-slate-500">
                                                {(() => {
                                                    try { return JSON.parse(tour.escenas).length } catch { return 0 }
                                                })()} escenas
                                            </p>
                                            {getStatusBadge(tour.estado || "PENDIENTE")}
                                        </div>

                                        {/* Admin Approval Controls */}
                                        {["VENDEDOR", "ADMIN", "DESARROLLADOR"].includes(userRole) && tour.estado !== "APROBADO" && (
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

                                        {/* Setup Rejection Note for Developer */}
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

    if (viewMode === "CREATE" || viewMode === "EDIT") {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 h-full">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setViewMode("LIST")} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white uppercase tracking-wider">
                            ← Volver
                        </button>
                        <input
                            type="text"
                            value={tourName}
                            onChange={(e) => setTourName(e.target.value)}
                            placeholder="Nombre del Tour"
                            className="bg-transparent text-xl font-bold border-none focus:ring-0 placeholder-slate-300 dark:placeholder-slate-700 text-slate-800 dark:text-white p-0"
                        />
                    </div>
                    {isSaving && <span className="text-sm text-brand-500 animate-pulse font-bold">Guardando...</span>}
                </div>

                <TourCreator
                    proyectoId={proyectoId}
                    initialScenes={editorScenes}
                    onSave={handleSaveTour}
                />
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
                        alert(`Click en polígono: ${poly.hoverText || 'Sin nombre'}`);
                    }}
                />
            </div>
        );
    }

    return null;
}
