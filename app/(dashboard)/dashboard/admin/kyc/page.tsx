"use client";

import { useState, useEffect } from "react";
import {
    ShieldCheck, CheckCircle, XCircle, FileText,
    ChevronDown, ChevronUp, Building2, User, Globe, Phone
} from "lucide-react";
import { getPendingDeveloperKyc, reviewDeveloperKyc } from "@/lib/actions/kyc-actions";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const TIPO_LABELS: Record<string, string> = {
    PERSONA_FISICA: "Persona Física",
    EMPRESA: "Empresa",
    FIDEICOMISO: "Fideicomiso",
};

const ESPECIALIDAD_LABELS: Record<string, string> = {
    BARRIOS_PRIVADOS: "Barrios Privados",
    EDIFICIOS: "Edificios",
    LOTEOS: "Loteos",
    INVERSION: "Inversión",
};

function DocLink({ url, label }: { url?: string | null; label: string }) {
    if (!url) return (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3 opacity-40">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">{label} — No presentado</span>
        </div>
    );
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 hover:shadow-md transition-all flex items-center gap-3 group"
        >
            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded text-slate-500 group-hover:text-brand-500 transition-colors">
                <FileText className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{label}</p>
                <p className="text-[10px] text-slate-400">Clic para abrir</p>
            </div>
        </a>
    );
}

