"use client";

import { useState, useEffect, useRef } from "react";
import {
    FileText,
    Upload,
    Trash2,
    Plus,
    Eye,
    EyeOff,
    Loader2,
    FileIcon,
    Download,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { getProyectoArchivos, addProyectoArchivo, deleteProyectoArchivo } from "@/lib/actions/proyectos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProyectoArchivo {
    id: string;
    proyectoId: string;
    tipo: string;
    nombre: string;
    url: string;
    visiblePublicamente: boolean;
    createdAt: Date | string;
}

interface ProjectTechnicalFilesProps {
    proyectoId: string;
    readOnly?: boolean;
}

const FILE_TYPES = ["PLANO", "MEMORIA", "LEGAL", "RENDER", "OTRO"];

export default function ProjectTechnicalFiles({ proyectoId, readOnly = false }: ProjectTechnicalFilesProps) {
    const [archivos, setArchivos] = useState<ProyectoArchivo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state for new file
    const [newFile, setNewFile] = useState({
        nombre: "",
        tipo: "PLANO",
        visiblePublicamente: false
    });

    useEffect(() => {
        loadArchivos();
    }, [proyectoId]);

    async function loadArchivos() {
        setLoading(true);
        const res = await getProyectoArchivos(proyectoId);
        if (res.success) {
            setArchivos(res.data);
        }
        setLoading(false);
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!newFile.nombre) {
            toast.error("Por favor, ingresa un nombre para el archivo");
            return;
        }

        setUploading(true);
        const toastId = toast.loading("Importando archivo técnico...");
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const uploadData = await res.json();
            if (!uploadData.success) throw new Error(uploadData.error);

            const addRes = await addProyectoArchivo({
                proyectoId,
                url: uploadData.url,
                nombre: newFile.nombre,
                tipo: newFile.tipo,
                visiblePublicamente: newFile.visiblePublicamente
            });

            if (addRes.success) {
                toast.success("Archivo importado correctamente", { id: toastId });
                setNewFile({ nombre: "", tipo: "PLANO", visiblePublicamente: false });
                loadArchivos();
            } else {
                throw new Error(addRes.error);
            }
        } catch (error: any) {
            toast.error(error.message || "Error al importar archivo", { id: toastId });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este archivo técnico?")) return;

        const res = await deleteProyectoArchivo(id, proyectoId);
        if (res.success) {
            toast.success("Archivo eliminado");
            loadArchivos();
        } else {
            toast.error("Error al eliminar archivo");
        }
    };

    if (loading && archivos.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!readOnly && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Plus className="w-4 h-4 text-brand-500" />
                            Importar Archivo Técnico
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                            Planos, memorias, documentos legales (PDF, DWG, ZIP, etc.)
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Nombre del Archivo</label>
                            <input
                                type="text"
                                value={newFile.nombre}
                                onChange={(e) => setNewFile(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Eje: Plano de Zonificación"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Categoría</label>
                            <select
                                value={newFile.tipo}
                                onChange={(e) => setNewFile(prev => ({ ...prev, tipo: e.target.value }))}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all font-medium"
                            >
                                {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={() => setNewFile(prev => ({ ...prev, visiblePublicamente: !prev.visiblePublicamente }))}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    newFile.visiblePublicamente ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                )}
                                title={newFile.visiblePublicamente ? "Visible al público" : "Privado (Solo desarrollador/admin)"}
                            >
                                {newFile.visiblePublicamente ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                            <span className="text-xs text-slate-500 font-bold">{newFile.visiblePublicamente ? "PÚBLICO" : "PRIVADO"}</span>
                        </div>
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,.zip,.dwg,.dxf,.doc,.docx,.xls,.xlsx"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || !newFile.nombre}
                                className="w-full h-[42px] flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? "Importando..." : "Importar Archivo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visibilidad</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {archivos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No hay archivos técnicos cargados para este proyecto.
                                    </td>
                                </tr>
                            ) : (
                                archivos.map((archivo) => (
                                    <tr key={archivo.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                                                    <FileIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{archivo.nombre}</p>
                                                    <p className="text-[10px] text-slate-400">{new Date(archivo.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black tracking-wider uppercase">
                                                {archivo.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                {archivo.visiblePublicamente ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase">Público</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                        <XCircle className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Privado</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={archivo.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-500/5 transition-all"
                                                    title="Ver / Descargar"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                {!readOnly && (
                                                    <button
                                                        onClick={() => handleDelete(archivo.id)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
