"use client";

import { useState, useRef } from "react";
import { FileText, Upload, CheckCircle, XCircle, Clock, AlertCircle, Plus, Trash2, FileIcon, FileType, Download, Layers } from "lucide-react";
import { uploadProjectDoc, reviewProjectDocs } from "@/lib/actions/kyc";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProjectDocsTabProps {
    proyectoId: string;
    docs: any[];
    docStatus: string; // PENDIENTE, EN_REVISION, APROBADO, RECHAZADO
    userRole?: string; // "ADMIN" | "DESARROLLADOR"
}

const requiredDocs = [
    { type: "MUNICIPAL_APPROVAL", label: "Aprobación Municipal", description: "Documento oficial de aprobación del municipio." },
    { type: "FEASIBILITY_STUDY", label: "Estudio de Factibilidad", description: "Análisis técnico y financiero del proyecto." },
    { type: "ENVIRONMENTAL_IMPACT", label: "Impacto Ambiental", description: "Certificado de aptitud ambiental." },
];

export default function ProjectDocsTab({ proyectoId, docs, docStatus, userRole = "DESARROLLADOR" }: ProjectDocsTabProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadType, setActiveUploadType] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeUploadType) return;

        setLoading(prev => ({ ...prev, [activeUploadType]: true }));
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            await uploadProjectDoc(proyectoId, data.url, activeUploadType);
            toast.success("Documento subido correctamente");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message || "Error al subir documento");
        } finally {
            setLoading(prev => ({ ...prev, [activeUploadType]: false }));
            setActiveUploadType(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const triggerUpload = (type: string) => {
        setActiveUploadType(type);
        fileInputRef.current?.click();
    };

    const handleUploadPlan = async () => {
        const planName = prompt("Nombre del plano o documento técnico:");
        if (!planName) return;
        triggerUpload(`PLANO_${planName.toUpperCase().replace(/\s+/g, "_")}`);
    };

    const handleReview = async (status: "APROBADO" | "RECHAZADO") => {
        if (!confirm(`¿Confirmas que deseas MARCAR como ${status} la documentación técnica?`)) return;
        await reviewProjectDocs(proyectoId, status);
        router.refresh();
    };

    const isAdmin = userRole === "ADMIN";

    // Categorize docs
    const standardDocs = requiredDocs.map(req => ({
        ...req,
        existing: docs.find(d => d.tipo === req.type)
    }));

    const otherDocs = docs.filter(d => !requiredDocs.some(r => r.type === d.tipo));

    return (
        <div className="space-y-8">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Status Banner */}
            <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                        Estado de Carpeta Técnica
                        <span className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                            docStatus === "APROBADO" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                docStatus === "RECHAZADO" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                    "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        )}>
                            {docStatus.replace("_", " ")}
                        </span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        {docStatus === "APROBADO"
                            ? "Toda la documentación técnica ha sido verificada satisfactoriamente."
                            : "Sube los planos y certificados necesarios para la validación del proyecto."}
                    </p>
                </div>

                {isAdmin && docStatus !== "APROBADO" && (
                    <div className="flex gap-2">
                        <button onClick={() => handleReview("RECHAZADO")} className="px-5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/5 text-sm font-bold transition-all">Rechazar</button>
                        <button onClick={() => handleReview("APROBADO")} className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all">Aprobar Carpeta</button>
                    </div>
                )}
            </div>

            {/* Required Docs Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-brand-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white">Documentación Obligatoria</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {standardDocs.map((req) => (
                        <DocumentCard
                            key={req.type}
                            label={req.label}
                            description={req.description}
                            existingDoc={req.existing}
                            loading={loading[req.type]}
                            onUpload={() => triggerUpload(req.type)}
                            isAdmin={isAdmin}
                        />
                    ))}
                </div>
            </div>

            {/* Blueprints / Extra Docs Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-brand-500" />
                        <h4 className="font-bold text-slate-800 dark:text-white">Planos y Archivos Técnicos</h4>
                    </div>
                    {!isAdmin && (
                        <button
                            onClick={handleUploadPlan}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                        >
                            <Plus className="w-4 h-4" /> Importar Plano
                        </button>
                    )}
                </div>

                {otherDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {otherDocs.map((doc) => (
                            <div key={doc.id} className="glass-card p-4 flex items-center gap-4 group hover:border-brand-500/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                                    <FileIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                        {doc.tipo.replace("PLANO_", "").replace(/_/g, " ")}
                                    </p>
                                    <a href={doc.archivoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-brand-500 font-bold hover:underline flex items-center gap-1">
                                        <Download className="w-3 h-3" /> VER / DESCARGAR
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-sm text-slate-500">No hay planos adicionales cargados.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DocumentCard({ label, description, existingDoc, loading, onUpload, isAdmin }: any) {
    return (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col group hover:border-brand-500/30 transition-all shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl", existingDoc ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400")}>
                    <FileText className="w-6 h-6" />
                </div>
                {existingDoc && (
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">ENVIADO</span>
                )}
            </div>

            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{label}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{description}</p>

            <div className="mt-auto">
                {existingDoc ? (
                    <a href={existingDoc.archivoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700">
                        VER DOCUMENTO
                    </a>
                ) : (
                    <button
                        onClick={onUpload}
                        disabled={loading || isAdmin}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-bold hover:border-brand-500 hover:text-brand-500 hover:bg-brand-500/5 transition-all disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4" /> {loading ? "IMPORTANDO..." : "IMPORTAR ARCHIVO"}
                    </button>
                )}
            </div>
        </div>
    );
}