export default function AdminKYCPage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Reject modal state
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchProfiles = async () => {
        setLoading(true);
        const res = await getPendingDeveloperKyc();
        if (res.success) setProfiles((res.data as any[]) || []);
        setLoading(false);
    };

    useEffect(() => { fetchProfiles(); }, []);

    const handleApprove = async (profileId: string) => {
        setSubmitting(true);
        await reviewDeveloperKyc(profileId, "APROBAR");
        await fetchProfiles();
        setSubmitting(false);
    };

    const openRejectModal = (profileId: string) => {
        setSelectedProfileId(profileId);
        setRejectNotes("");
        setRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!selectedProfileId) return;
        setSubmitting(true);
        await reviewDeveloperKyc(selectedProfileId, "RECHAZAR", rejectNotes || undefined);
        setRejectModalOpen(false);
        await fetchProfiles();
        setSubmitting(false);
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Solicitudes KYC Desarrolladores</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Revisa la información profesional y legal de los desarrolladores verificados.
                    </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                    Pendientes: {profiles.length}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : profiles.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay solicitudes pendientes</h3>
                    <p className="text-slate-500 mt-2">Todos los desarrolladores están al día.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {profiles.map((profile) => {
                        const isExpanded = expandedId === profile.id;
                        const user = profile.user;
                        const submittedAt = new Date(profile.updatedAt).toLocaleDateString("es-AR", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        });

                        return (
                            <div
                                key={profile.id}
                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                            >
                                {/* Card Header */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-lg">
                                            {user.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">{user.nombre}</h3>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {profile.tipoDeveloper && (
                                            <span className="hidden sm:inline px-2.5 py-1 rounded-full text-xs font-bold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                                                {TIPO_LABELS[profile.tipoDeveloper] ?? profile.tipoDeveloper}
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            EN REVISIÓN
                                        </span>
                                        <span className="hidden md:block text-xs text-slate-400">{submittedAt}</span>
                                        {isExpanded
                                            ? <ChevronUp className="w-5 h-5 text-slate-400" />
                                            : <ChevronDown className="w-5 h-5 text-slate-400" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-5 space-y-6">
                                        {/* Selfie + Professional Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Selfie */}
                                            {profile.selfieUrl && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selfie</p>
                                                    <img
                                                        src={profile.selfieUrl}
                                                        alt="Selfie"
                                                        onClick={() => setPreviewUrl(profile.selfieUrl)}
                                                        className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                                                    />
                                                </div>
                                            )}

                                            {/* Professional Profile */}
                                            <div className="md:col-span-2 space-y-2">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <User className="w-3 h-3" /> Perfil Profesional
                                                </p>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    {profile.tipoDeveloper && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Tipo</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{TIPO_LABELS[profile.tipoDeveloper] ?? profile.tipoDeveloper}</p>
                                                        </div>
                                                    )}
                                                    {profile.especialidad && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Especialidad</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{ESPECIALIDAD_LABELS[profile.especialidad] ?? profile.especialidad}</p>
                                                        </div>
                                                    )}
                                                    {profile.yearsExperience != null && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Años de experiencia</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{profile.yearsExperience}</p>
                                                        </div>
                                                    )}
                                                    {profile.proyectosRealizados != null && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Proyectos realizados</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{profile.proyectosRealizados}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {profile.descripcionProfesional && (
                                                    <div className="mt-2">
                                                        <span className="text-slate-400 text-xs">Descripción</span>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{profile.descripcionProfesional}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Company Info */}
                                        {(profile.razonSocial || profile.cuitEmpresa || profile.ciudad) && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Building2 className="w-3 h-3" /> Datos de Empresa / Oficina
                                                </p>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    {profile.razonSocial && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Razón Social</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{profile.razonSocial}</p>
                                                        </div>
                                                    )}
                                                    {profile.nombreComercial && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Nombre Comercial</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{profile.nombreComercial}</p>
                                                        </div>
                                                    )}
                                                    {profile.cuitEmpresa && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">CUIT</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{profile.cuitEmpresa}</p>
                                                        </div>
                                                    )}
                                                    {profile.ciudad && (
                                                        <div>
                                                            <span className="text-slate-400 text-xs">Ciudad</span>
                                                            <p className="font-medium text-slate-800 dark:text-slate-200">{profile.ciudad}{profile.provincia ? `, ${profile.provincia}` : ""}</p>
                                                        </div>
                                                    )}
                                                    {profile.telefonoComercial && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <div>
                                                                <span className="text-slate-400 text-xs">Teléfono</span>
                                                                <p className="font-medium text-slate-800 dark:text-slate-200">{profile.telefonoComercial}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {profile.sitioWeb && (
                                                        <div className="flex items-center gap-1">
                                                            <Globe className="w-3 h-3 text-slate-400" />
                                                            <div>
                                                                <span className="text-slate-400 text-xs">Sitio Web</span>
                                                                <a href={profile.sitioWeb} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-500 hover:underline text-xs truncate max-w-[120px] block">
                                                                    {profile.sitioWeb}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Identity Docs (from user.documentacion) */}
                                        {user.documentacion && user.documentacion.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentación de Identidad</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                    {user.documentacion.map((doc: any) => (
                                                        <div
                                                            key={doc.id}
                                                            onClick={() => setPreviewUrl(doc.archivoUrl)}
                                                            className="cursor-pointer p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 hover:shadow-md transition-all flex items-center gap-3 group"
                                                        >
                                                            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded text-slate-500 group-hover:text-brand-500 transition-colors">
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-700 dark:text-gray-200 capitalize">{doc.tipo.replace(/_/g, " ")}</p>
                                                                <p className="text-[10px] text-slate-400">Clic para ver</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Legal Docs */}
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentación Legal</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <DocLink url={profile.estatutoUrl} label="Estatuto / Contrato Social" />
                                                <DocLink url={profile.matriculaUrl} label="Matrícula Profesional" />
                                                <DocLink url={profile.constanciaBancariaUrl} label="Constancia Bancaria" />
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <button
                                                onClick={() => openRejectModal(profile.id)}
                                                disabled={submitting}
                                                className="px-4 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" /> Rechazar
                                            </button>
                                            <button
                                                onClick={() => handleApprove(profile.id)}
                                                disabled={submitting}
                                                className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Aprobar Desarrollador
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Reject Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rechazar Verificación de Desarrollador</DialogTitle>
                        <DialogDescription>
                            Indica el motivo del rechazo. El desarrollador recibirá una notificación y podrá volver a presentar la documentación.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                        placeholder="Ej: La documentación legal está incompleta..."
                    />
                    <DialogFooter>
                        <button
                            onClick={() => setRejectModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmReject}
                            disabled={submitting}
                            className={cn(
                                "px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-bold",
                                "disabled:opacity-50"
                            )}
                        >
                            Confirmar Rechazo
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Document Preview Modal */}
            <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
                <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-black/90 border-none">
                    <div className="w-full h-full flex items-center justify-center relative">
                        <button
                            onClick={() => setPreviewUrl(null)}
                            className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                        {previewUrl && (
                            previewUrl.endsWith(".pdf")
                                ? <iframe src={previewUrl} className="w-full h-full" title="Documento" />
                                : <img src={previewUrl} alt="Documento" className="max-w-full max-h-full object-contain" />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
