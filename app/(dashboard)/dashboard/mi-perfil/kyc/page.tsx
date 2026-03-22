"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Clock, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadKYCDoc } from "@/lib/actions/kyc";
import { toast } from "sonner";

// Mock types for user session - in real app use useSession()
const useMockSession = () => ({
    data: {
        user: {
            id: "user_123",
            name: "Developer Demo",
            email: "dev@example.com",
            kycStatus: "PENDIENTE", // Change to test states
            // documents: [] // In real app, fetch this from DB or pass as prop
        }
    }
});

const requiredDocs = [
    { id: "dni_front", label: "DNI (Frente)", description: "Foto clara del frente de tu documento" },
    { id: "dni_back", label: "DNI (Dorso)", description: "Foto clara del dorso de tu documento" },
    { id: "constancia_afip", label: "Constancia de AFIP/CUIT", description: "Comprobante de inscripción fiscal" },
    { id: "estatuto", label: "Estatuto Social (Empresas)", description: "Solo si registras una persona jurídica", optional: true },
];

export default function KYCPage() {
    // In a real implementation, we would fetch the user's current docs and status from the server
    // For now we simulate local state
    const { data: session } = useMockSession();
    const [status, setStatus] = useState(session?.user?.kycStatus || "PENDIENTE");
    const [uploads, setUploads] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const handleUpload = async (docId: string) => {
        // Defines a mock upload process
        // In real app: Open file dialog -> Upload to S3/Blob -> Get URL -> Call Server Action

        const url = prompt(`SIMULACIÓN: Ingresa URL para ${docId}`, "https://example.com/doc.pdf");
        if (!url) return;

        setLoading(prev => ({ ...prev, [docId]: true }));

        // Simulate network delay
        await new Promise(r => setTimeout(r, 1000));

        const res = await uploadKYCDoc(session.user.id, url, docId);

        if (res.success) {
            setUploads(prev => ({ ...prev, [docId]: url }));
            // If it was the first upload and status was pending, it might update to EN_REVISION automatically
            if (status === "PENDIENTE") setStatus("EN_REVISION");
        } else {
            alert("Error al subir documento");
        }
        setLoading(prev => ({ ...prev, [docId]: false }));
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case "VERIFICADO": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            case "RECHAZADO": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
            case "EN_REVISION": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
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

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
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
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        <h3 className="font-bold flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4" /> ¿Por qué KYC?
                        </h3>
                        <p className="text-xs leading-relaxed opacity-90">
                            Para cumplir con las regulaciones financieras y asegurar la transparencia en los proyectos inmobiliarios, necesitamos verificar la identidad de todos los desarrolladores.
                        </p>
                    </div>
                </div>

                {/* Upload Section */}
                <div className="md:col-span-2 space-y-4">
                    {requiredDocs.map((doc) => (
                        <div key={doc.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-brand-500/30 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                    uploads[doc.id]
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                )}>
                                    {uploads[doc.id] ? <CheckCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">
                                        {doc.label}
                                        {doc.optional && <span className="text-xs text-slate-400 ml-2 font-normal">(Opcional)</span>}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{doc.description}</p>
                                </div>
                            </div>

                            {uploads[doc.id] ? (
                                <div className="flex items-center gap-2">
                                    <a href={uploads[doc.id]} target="_blank" rel="noreferrer" className="text-xs text-brand-500 font-medium hover:underline">
                                        Ver archivo
                                    </a>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleUpload(doc.id)}
                                    disabled={loading[doc.id] || status === "VERIFICADO"}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    {loading[doc.id] ? "Subiendo..." : "Subir"}
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="pt-4 flex justify-end">
                        <button
                            disabled={status === "VERIFICADO" || Object.keys(uploads).length < 2} // At least 2 docs
                            className="px-6 py-2.5 rounded-xl gradient-brand text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            {status === "VERIFICADO" ? "Verificación Completada" :
                                status === "EN_REVISION" ? "Actualizar Documentación" :
                                    "Enviar para Revisión"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
