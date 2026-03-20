"use client";

import { useState } from "react";
import { X, Save, Image, Link as LinkIcon, Calendar, Layout, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBanner, updateBanner } from "@/lib/actions/banners";
import { useRouter } from "next/navigation";
import { Upload, Film, FileVideo } from "lucide-react";

interface BannerFormProps {
    banner?: any;
    onClose: () => void;
}

const posicionOptions = [
    { value: "HOME_TOP", label: "Home: Parte Superior (Hero)" },
    { value: "HOME_MID", label: "Home: Mitad de página" },
    { value: "LANDING", label: "Landing Page" },
    { value: "SIDEBAR", label: "Barra Lateral" },
];

export default function BannerForm({ banner, onClose }: BannerFormProps) {
    const isNew = !banner;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({
        titulo: banner?.titulo || "",
        mediaUrl: banner?.mediaUrl || "",
        linkDestino: banner?.linkDestino || "",
        posicion: banner?.posicion || "HOME_TOP",
        prioridad: banner?.prioridad?.toString() || "0",
        tipo: banner?.tipo || "IMAGEN",
        fechaInicio: banner?.fechaInicio ? new Date(banner.fechaInicio).toISOString().split('T')[0] : "",
        fechaFin: banner?.fechaFin ? new Date(banner.fechaFin).toISOString().split('T')[0] : "",
    });

    const updateForm = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            // Vista previa local (opcional para imagenes)
            if (selectedFile.type.startsWith("image/")) {
                updateForm("tipo", "IMAGEN");
            } else if (selectedFile.type.startsWith("video/")) {
                updateForm("tipo", "VIDEO");
            }
        }
    };

    const handleSave = async () => {
        setErrors({});
        const newErrors: Record<string, string> = {};
        if (!form.titulo.trim()) newErrors.titulo = "El título es obligatorio";
        if (!form.mediaUrl.trim() && !file) newErrors.mediaUrl = "Debe subir un archivo o proveer una URL";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            let mediaUrl = form.mediaUrl;

            // Subir archivo si existe
            if (file) {
                setUploading(true);
                const formData = new FormData();
                formData.append("file", file);
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    mediaUrl = uploadData.url;
                } else {
                    throw new Error(uploadData.error || "Error al subir archivo");
                }
                setUploading(false);
            }

            const payload = {
                ...form,
                mediaUrl,
                prioridad: parseInt(form.prioridad) || 0,
                fechaInicio: form.fechaInicio ? new Date(form.fechaInicio) : undefined,
                fechaFin: form.fechaFin ? new Date(form.fechaFin) : undefined,
            };

            const result = isNew
                ? await createBanner(payload)
                : await updateBanner(banner.id, payload);

            if (result.success) {
                router.refresh();
                onClose();
            } else {
                setErrors({ submit: result.error || "Error al guardar" });
            }
        } catch (e: any) {
            setErrors({ submit: e.message || "Error inesperado" });
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up bg-white dark:bg-slate-900">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {isNew ? "Nuevo Banner" : "Editar Banner"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configura la publicidad para la plataforma</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Preview */}
                    <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col items-center justify-center min-h-[150px] relative overflow-hidden">
                        {(form.mediaUrl || file) ? (
                            <>
                                {form.tipo === "VIDEO" || (file && file.type.startsWith("video/")) ? (
                                    <div className="flex flex-col items-center">
                                        <FileVideo className="w-12 h-12 text-brand-500 mb-2" />
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            {file ? file.name : "Video seleccionado"}
                                        </span>
                                    </div>
                                ) : (
                                    <img
                                        src={file ? URL.createObjectURL(file) : form.mediaUrl}
                                        alt="Preview"
                                        className="max-h-[200px] w-auto rounded-lg shadow-md object-cover"
                                        onError={(e) => (e.currentTarget.src = "")}
                                    />
                                )}
                                <button
                                    onClick={() => { setFile(null); updateForm("mediaUrl", ""); }}
                                    className="absolute top-2 right-2 p-1 bg-rose-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-slate-400">
                                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <span className="text-xs">Subir imagen o video</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>
                                {form.tipo === "VIDEO" ? "Video de Banner" : "Imagen de Banner"}
                            </label>
                            <div className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm font-bold text-slate-900 dark:text-white">
                                        <Upload className="w-4 h-4 text-brand-500" />
                                        {file ? "Cambiar Archivo" : "Subir desde PC"}
                                        <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                                    </label>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => updateForm("tipo", "IMAGEN")}
                                            className={cn("p-2 rounded-lg transition-all", form.tipo === "IMAGEN" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-500" : "text-slate-400")}
                                        >
                                            <Image className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateForm("tipo", "VIDEO")}
                                            className={cn("p-2 rounded-lg transition-all", form.tipo === "VIDEO" ? "bg-white dark:bg-slate-700 shadow-sm text-brand-500" : "text-slate-400")}
                                        >
                                            <Film className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={form.mediaUrl}
                                        onChange={(e) => { updateForm("mediaUrl", e.target.value); setFile(null); }}
                                        placeholder="O pega una URL (https://...)"
                                        className={cn(inputClass, errors.mediaUrl && "border-rose-400")}
                                    />
                                    {form.mediaUrl && (
                                        <button
                                            onClick={() => updateForm("mediaUrl", "")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {errors.mediaUrl && <span className="text-xs text-rose-400 mt-1 block font-bold">{errors.mediaUrl}</span>}
                        </div>

                        <div>
                            <label className={labelClass}>Link de Destino (Opcional)</label>
                            <div className="flex gap-2">
                                <span className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <LinkIcon className="w-5 h-5 text-slate-400" />
                                </span>
                                <input type="url" value={form.linkDestino} onChange={(e) => updateForm("linkDestino", e.target.value)}
                                    placeholder="https://..." className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Posición</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                    <Layout className="w-4 h-4 text-slate-400" />
                                </span>
                                <select value={form.posicion} onChange={(e) => updateForm("posicion", e.target.value)}
                                    className={cn(inputClass, "pl-10 appearance-none")}>
                                    {posicionOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Fecha Inicio</label>
                            <input type="date" value={form.fechaInicio} onChange={(e) => updateForm("fechaInicio", e.target.value)}
                                className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Fecha Fin</label>
                            <input type="date" value={form.fechaFin} onChange={(e) => updateForm("fechaFin", e.target.value)}
                                className={inputClass} />
                        </div>

                        <div>
                            <label className={labelClass}>Prioridad (Orden)</label>
                            <input type="number" value={form.prioridad} onChange={(e) => updateForm("prioridad", e.target.value)}
                                placeholder="0" className={inputClass} />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mayor número = Aparece primero</p>
                        </div>
                    </div>

                    {errors.submit && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {errors.submit}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <button onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={loading}
                        className="px-5 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar Banner</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
