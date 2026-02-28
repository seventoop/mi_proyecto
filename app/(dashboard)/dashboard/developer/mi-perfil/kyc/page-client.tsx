"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle, AlertCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadKYCDoc, getUserKYC } from "@/lib/actions/kyc";
import FileUploader from "@/components/ui/file-uploader";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const requiredDocs = [
    { id: "dni_front", label: "DNI (Frente)", description: "Foto clara del frente de tu documento", required: true },
    { id: "dni_back", label: "DNI (Dorso)", description: "Foto clara del dorso de tu documento", required: true },
    { id: "prueba_domicilio", label: "Prueba de Domicilio", description: "Servicio a tu nombre con antigüedad menor a 3 meses", required: true },
    { id: "afip", label: "Constancia de AFIP/CUIT", description: "Comprobante de inscripción fiscal", required: true },
];

export default function KYCPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [status, setStatus] = useState("PENDIENTE");
    const [uploads, setUploads] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            fetchKYCStatus();
        }
    }, [session]);

    const fetchKYCStatus = async () => {
        setIsLoading(true);
        try {
            const res = await getUserKYC((session?.user as any).id);
            if (res.success && res.data) {
                setStatus(res.data.kycStatus);
                const existingUploads: Record<string, string> = {};
                res.data.documentacion.forEach((doc: any) => {
                    existingUploads[doc.tipo] = doc.archivoUrl;
                });
                setUploads(existingUploads);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadComplete = async (docId: string, url: string) => {
        const res = await uploadKYCDoc((session?.user as any).id, url, docId);

        if (res.success) {
            setUploads(prev => ({ ...prev, [docId]: url }));
            toast.success("Documento guardado correctamente");

            // Check if all required docs are uploaded to update status
            const currentUploads = { ...uploads, [docId]: url };
            const allRequiredUploaded = requiredDocs
                .filter(d => d.required)
                .every(d => currentUploads[d.id]);

            if (allRequiredUploaded && status === "PENDIENTE") {
                setStatus("EN_REVISION");
                toast.success("¡Todos los documentos subidos! Tu perfil está en revisión.");
                router.refresh();
            }
        } else {
            toast.error("Error al guardar el documento");
        }
    };

    const handleRemoveDoc = async (docId: string) => {
        try {
            const res = await uploadKYCDoc((session?.user as any).id, "", docId); // Effectively clears it in our logic if we handle empty URL as null or use the delete action
            // Or better, let's use the delete action I just created
            const { deleteKYCDoc } = await import("@/lib/actions/kyc");
            const delRes = await deleteKYCDoc((session?.user as any).id, docId);

            if (delRes.success) {
                setUploads(prev => {
                    const newUploads = { ...prev };
                    delete newUploads[docId];
                    return newUploads;
                });
                toast.success("Documento removido");

                // If status was revision, it might need to go back to pending if critical docs are missing
                const stillRevision = requiredDocs
                    .filter(d => d.required)
                    .every(d => d.id === docId ? false : uploads[d.id]);

                if (!stillRevision && status === "EN_REVISION") {
                    setStatus("PENDIENTE");
                }
            }
        } catch (error) {
            toast.error("Error al eliminar el documento");
        }
    };

    // ... rest of the component (getStatusColor, getStatusIcon, render) ...
    const getStatusColor = (s: string) => {
        switch (s) {
            case "VERIFICADO": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            case "RECHAZADO": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
            case "EN_REVISION": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
            default: return "bg-amber-500/10 text-amber-600 border-amber-500/20";
        }
    };

    const getStatusIcon = (s: string) => {
        switch (s) {
            case "VERIFICADO": return ShieldCheck;
            case "RECHAZADO": return XCircle;
            case "EN_REVISION": return Clock;
            default: return AlertCircle;
        }
    };

    const StatusIcon = getStatusIcon(status);

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Verificación de Identidad</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Completa tu perfil para poder publicar proyectos y recibir inversiones.
                    </p>
                </div>
                <div className={cn("px-4 py-2 rounded-xl border flex items-center gap-2 font-semibold", getStatusColor(status))}>
                    <StatusIcon className="w-5 h-5" />
                    <span>{status === "PENDIENTE" ? "Pendiente de envío" : status.replace("_", " ")}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <div className="md:col-span-1 space-y-4">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4" /> ¿Por qué KYC?
                        </h3>
                        <p className="text-xs leading-relaxed opacity-90">
                            Para cumplir con las regulaciones financieras y asegurar la transparencia en los proyectos inmobiliarios, necesitamos verificar la identidad de todos los desarrolladores.
                        </p>
                    </div>
                    {status === "VERIFICADO" && (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                            <h3 className="font-bold flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4" /> Verificación Completada
                            </h3>
                            <p className="text-xs leading-relaxed opacity-90">
                                Tu cuenta está totalmente verificada. Ya puedes publicar proyectos sin restricciones.
                            </p>
                        </div>
                    )}
                </div>

                {/* Upload Section */}
                <div className="md:col-span-2 space-y-4">
                    {requiredDocs.map((doc) => (
                        <div key={doc.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    {doc.label}
                                    {doc.required ?
                                        <span className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded">* Requerido</span>
                                        : <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                                    }
                                    {uploads[doc.id] && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                </label>
                            </div>

                            <FileUploader
                                label={`Subir ${doc.label}`}
                                onUploadComplete={(url) => handleUploadComplete(doc.id, url)}
                                onRemove={() => handleRemoveDoc(doc.id)}
                                currentFileUrl={uploads[doc.id]}
                                disabled={status === "VERIFICADO"}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">{doc.description}</p>
                        </div>
                    ))}

                    <div className="pt-4 flex justify-end">
                        <button
                            disabled={true} // Action is automatic on upload
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-semibold shadow-glow transition-all opacity-50 cursor-default",
                                status === "VERIFICADO" ? "bg-emerald-500 text-white" : "gradient-brand text-white"
                            )}
                        >
                            {status === "VERIFICADO" ? "Verificación Completada" :
                                status === "EN_REVISION" ? "En Revisión" :
                                    "Sube los documentos requeridos"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
