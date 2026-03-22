"use client";

import { useState } from "react";
import { FileText, Upload, CheckCircle, XCircle, Clock, AlertCircle, Eye, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadDocumento, updateEstadoDocumento, deleteDocumento } from "@/lib/actions/documentos";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DocumentosManagerProps {
    proyectoId: string;
    documentos: any[];
    userRole: string;
}

const tipoDocs = [
    { value: "PLANO", label: "Planos Arquitectónicos" },
    { value: "PERMISO", label: "Permisos Municipales" },
    { value: "CONTRATO", label: "Contratos Legales" },
    { value: "FACTIBILIDAD", label: "Estudios de Factibilidad" },
    { value: "OTRO", label: "Otros Documentos" },
];

export default function DocumentosManager({ proyectoId, documentos, userRole }: DocumentosManagerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [form, setForm] = useState({ titulo: "", tipo: "PLANO", descripcion: "" });

    const handleUpload = async () => {
        if (!file || !form.titulo) { toast.error("Completa los campos obligatorios"); return; }

        setLoading(true);
        try {
            // 1. Upload file
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) throw new Error(uploadData.error);

            // 2. Save document record
            const result = await uploadDocumento({
                proyectoId,
                titulo: form.titulo,
                tipo: form.tipo,
                url: uploadData.url,
                descripcion: form.descripcion
            });

            if (result.success) {
                setShowUpload(false);
                setFile(null);
                setForm({ titulo: "", tipo: "PLANO", descripcion: "" });
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, estado: string) => {
        const statusPromise = updateEstadoDocumento(id, estado).then((res) => {
            if (res.success) {
                router.refresh();
                return `Estado actualizado a ${estado}`;
            }
            throw new Error(res.error || "Error al actualizar estado");
        });

        toast.promise(statusPromise, {
            loading: 'Actualizando estado...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const handleDelete = async (id: string) => {
        const deletePromise = deleteDocumento(id).then((res) => {
            if (res.success) {
                router.refresh();
                return "Documento eliminado";
            }
            throw new Error(res.error || "Error al eliminar documento");
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando documento...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-500" />
                        Documentación del Proyecto
                    </h3>
                    <p className="text-sm text-slate-500">Gestina y aprueba los documentos legales y técnicos.</p>
                </div>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="px-4 py-2 rounded-xl gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center gap-2"
                >
                    <Upload className="w-4 h-4" /> Subir Documento
                </button>
            </div>

            {/* Upload Form */}
            {showUpload && (
                <div className="glass-card p-6 animate-slide-down border-2 border-brand-500/20">
                    <h4 className="font-bold mb-4">Nuevo Documento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Título *</label>
                            <input
                                type="text"
                                value={form.titulo}
                                onChange={e => setForm({ ...form, titulo: e.target.value })}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                placeholder="Ej: Plano Municipal Aprobado"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Tipo</label>
                            <select
                                value={form.tipo}
                                onChange={e => setForm({ ...form, tipo: e.target.value })}
                                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                                {tipoDocs.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">Archivo *</label>
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="w-full p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <button onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
                            <button onClick={handleUpload} disabled={loading} className="px-4 py-2 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50">
                                {loading ? "Subiendo..." : "Subir Documento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentos.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No hay documentos subidos aún.</p>
                    </div>
                ) : (
                    documentos.map((doc) => (
                        <div key={doc.id} className="glass-card p-4 flex flex-col justify-between group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 dark:bg-slate-700" />
                            <div className={cn("absolute top-0 left-0 w-1 h-full transition-all",
                                doc.estado === "APROBADO" ? "bg-emerald-500" :
                                    doc.estado === "RECHAZADO" ? "bg-rose-500" : "bg-amber-500"
                            )} />

                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded uppercase">{doc.tipo}</span>
                                    <div className="flex gap-1">
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-500 transition-colors">
                                            <Download className="w-4 h-4" />
                                        </a>
                                        {(userRole === "ADMIN" || userRole === "DESARROLLADOR") && (
                                            <button onClick={() => handleDelete(doc.id)} className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/20 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-white leading-tight mb-1">{doc.titulo}</h4>
                                {doc.descripcion && <p className="text-xs text-slate-500 mb-3">{doc.descripcion}</p>}
                                <p className="text-xs text-slate-400 mb-3 block">Subido el {new Date(doc.fechaSubida).toLocaleDateString()}</p>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <div className={cn("flex items-center gap-1.5 text-xs font-bold",
                                        doc.estado === "APROBADO" ? "text-emerald-500" :
                                            doc.estado === "RECHAZADO" ? "text-rose-500" : "text-amber-500"
                                    )}>
                                        {doc.estado === "APROBADO" ? <CheckCircle className="w-3.5 h-3.5" /> :
                                            doc.estado === "RECHAZADO" ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                        {doc.estado}
                                    </div>

                                    {userRole === "ADMIN" && doc.estado === "PENDIENTE" && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleStatusChange(doc.id, "RECHAZADO")} className="p-1 hover:bg-rose-100 text-rose-500 rounded"><XCircle className="w-4 h-4" /></button>
                                            <button onClick={() => handleStatusChange(doc.id, "APROBADO")} className="p-1 hover:bg-emerald-100 text-emerald-500 rounded"><CheckCircle className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
