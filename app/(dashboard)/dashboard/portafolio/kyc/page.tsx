"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle, AlertCircle, Clock, XCircle, Loader2, Wallet, User, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadKYCDoc, getUserKYC } from "@/lib/actions/kyc";
import FileUploader from "@/components/ui/file-uploader";
import { toast } from "sonner";
import InversorUpgradeModal from "@/components/portafolio/inversor-upgrade-modal";
import { getInversorKycProfile } from "@/lib/actions/kyc-upgrade-actions";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

const requiredDocs = [
    { id: "dni_front", label: "DNI (Frente)", description: "Foto clara del frente de tu documento" },
    { id: "dni_back", label: "DNI (Dorso)", description: "Foto clara del dorso de tu documento" },
    { id: "prueba_fondos", label: "Prueba de Fondos", description: "Extracto bancario o declaración de fondos", optional: true },
];

export default function PortafolioKycPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const role = (session?.user as any)?.role as string;

    // Developer-style identity KYC state (for CLIENTE level)
    const [kycStatus, setKycStatus] = useState("PENDIENTE");
    const [uploads, setUploads] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Inversor upgrade KYC state
    const [inversorKycEstado, setInversorKycEstado] = useState<string | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const isInversor = role === "INVERSOR" || role === "ADMIN" || role === "SUPERADMIN";

    useEffect(() => {
        if (session?.user) {
            loadKycData();
        }
    }, [session]);

    const loadKycData = async () => {
        setIsLoading(true);
        try {
            const [kycRes, inversorRes] = await Promise.all([
                getUserKYC((session?.user as any).id),
                getInversorKycProfile(),
            ]);

            if (kycRes.success && kycRes.data) {
                setKycStatus(kycRes.data.kycStatus);
                const existingUploads: Record<string, string> = {};
                kycRes.data.documentacion?.forEach((doc: any) => {
                    existingUploads[doc.tipo] = doc.archivoUrl;
                });
                setUploads(existingUploads);
            }

            if (inversorRes.success && (inversorRes as any).data?.tipo === "INVERSOR") {
                setInversorKycEstado((inversorRes as any).data.estado);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleUploadComplete = async (docId: string, url: string) => {
        const res = await uploadKYCDoc((session?.user as any).id, url, docId);
        if (res.success) {
            setUploads(prev => ({ ...prev, [docId]: url }));
            if (kycStatus === "PENDIENTE") setKycStatus("EN_REVISION");
            toast.success("Documento subido correctamente.");
            router.refresh();
        } else {
            toast.error("Error al guardar el documento.");
        }
    };

    const getStatusBadge = (s: string) => ({
        VERIFICADO: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: ShieldCheck, label: "Verificado" },
        RECHAZADO: { color: "bg-rose-500/10 text-rose-600 border-rose-500/20", icon: XCircle, label: "Rechazado" },
        EN_REVISION: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock, label: "En Revisión" },
        PENDIENTE: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertCircle, label: "Pendiente" },
    }[s] ?? { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: AlertCircle, label: s });

    if (isLoading) {
        return (
            <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    const identityBadge = getStatusBadge(kycStatus);
    const IdentityIcon = identityBadge.icon;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-10 animate-fade-in">
            {/* Header */}
            <div>
                <ModuleHelp content={MODULE_HELP_CONTENT.investorKyc} />
            </div>

            {/* ─── NIVEL 1: Identidad básica (todos los roles) ────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-brand-500" />
                        Nivel 1 — Identidad
                    </h2>
                    <div className={cn("px-3 py-1.5 rounded-xl border flex items-center gap-2 font-semibold text-sm", identityBadge.color)}>
                        <IdentityIcon className="w-4 h-4" />
                        {identityBadge.label}
                    </div>
                </div>

                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6 space-y-6">
                    <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-300">
                        <h3 className="font-bold flex items-center gap-2 mb-1 text-sm">
                            <Wallet className="w-4 h-4" /> Seguridad AML
                        </h3>
                        <p className="text-xs leading-relaxed opacity-90">
                            Cumplimos normativas internacionales de prevención de lavado de dinero. Tus datos están cifrados y seguros.
                        </p>
                    </div>

                    {kycStatus === "VERIFICADO" ? (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
                            <div>
                                <p className="font-bold text-emerald-700 dark:text-emerald-300">Identidad verificada</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Tu documentación fue revisada y aprobada.</p>
                            </div>
                        </div>
                    ) : kycStatus === "EN_REVISION" ? (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                            <Clock className="w-6 h-6 text-blue-500 shrink-0" />
                            <div>
                                <p className="font-bold text-blue-700 dark:text-blue-300">Documentación en revisión</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">El equipo está revisando tu identidad. Te notificaremos en 24-48hs.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {requiredDocs.map((doc) => (
                                <div key={doc.id} className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        {doc.label}
                                        {doc.optional && <span className="text-[10px] text-slate-400">(Opcional)</span>}
                                    </label>
                                    <FileUploader
                                        label={`Subir ${doc.label}`}
                                        onUploadComplete={(url) => handleUploadComplete(doc.id, url)}
                                        currentFileUrl={uploads[doc.id]}
                                        disabled={kycStatus === "VERIFICADO"}
                                    />
                                    <p className="text-xs text-slate-500">{doc.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── NIVEL 2: KYC Inversor (solo si tiene rol INVERSOR o lo solicita CLIENTE) ── */}
            {isInversor ? (
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-500" />
                        Nivel 2 — Perfil Inversor
                    </h2>
                    <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6">
                        {inversorKycEstado === "VERIFICADO" || kycStatus === "VERIFICADO" ? (
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                <div>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">Perfil inversor verificado</p>
                                    <p className="text-sm text-slate-500">Tenés acceso completo a todas las oportunidades de inversión.</p>
                                </div>
                            </div>
                        ) : inversorKycEstado === "EN_REVISION" ? (
                            <div className="flex items-center gap-3">
                                <Clock className="w-6 h-6 text-blue-500" />
                                <div>
                                    <p className="font-bold text-blue-600">Perfil inversor en revisión</p>
                                    <p className="text-sm text-slate-500">Te notificaremos cuando sea aprobado.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-brand-500" />
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Tenés acceso completo como Inversor</p>
                                    <p className="text-sm text-slate-500">Tu cuenta está habilitada para invertir en proyectos.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            ) : (
                /* CLIENTE: CTA para solicitar upgrade */
                inversorKycEstado !== "VERIFICADO" && (
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-500" />
                            Nivel 2 — Upgrade a Inversor
                        </h2>
                        <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6">
                            {inversorKycEstado === "EN_REVISION" ? (
                                <div className="flex items-center gap-3">
                                    <Clock className="w-6 h-6 text-amber-500" />
                                    <div>
                                        <p className="font-bold text-amber-600">Solicitud de upgrade en revisión</p>
                                        <p className="text-sm text-slate-500">El equipo revisará tu solicitud en 24-48hs hábiles.</p>
                                    </div>
                                </div>
                            ) : inversorKycEstado === "RECHAZADO" ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <XCircle className="w-6 h-6 text-rose-500" />
                                        <div>
                                            <p className="font-bold text-rose-600">Solicitud rechazada</p>
                                            <p className="text-sm text-slate-500">Corregí la documentación y volvé a enviar.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-all"
                                    >
                                        Volver a solicitar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Desbloqueá el acceso a inversiones</p>
                                        <p className="text-sm text-slate-500 mt-1">Verificá tu perfil financiero para invertir en m² con ROI proyectado.</p>
                                    </div>
                                    <button
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="shrink-0 px-6 py-2.5 rounded-xl gradient-brand text-white font-bold text-sm shadow-glow transition-all active:scale-95"
                                    >
                                        Iniciar verificación
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )
            )}

            {showUpgradeModal && (
                <InversorUpgradeModal
                    onClose={() => setShowUpgradeModal(false)}
                    onSuccess={() => { setShowUpgradeModal(false); setInversorKycEstado("EN_REVISION"); }}
                />
            )}
        </div>
    );
}
