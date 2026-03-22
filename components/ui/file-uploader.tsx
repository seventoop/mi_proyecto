"use client";

import { useState, useRef } from "react";
import { UploadCloud, X, FileText, CheckCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploaderProps {
    onUploadComplete: (url: string) => void;
    label?: string;
    accept?: string;
    maxSizeMB?: number;
    disabled?: boolean;
    currentFileUrl?: string;
    children?: React.ReactNode;
    className?: string;
    variant?: "default" | "icon";
    /**
     * docMode: when true, uploaded files are shown as "Cargado – En revisión"
     * (amber/neutral) instead of green "válido". Use for KYC identity documents
     * that require manual admin review before being considered verified.
     */
    docMode?: boolean;
}

/** Basic client-side doc-like image heuristics (Opción B). */
async function checkDocumentHeuristics(file: File): Promise<{ ok: boolean; warning?: string }> {
    if (!file.type.startsWith("image/")) return { ok: true };

    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const w = img.naturalWidth;
            const h = img.naturalHeight;

            if (w < 200 || h < 150) {
                return resolve({ ok: false, warning: "La imagen es demasiado pequeña. Usá una foto nítida y a buena resolución." });
            }

            const ratio = Math.max(w, h) / Math.min(w, h);
            if (ratio > 4) {
                return resolve({ ok: false, warning: "Las proporciones no corresponden a un documento. Asegurate de fotografiar el documento completo." });
            }

            resolve({ ok: true });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ ok: true });
        };
        img.src = url;
    });
}

export default function FileUploader({
    onUploadComplete,
    label = "Subir archivo",
    accept = "image/*,.pdf",
    maxSizeMB = 5,
    disabled = false,
    currentFileUrl,
    children,
    onRemove,
    className,
    variant = "default",
    docMode = false,
}: FileUploaderProps & { onRemove?: () => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file) return;

        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`El archivo excede los ${maxSizeMB}MB permitidos`);
            return;
        }

        if (docMode) {
            const { ok, warning } = await checkDocumentHeuristics(file);
            if (!ok) {
                toast.error(warning ?? "El archivo no parece ser un documento de identidad válido.");
                return;
            }
        }

        setIsUploading(true);
        setFileName(file.name);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            onUploadComplete(data.url);
            toast.success(docMode ? "Documento cargado — quedará pendiente de revisión" : "Archivo subido correctamente");
        } catch (error: any) {
            toast.error(error.message || "Error al subir el archivo");
            setFileName(null);
        } finally {
            setIsUploading(false);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    if (currentFileUrl) {
        if (docMode) {
            return (
                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-amber-300 truncate">
                                    {fileName || "Documento cargado"}
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">
                                    En revisión
                                </span>
                            </div>
                            <a
                                href={currentFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-500/70 hover:text-amber-400 hover:underline inline-flex items-center gap-1"
                            >
                                Ver documento
                            </a>
                        </div>
                    </div>
                    {!disabled && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 hover:bg-amber-500/10 rounded-lg text-amber-400 transition-colors text-xs font-medium"
                                title="Cambiar archivo"
                            >
                                Cambiar
                            </button>
                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                    className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-colors"
                                    title="Eliminar archivo"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                                className="hidden"
                            />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300 truncate">
                            {fileName || "Archivo cargado"}
                        </p>
                        <a
                            href={currentFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                            Ver documento
                        </a>
                    </div>
                </div>
                {!disabled && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 hover:bg-emerald-200/50 rounded-lg text-emerald-600 transition-colors text-xs font-medium"
                            title="Cambiar archivo"
                        >
                            Cambiar
                        </button>
                        {onRemove && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 transition-colors"
                                title="Eliminar archivo"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={accept}
                            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                            className="hidden"
                        />
                    </div>
                )}
            </div>
        );
    }

    if (variant === "icon") {
        return (
            <div
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                className={cn("cursor-pointer relative", className, disabled && "opacity-50 cursor-not-allowed")}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                    className="hidden"
                    disabled={disabled || isUploading}
                />
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
            </div>
        );
    }

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={cn(
                "relative group cursor-pointer border-2 border-dashed rounded-xl p-6 transition-all duration-200 flex flex-col items-center justify-center text-center gap-3",
                isDragging
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-900/20 scale-[1.02]"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-brand-300 dark:hover:border-slate-600",
                (disabled || isUploading) && "opacity-50 cursor-not-allowed pointer-events-none",
                className
            )}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                className="hidden"
                disabled={disabled || isUploading}
            />

            {isUploading ? (
                <>
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Subiendo archivo...</p>
                        <p className="text-xs text-slate-500">Por favor espere</p>
                    </div>
                </>
            ) : (
                <>
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <UploadCloud className="w-5 h-5 text-brand-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {label}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Arrastra o haz clic para subir (Max {maxSizeMB}MB)
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
