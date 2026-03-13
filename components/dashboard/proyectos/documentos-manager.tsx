"use client";

import { useState, useRef } from "react";
import { 
    FileText, Upload, CheckCircle, XCircle, Clock, AlertCircle, 
    Eye, Trash2, Download, Plus, Layers, FileIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addDocumentoProyecto, updateEstadoDocumentoProyecto, deleteDocumentoProyecto, reviewAllProjectDocs } from "@/lib/actions/proyectos";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DocumentosManagerProps {
    proyectoId: string;
    documentos: any[];
    userRole: string;
    docStatus?: string; // Status of the whole project documentation folder
}

const requiredDocs = [
    { type: "MUNICIPAL_APPROVAL", label: "Aprobación Municipal", category: "LEGAL" },
    { type: "FEASIBILITY_STUDY", label: "Estudio de Factibilidad", category: "TECNICO" },
    { type: "ENVIRONMENTAL_IMPACT", label: "Impacto Ambiental", category: "TECNICO" },
];

export default function DocumentosManager({ proyectoId, documentos, userRole, docStatus = "PENDIENTE" }: DocumentosManagerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({ nombre: "", tipo: "PLANO", categoria: "GENERAL" });

    const isAdmin = userRole === "ADMIN";

    const handleUpload = async (customType?: string, customName?: string) => {
        const docFile = file || (fileInputRef.current?.files?.[0]);
        if (!docFile) return toast.error("Selecciona un archivo");

        const tipo = customType || form.tipo;
        const nombre = customName || form.nombre || docFile.name;

        setLoading("uploading");
        try {
            const formData = new FormData();
            formData.append("file", docFile);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) throw new Error(uploadData.error);

            const result = await addDocumentoProyecto({
                proyectoId,
                nombre,
                tipo,
                categoria: form.categoria,
                url: uploadData.url
            });

            if ("success" in result && result.success) {
                toast.success("Documento subido");
                setShowUpload(false);
                setFile(null);
                setForm({ nombre: "", tipo: "PLANO", categoria: "GENERAL" });
                router.refresh();
            } else {
                toast.error((result as any).error || "Error desconocido");
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleStatusChange = async (id: string, estado: "APROBADO" | "RECHAZADO") => {
        const res = await updateEstadoDocumentoProyecto(id, estado);
        if ("success" in res && res.success) {
            toast.success(`Estado actualizado a ${estado}`);
            router.refresh();
        } else {
            toast.error((res as any).error || "Error al actualizar estado");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Deseas eliminar este documento?")) return;
        const res = await deleteDocumentoProyecto(id, proyectoId);
        if (res.success) {
            toast.success("Documento eliminado");
            router.refresh();
        } else {
            toast.error((res as any).error || "Error al eliminar documento");
        }
    };

    const handleReviewAll = async (status: "APROBADO" | "RECHAZADO") => {
        const res = await reviewAllProjectDocs(proyectoId, status);
        if (res.success) {
            toast.success(`Carpeta marcada como ${status}`);
            router.refresh();
        } else {
            toast.error((res as any).error || "Error al revisar documentos");
        }
    };

    const standardDocs = requiredDocs.map(req => ({
        ...req,
        existing: documentos.find(d => d.tipo === req.type)
    }));

    const otherDocs = documentos.filter(d => !requiredDocs.some(r => r.type === d.tipo));

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Status Header */}
            <div className="flex items-center justify-between p-6 glass-card border-brand-500/20 bg-brand-500/5">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        Carpeta Técnica
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            docStatus === "APROBADO" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                docStatus === "RECHAZADO" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                                    "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        )}>
                            {docStatus}
                        </span>
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Gestión centralizada de planos, permisos y certificados legales.</p>
                </div>
                {isAdmin && docStatus !== "APROBADO" && (
                    <div className="flex gap-2">
                        <button onClick={() => handleReviewAll("RECHAZADO")} className="px-4 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-sm">Rechazar Todo</button>
                        <button onClick={() => handleReviewAll("APROBADO")} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all">Aprobar Carpeta</button>
                    </div>
                )}
            </div>

            {/* Required Documents Grid */}
            <div>
                <h4 className="font-bold mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-500" /> Documentos Obligatorios</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {standardDocs.map(req => (
                        <div key={req.type} className="glass-card p-5 group flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-2 rounded-xl", req.existing ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500")}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                {req.existing && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <h5 className="font-bold text-sm mb-1">{req.label}</h5>
                            <p className="text-xs text-slate-500 mb-4">{req.category}</p>
                            
                            {req.existing ? (
                                <div className="flex gap-2 mt-auto">
                                    <a href={req.existing.archivoUrl} target="_blank" rel="noreferrer" className="flex-1 py-1.5 rounded-lg bg-slate-800 text-center text-[10px] font-bold hover:bg-slate-700 transition-colors">VER</a>
                                    {isAdmin && req.existing.estado === "PENDIENTE" && (
                                        <button onClick={() => handleStatusChange(req.existing.id, "APROBADO")} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                !isAdmin && (
                                    <label className="cursor-pointer py-1.5 rounded-lg border-2 border-dashed border-slate-700 text-center text-[10px] font-bold text-slate-500 hover:border-brand-500 hover:text-brand-500 transition-all">
                                        SUBIR ARCHIVO
                                        <input type="file" className="hidden" onChange={() => handleUpload(req.type, req.label)} />
                                    </label>
                                )
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Other Documents Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-brand-500" /> Archivos Adicionales</h4>
                    {!isAdmin && (
                        <button onClick={() => setShowUpload(true)} className="px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-bold flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Nuevo Documento
                        </button>
                    )}
                </div>

                {showUpload && (
                    <div className="glass-card p-6 mb-6 border-brand-500/30 border-2 animate-slide-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Nombre del documento" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="bg-slate-800 border-none rounded-xl p-2.5 text-sm" />
                            <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="bg-slate-800 border-none rounded-xl p-2.5 text-sm">
                                <option value="GENERAL">General</option>
                                <option value="TECNICO">Técnico/Planos</option>
                                <option value="LEGAL">Legal</option>
                                <option value="COMERCIAL">Comercial</option>
                            </select>
                            <input type="file" ref={fileInputRef} className="md:col-span-2 text-xs text-slate-400" />
                            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                                <button onClick={() => handleUpload()} disabled={!!loading} className="px-5 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold">Subir</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {otherDocs.map(doc => (
                        <div key={doc.id} className="glass-card p-4 group flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-brand-400 transition-colors">
                                <FileIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-bold truncate">{doc.nombre || doc.tipo}</h5>
                                <div className="flex gap-2 mt-1">
                                    <a href={doc.archivoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-brand-500 font-bold hover:underline">VER</a>
                                    {!isAdmin && <button onClick={() => handleDelete(doc.id)} className="text-[10px] text-rose-500 font-bold hover:underline">ELIMINAR</button>}
                                </div>
                            </div>
                            {doc.estado === "APROBADO" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
