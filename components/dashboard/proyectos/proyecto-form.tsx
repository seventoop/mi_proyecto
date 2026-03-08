"use client";

import { useState, useRef } from "react";
import { X, Save, Building2, MapPin, DollarSign, Calendar, AlertCircle, Image as ImageIcon, Upload, Shield, Archive, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { createProyecto, updateProyecto } from "@/lib/actions/proyectos";
import { useRouter } from "next/navigation";
import ProjectTechnicalFiles from "./project-technical-files";
import ProjectGalleryManager from "./project-gallery-manager";
import AIDescriptionModal from "./ai-description-modal";
import { improveProjectDescription } from "@/lib/actions/ai";
import { toast } from "sonner";
import { Wand2, Sparkles, Loader2 } from "lucide-react";

interface ProyectoFormProps {
    proyecto?: any;
    onClose: () => void;
    userRole?: string;
    kycStatus?: string;
    riskLevel?: string;
}

const estadoOptions = [
    { value: "PLANIFICACION", label: "Planificación" },
    { value: "EN_VENTA", label: "En Venta" },
    { value: "FINALIZADO", label: "Finalizado" },
];

const tipoOptions = [
    { value: "URBANIZACION", label: "Urbanización" },
    { value: "DEPARTAMENTOS", label: "Departamentos" },
];

export default function ProyectoForm({ proyecto, onClose, userRole, kycStatus, riskLevel }: ProyectoFormProps) {
    const isNew = !proyecto;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [file, setFile] = useState<File | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        nombre: proyecto?.nombre || "",
        slug: proyecto?.slug || "",
        descripcion: proyecto?.descripcion || "",
        ubicacion: proyecto?.ubicacion || "",
        estado: proyecto?.estado || "PLANIFICACION",
        tipo: proyecto?.tipo || "URBANIZACION",
        imagenPortada: proyecto?.imagenPortada || "",
        invertible: proyecto?.invertible || false,
        precioM2Inversor: proyecto?.precioM2Inversor?.toString() || "",
        precioM2Mercado: proyecto?.precioM2Mercado?.toString() || "",
        metaM2Objetivo: proyecto?.metaM2Objetivo?.toString() || "",
        fechaLimiteFondeo: proyecto?.fechaLimiteFondeo ? new Date(proyecto.fechaLimiteFondeo).toISOString().split('T')[0] : "",
        mapCenterLat: proyecto?.mapCenterLat?.toString() || "-34.6037",
        mapCenterLng: proyecto?.mapCenterLng?.toString() || "-58.3816",
        mapZoom: proyecto?.mapZoom?.toString() || "16",
        aiKnowledgeBase: proyecto?.aiKnowledgeBase || "",
        aiSystemPrompt: proyecto?.aiSystemPrompt || "",
    });

    // AI Description Assistant State
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);

    const handleImproveDescription = async () => {
        if (!form.descripcion.trim() && !form.ubicacion.trim()) {
            toast.error("Ingresa al menos la ubicación o una descripción base para la IA.");
            return;
        }

        setAiLoading(true);
        setAiModalOpen(true);
        setAiSuggestion(null);

        try {
            const res = await improveProjectDescription({
                descripcionActual: form.descripcion,
                ubicacion: form.ubicacion,
                tipo: form.tipo
            });

            if (res.success && res.data) {
                setAiSuggestion(res.data);
            } else {
                toast.error(res.error || "Error al mejorar descripción");
                setAiModalOpen(false);
            }
        } catch (error) {
            toast.error("Error de conexión con la IA");
            setAiModalOpen(false);
        } finally {
            setAiLoading(false);
        }
    };

    const updateForm = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const ALLOWED_IMAGE_TYPES = [
        "image/jpeg", "image/jpg", "image/png",
        "image/webp", "image/gif", "image/avif",
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        if (!ALLOWED_IMAGE_TYPES.includes(selectedFile.type)) {
            toast.error("Solo se aceptan imágenes: JPG, PNG, WEBP, GIF o AVIF");
            e.target.value = "";
            return;
        }
        setFile(selectedFile);
        updateForm("imagenPortada", "");
    };

    const handleSave = async () => {
        setErrors({});
        const newErrors: Record<string, string> = {};

        if (!form.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
        if (!form.ubicacion.trim()) newErrors.ubicacion = "La ubicación es obligatoria";

        if (form.invertible) {
            if (!form.precioM2Inversor) newErrors.precioM2Inversor = "Requerido para proyectos invertibles";
            if (!form.metaM2Objetivo) newErrors.metaM2Objetivo = "Requerido para proyectos invertibles";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            let imagenPortada = form.imagenPortada;

            // Upload image if file selected
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    imagenPortada = uploadData.url;
                } else {
                    throw new Error(uploadData.error || "Error al subir imagen");
                }
            }

            const payload = {
                nombre: form.nombre,
                slug: form.slug || undefined,
                descripcion: form.descripcion || undefined,
                ubicacion: form.ubicacion,
                estado: form.estado,
                tipo: form.tipo,
                imagenPortada,
                invertible: form.invertible,
                precioM2Inversor: form.precioM2Inversor ? parseFloat(form.precioM2Inversor) : undefined,
                precioM2Mercado: form.precioM2Mercado ? parseFloat(form.precioM2Mercado) : undefined,
                metaM2Objetivo: form.metaM2Objetivo ? parseFloat(form.metaM2Objetivo) : undefined,
                fechaLimiteFondeo: form.fechaLimiteFondeo ? new Date(form.fechaLimiteFondeo) : undefined,
                mapCenterLat: parseFloat(form.mapCenterLat),
                mapCenterLng: parseFloat(form.mapCenterLng),
                mapZoom: parseInt(form.mapZoom),
                aiKnowledgeBase: form.aiKnowledgeBase || undefined,
                aiSystemPrompt: form.aiSystemPrompt || undefined,
            };

            const result = isNew
                ? await createProyecto(payload)
                : await updateProyecto(proyecto.id, payload);

            if (result.success) {
                router.refresh();
                if (isNew && result.data) {
                    router.push(`/dashboard/proyectos/${result.data.id}`);
                }
                onClose();
            } else {
                setErrors({ submit: result.error || "Error al guardar" });
            }
        } catch (e: any) {
            setErrors({ submit: e.message || "Error inesperado" });
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-900 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col animate-slide-up bg-white dark:bg-slate-900 my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isNew ? "Nuevo Proyecto" : `Editar ${proyecto.nombre}`}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isNew ? "Crea un nuevo proyecto inmobiliario" : "Actualiza la información del proyecto"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Hidden file input — triggered by clicking the preview area */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.webp,.gif,.avif"
                        onChange={handleFileChange}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* 1. Nombre */}
                        <div className="md:col-span-2">
                            <label className={labelClass}>
                                <Building2 className="w-4 h-4 inline mr-1" />
                                Nombre del Proyecto *
                            </label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={(e) => updateForm("nombre", e.target.value)}
                                placeholder="Ej: Barrio Los Pinos"
                                className={cn(inputClass, errors.nombre && "border-rose-400")}
                            />
                            {errors.nombre && <span className="text-xs text-rose-400 mt-1 block">{errors.nombre}</span>}
                        </div>

                        {/* 2. Ubicación + Tipo */}
                        <div>
                            <label className={labelClass}>
                                <MapPin className="w-4 h-4 inline mr-1" />
                                Ubicación *
                            </label>
                            <input
                                type="text"
                                value={form.ubicacion}
                                onChange={(e) => updateForm("ubicacion", e.target.value)}
                                placeholder="Ciudad, Provincia"
                                className={cn(inputClass, errors.ubicacion && "border-rose-400")}
                            />
                            {errors.ubicacion && <span className="text-xs text-rose-400 mt-1 block">{errors.ubicacion}</span>}
                        </div>

                        <div>
                            <label className={labelClass}>Tipo de Proyecto</label>
                            <select value={form.tipo} onChange={(e) => updateForm("tipo", e.target.value)} className={inputClass}>
                                {tipoOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Estado */}
                        <div>
                            <label className={labelClass}>Estado</label>
                            <select value={form.estado} onChange={(e) => updateForm("estado", e.target.value)} className={inputClass}>
                                {estadoOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Spacer to keep grid aligned */}
                        <div className="hidden md:block" />

                        {/* 4. Descripción */}
                        <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-slate-900 dark:text-slate-400">Descripción</label>
                                <button
                                    onClick={handleImproveDescription}
                                    type="button"
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-500/10 text-brand-500 text-xs font-bold hover:bg-brand-500/20 transition-all border border-brand-500/20 group shadow-sm"
                                >
                                    <Wand2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                    Mejorar con IA
                                </button>
                            </div>
                            <textarea
                                value={form.descripcion}
                                onChange={(e) => updateForm("descripcion", e.target.value)}
                                placeholder="Describe el proyecto..."
                                rows={3}
                                className={inputClass}
                            />
                        </div>

                        {/* 5. Imagen de Portada — área clickeable unificada */}
                        <div className="md:col-span-2">
                            <label className={labelClass}>
                                <ImageIcon className="w-4 h-4 inline mr-1" />
                                Imagen de Portada
                                <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                            </label>

                            {/* Clickable preview area */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "rounded-xl border-2 border-dashed bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all duration-200",
                                    (form.imagenPortada || file)
                                        ? "border-brand-500/40 min-h-[200px] hover:border-brand-500"
                                        : "border-slate-300 dark:border-slate-700 min-h-[160px] hover:border-brand-500/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                {(form.imagenPortada || file) ? (
                                    <>
                                        <img
                                            src={file ? URL.createObjectURL(file) : form.imagenPortada}
                                            alt="Preview portada"
                                            className="max-h-[190px] w-auto rounded-lg shadow-md object-cover"
                                            onError={(e) => (e.currentTarget.src = "")}
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <Upload className="w-6 h-6 text-white" />
                                            <span className="text-white text-xs font-bold">Cambiar imagen</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-slate-400 px-6 py-4 pointer-events-none">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                            Hacé clic para subir una imagen
                                        </p>
                                        <p className="text-[11px] mt-1 text-slate-400">
                                            JPG, PNG, WEBP, GIF · Se mostrará en los listados públicos
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions row when image is loaded */}
                            {(form.imagenPortada || file) && (
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:text-brand-400 transition-colors"
                                    >
                                        <Upload className="w-3.5 h-3.5" /> Cambiar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setFile(null); updateForm("imagenPortada", ""); }}
                                        className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                    {form.imagenPortada && !file && (
                                        <a
                                            href={form.imagenPortada}
                                            download
                                            target="_blank"
                                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-400 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Descargar
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Optional URL input */}
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(v => !v)}
                                className="mt-2 text-[11px] text-slate-400 hover:text-brand-500 transition-colors font-medium"
                            >
                                {showUrlInput ? "▲ Ocultar" : "▼ O pegá una URL de imagen externa"}
                            </button>
                            {showUrlInput && (
                                <input
                                    type="url"
                                    value={file ? "" : form.imagenPortada}
                                    onChange={(e) => { updateForm("imagenPortada", e.target.value); setFile(null); }}
                                    placeholder="https://..."
                                    className={cn(inputClass, "mt-2")}
                                />
                            )}
                        </div>

                        {/* 6. Opciones avanzadas — Slug */}
                        <div className="md:col-span-2">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(v => !v)}
                                className="text-xs font-bold text-slate-400 hover:text-brand-500 transition-colors flex items-center gap-1"
                            >
                                {showAdvanced ? "▲" : "▼"} Opciones avanzadas
                            </button>
                            {showAdvanced && (
                                <div className="mt-3">
                                    <label className={labelClass}>Slug (URL amigable)</label>
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={(e) => updateForm("slug", e.target.value)}
                                        placeholder="Se genera automáticamente del nombre"
                                        className={inputClass}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Opcional. Si no se especifica, se genera del nombre.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Configuración de Mapa */}
                        <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Configuración del Mapa</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelClass}>Latitud Centro</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={form.mapCenterLat}
                                        onChange={(e) => updateForm("mapCenterLat", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Longitud Centro</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={form.mapCenterLng}
                                        onChange={(e) => updateForm("mapCenterLng", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Zoom Inicial</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={form.mapZoom}
                                        onChange={(e) => updateForm("mapZoom", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Configuración de Inversión */}
                        <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sistema de Inversión</h3>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.invertible}
                                        onChange={(e) => updateForm("invertible", e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange/40"
                                    />
                                    <span className="text-sm font-medium text-slate-900 dark:text-slate-300">Proyecto Invertible</span>
                                </label>
                            </div>

                            {form.invertible && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className={labelClass}>
                                            <DollarSign className="w-4 h-4 inline mr-1" />
                                            Precio m² Inversor *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.precioM2Inversor}
                                            onChange={(e) => updateForm("precioM2Inversor", e.target.value)}
                                            placeholder="0.00"
                                            className={cn(inputClass, errors.precioM2Inversor && "border-rose-400")}
                                        />
                                        {errors.precioM2Inversor && <span className="text-xs text-rose-400 mt-1 block">{errors.precioM2Inversor}</span>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>Precio m² Mercado</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.precioM2Mercado}
                                            onChange={(e) => updateForm("precioM2Mercado", e.target.value)}
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Meta m² Objetivo *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.metaM2Objetivo}
                                            onChange={(e) => updateForm("metaM2Objetivo", e.target.value)}
                                            placeholder="0.00"
                                            className={cn(inputClass, errors.metaM2Objetivo && "border-rose-400")}
                                        />
                                        {errors.metaM2Objetivo && <span className="text-xs text-rose-400 mt-1 block">{errors.metaM2Objetivo}</span>}
                                    </div>
                                    <div>
                                        <label className={labelClass}>
                                            <Calendar className="w-4 h-4 inline mr-1" />
                                            Fecha Límite Fondeo
                                        </label>
                                        <input
                                            type="date"
                                            value={form.fechaLimiteFondeo}
                                            onChange={(e) => updateForm("fechaLimiteFondeo", e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Configuración de IA */}
                        <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Configuración de Agente IA</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Base de Conocimiento (Knowledge Base)</label>
                                    <textarea
                                        value={form.aiKnowledgeBase}
                                        onChange={(e) => updateForm("aiKnowledgeBase", e.target.value)}
                                        placeholder="Información detallada sobre el proyecto, precios, financiación, etc. que el IA debe saber."
                                        rows={6}
                                        className={cn(inputClass, "font-sans")}
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Esta información será usada por el agente para responder consultas de leads.</p>
                                </div>
                                <div>
                                    <label className={labelClass}>System Prompt (Instrucciones)</label>
                                    <textarea
                                        value={form.aiSystemPrompt}
                                        onChange={(e) => updateForm("aiSystemPrompt", e.target.value)}
                                        placeholder="Eje: Eres un asistente experto en ventas inmobiliarias. Sé amable, directo y enfócate en calificar al lead."
                                        rows={3}
                                        className={cn(inputClass, "font-mono text-xs")}
                                    />
                                    <p className="text-xs text-slate-500">Instrucciones específicas sobre el tono y comportamiento del agente.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Galería de Imágenes Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-brand-500/10 text-brand-500 rounded-xl">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Galería de Imágenes</h3>
                                <p className="text-xs text-slate-500">Renders, avances de obra e interiores. Arrastra para reordenar.</p>
                            </div>
                        </div>

                        {!isNew ? (
                            <ProjectGalleryManager proyectoId={proyecto.id} />
                        ) : (
                            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <p className="text-sm text-slate-500">Podrás gestionar la galería profesional una vez creado el proyecto.</p>
                            </div>
                        )}
                    </div>

                    {/* Archivos Técnicos Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-brand-500/10 text-brand-500 rounded-xl">
                                <Archive className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Archivos Técnicos del Proyecto</h3>
                                <p className="text-xs text-slate-500">Sube planos, memorias, documentos legales y renders.</p>
                            </div>
                        </div>

                        {!isNew ? (
                            <ProjectTechnicalFiles proyectoId={proyecto.id} />
                        ) : (
                            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <p className="text-sm text-slate-500">Podrás subir archivos técnicos una vez que el proyecto haya sido creado.</p>
                            </div>
                        )}
                    </div>
                </div>

                {errors.submit && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2 mx-6 mb-2">
                        <AlertCircle className="w-4 h-4" /> {errors.submit}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    {kycStatus !== "VERIFICADO" && !proyecto?.isDemo && (
                        <div className="flex-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {isNew
                                ? "Modo demo · podés crear 1 proyecto"
                                : "KYC requerido para cambios oficiales"}
                        </div>
                    )}
                    {riskLevel === "high" && (
                        <div className="flex-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                            <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            Sujeto a revisión manual (riesgo alto)
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || (kycStatus !== "VERIFICADO" && !isNew && !proyecto?.isDemo)}
                        className={cn(
                            "px-5 py-2.5 rounded-xl font-semibold text-sm shadow-glow transition-all disabled:opacity-50 flex items-center gap-2",
                            (kycStatus === "VERIFICADO" || isNew || proyecto?.isDemo)
                                ? "gradient-brand text-white shadow-glow"
                                : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        )}
                    >
                        {loading
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                            : <><Save className="w-4 h-4" /> {isNew ? "Crear Proyecto" : "Guardar Cambios"}</>
                        }
                    </button>
                </div>
            </div>

            <AIDescriptionModal
                isOpen={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                loading={aiLoading}
                suggestion={aiSuggestion}
                onApply={(text) => {
                    updateForm("descripcion", text);
                    setAiModalOpen(false);
                    toast.success("Descripción actualizada correctamente");
                }}
            />
        </div>
    );
}
