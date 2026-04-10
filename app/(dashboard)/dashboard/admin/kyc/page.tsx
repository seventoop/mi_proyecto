"use client";

import { useState, useEffect } from "react";
import {
    ShieldCheck, CheckCircle, XCircle, FileText,
    ChevronDown, ChevronUp, Building2, User, Globe, Phone,
    Users, TrendingUp
} from "lucide-react";
import { getPendingDeveloperKyc, reviewDeveloperKyc } from "@/lib/actions/kyc-actions";
import { getPendingInversorKyc, approveInversorUpgrade, rejectInversorUpgrade } from "@/lib/actions/kyc-upgrade-actions";
import { cn } from "@/lib/utils";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
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
        <div className="p-3 rounded-xl bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] flex items-center gap-3 opacity-40">
            <FileText className="w-5 h-5 text-slate-500" />
            <span className="text-xs uppercase font-black tracking-widest text-slate-500">{label} — N/A</span>
        </div>
    );
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:bg-white/[0.02] hover:border-brand-500/30 transition-all flex items-center gap-3 group"
        >
            <div className="bg-slate-50 dark:bg-white/[0.04] p-2 rounded-lg text-slate-500 group-hover:text-brand-500 transition-colors">
                <FileText className="w-5 h-5" />
            </div>
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{label}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Clic para abrir</p>
            </div>
        </a>
    );
}

export default function AdminKYCPage() {
    const [view, setView] = useState<'DEVELOPER' | 'INVERSOR'>('DEVELOPER');
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
        setProfiles([]);
        setExpandedId(null);

        let res;
        if (view === 'DEVELOPER') {
            res = await getPendingDeveloperKyc();
        } else {
            res = await getPendingInversorKyc();
        }

        if (res.success) setProfiles((res.data as any[]) || []);
        setLoading(false);
    };

    useEffect(() => { fetchProfiles(); }, [view]);

    const handleApprove = async (profileId: string) => {
        setSubmitting(true);
        try {
            if (view === 'DEVELOPER') {
                await reviewDeveloperKyc(profileId, "APROBAR");
            } else {
                await approveInversorUpgrade(profileId);
            }
            await fetchProfiles();
        } finally {
            setSubmitting(false);
        }
    };

    const openRejectModal = (profileId: string) => {
        setSelectedProfileId(profileId);
        setRejectNotes("");
        setRejectModalOpen(true);
    };

    const confirmReject = async () => {
        if (!selectedProfileId) return;
        setSubmitting(true);
        try {
            if (view === 'DEVELOPER') {
                await reviewDeveloperKyc(selectedProfileId, "RECHAZAR", rejectNotes || undefined);
            } else {
                await rejectInversorUpgrade(selectedProfileId, rejectNotes);
            }
            setRejectModalOpen(false);
            await fetchProfiles();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <ModuleHelp content={MODULE_HELP_CONTENT.adminKyc} />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8">
                <div className="flex bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] p-1.5 rounded-xl w-fit">
                    <button
                        onClick={() => setView('DEVELOPER')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                            view === 'DEVELOPER'
                                ? "bg-white dark:bg-white/[0.04] text-brand-500 shadow-sm dark:shadow-none font-black"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold"
                        )}
                    >
                        <Users className="w-4 h-4" /> Desarrolladores
                    </button>
                    <button
                        onClick={() => setView('INVERSOR')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                            view === 'INVERSOR'
                                ? "bg-white dark:bg-white/[0.04] text-brand-500 shadow-sm dark:shadow-none font-black"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold"
                        )}
                    >
                        <TrendingUp className="w-4 h-4" /> Inversores
                    </button>
                </div>
                <div className="bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-black text-slate-600 dark:text-slate-400">
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
                <div className="text-center py-20 bg-slate-50 dark:bg-[#0A0A0C] rounded-3xl border border-slate-200 dark:border-white/[0.06]">
                    <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-white/10 mx-auto mb-4" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-400">No hay solicitudes pendientes</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Todas las revisiones de {view === 'DEVELOPER' ? 'desarrolladores' : 'inversores'} están al día.</p>
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
                                className="bg-white dark:bg-[#0A0A0C] rounded-2xl border border-slate-200 dark:border-white/[0.06] overflow-hidden"
                            >
                                {/* Card Header */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-black text-xs">
                                            {user.nombre.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-[12px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{user.nombre}</h3>
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {profile.tipoDeveloper && (
                                            <span className="hidden sm:inline px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest bg-violet-500/10 text-violet-600 dark:text-violet-500 border border-transparent">
                                                {TIPO_LABELS[profile.tipoDeveloper] ?? profile.tipoDeveloper}
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-transparent">
                                            EN REVISIÓN
                                        </span>
                                        <span className="hidden md:block text-xs font-bold uppercase tracking-widest text-slate-500">{submittedAt}</span>
                                        {isExpanded
                                            ? <ChevronUp className="w-5 h-5 text-slate-400" />
                                            : <ChevronDown className="w-5 h-5 text-slate-400" />
                                        }
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-black/20 p-6 space-y-6">
                                        {view === 'DEVELOPER' ? (
                                            /* ─── VISTA DESARROLLADOR ────────────────────────────── */
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {profile.selfieUrl && (
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Selfie</p>
                                                            <img
                                                                src={profile.selfieUrl}
                                                                alt="Selfie"
                                                                onClick={() => setPreviewUrl(profile.selfieUrl)}
                                                                className="w-24 h-24 rounded-2xl object-cover border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:border-brand-500/50 transition-colors"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="md:col-span-2 space-y-2">
                                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <User className="w-3 h-3" /> Perfil Profesional
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            {profile.tipoDeveloper && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Tipo</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{TIPO_LABELS[profile.tipoDeveloper] ?? profile.tipoDeveloper}</p>
                                                                </div>
                                                            )}
                                                            {profile.especialidad && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Especialidad</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{ESPECIALIDAD_LABELS[profile.especialidad] ?? profile.especialidad}</p>
                                                                </div>
                                                            )}
                                                            {profile.yearsExperience != null && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Años exp.</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{profile.yearsExperience}</p>
                                                                </div>
                                                            )}
                                                            {profile.proyectosRealizados != null && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Proyectos</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{profile.proyectosRealizados}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {profile.descripcionProfesional && (
                                                            <div className="mt-2">
                                                                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Descripción</span>
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-400 mt-0.5 leading-relaxed">{profile.descripcionProfesional}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {(profile.razonSocial || profile.cuitEmpresa || profile.ciudad) && (
                                                    <div className="space-y-2 mt-6">
                                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <Building2 className="w-3 h-3" /> Datos de Empresa / Oficina
                                                        </p>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                            {profile.razonSocial && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Razón Social</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{profile.razonSocial}</p>
                                                                </div>
                                                            )}
                                                            {profile.nombreComercial && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nombre Comercial</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{profile.nombreComercial}</p>
                                                                </div>
                                                            )}
                                                            {profile.cuitEmpresa && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">CUIT</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] p-1.5 rounded-lg w-fit">{profile.cuitEmpresa}</p>
                                                                </div>
                                                            )}
                                                            {profile.ciudad && (
                                                                <div>
                                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Ubicación</span>
                                                                    <p className="font-black text-[12px] uppercase tracking-tighter text-slate-800 dark:text-slate-200">{profile.ciudad}{profile.provincia ? `, ${profile.provincia}` : ""}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2 mt-6">
                                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Documentación Legal</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <DocLink url={profile.estatutoUrl} label="Estatuto / Contrato Social" />
                                                        <DocLink url={profile.matriculaUrl} label="Matrícula Profesional" />
                                                        <DocLink url={profile.constanciaBancariaUrl} label="Constancia Bancaria" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* ─── VISTA INVERSOR ────────────────────────────────── */
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {/* Documents side */}
                                                    <div className="space-y-4 border-r-0 md:border-r border-slate-100 dark:border-white/[0.06] pr-0 md:pr-6">
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Selfie con documento</p>
                                                            {profile.selfieUrl ? (
                                                                <img
                                                                    src={profile.selfieUrl}
                                                                    alt="Selfie"
                                                                    onClick={() => setPreviewUrl(profile.selfieUrl)}
                                                                    className="w-full aspect-square rounded-2xl object-cover border border-slate-200 dark:border-white/[0.06] cursor-pointer hover:border-brand-500/50 transition-all"
                                                                />
                                                            ) : (
                                                                <div className="w-full aspect-square rounded-2xl bg-slate-100 dark:bg-white/[0.02] flex items-center justify-center border border-dashed border-slate-200 dark:border-white/[0.06]">
                                                                    <Globe className="w-8 h-8 text-slate-300 dark:text-white/20" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <DocLink url={profile.dniFrente} label="DNI Frente" />
                                                            <DocLink url={profile.dniDorso} label="DNI Dorso" />
                                                            <div className="col-span-2">
                                                                <DocLink url={profile.pasaporteUrl} label="Pasaporte" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Info side */}
                                                    <div className="md:col-span-2 space-y-6">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                            <div className="space-y-4">
                                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Perfil Financiero</p>
                                                                <div className="space-y-3">
                                                                    <div className="p-4 rounded-xl bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06]">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Perfil de Riesgo</span>
                                                                        <p className={cn(
                                                                            "font-black text-[14px] uppercase tracking-tighter",
                                                                            profile.perfilRiesgo === 'AGRESIVO' ? "text-rose-500" :
                                                                                profile.perfilRiesgo === 'MODERADO' ? "text-amber-500" : "text-emerald-500"
                                                                        )}>{profile.perfilRiesgo}</p>
                                                                    </div>
                                                                    <div className="p-4 rounded-xl bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06]">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ingresos Estimados</span>
                                                                        <p className="font-black text-[12px] uppercase tracking-tighter text-slate-700 dark:text-slate-200">{profile.ingresosEstimados}</p>
                                                                    </div>
                                                                    <div className="p-4 rounded-xl bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06]">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Patrimonio Estimado</span>
                                                                        <p className="font-black text-[12px] uppercase tracking-tighter text-slate-700 dark:text-slate-200">{profile.patrimonioEstimado}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Datos de Usuario</p>
                                                                <div className="space-y-4 font-bold text-sm uppercase tracking-widest">
                                                                    <div className="flex justify-between items-center p-1 border-b border-transparent dark:border-white/[0.04] pb-2">
                                                                        <span className="text-slate-500">Nombre</span>
                                                                        <span className="text-slate-900 dark:text-white">{user.nombre}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-1 border-b border-transparent dark:border-white/[0.04] pb-2">
                                                                        <span className="text-slate-500">Nacionalidad</span>
                                                                        <span className="text-slate-900 dark:text-white">{profile.nacionalidad || "N/A"}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-1 border-b border-transparent dark:border-white/[0.04] pb-2">
                                                                        <span className="text-slate-500">Ocupación</span>
                                                                        <span className="text-slate-900 dark:text-white">{profile.ocupacion || "N/A"}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center p-1">
                                                                        <span className="text-slate-500">Fecha Nac.</span>
                                                                        <span className="text-slate-900 dark:text-white">{user.fechaNacimiento ? new Date(user.fechaNacimiento).toLocaleDateString() : "N/A"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                            <ShieldCheck className="w-4 h-4 shrink-0" />
                                                            Políticas aceptadas el {profile.politicasAceptadasAt ? new Date(profile.politicasAceptadasAt).toLocaleDateString() : 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-200 dark:border-white/[0.06]">
                                            <button
                                                onClick={() => openRejectModal(profile.id)}
                                                disabled={submitting}
                                                className="px-6 py-2.5 rounded-xl border border-rose-500 text-rose-500 hover:bg-rose-500/10 font-bold uppercase tracking-widest text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <XCircle className="w-4 h-4" /> Rechazar
                                            </button>
                                            <button
                                                onClick={() => handleApprove(profile.id)}
                                                disabled={submitting}
                                                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                            >
                                                <CheckCircle className="w-4 h-4" /> Aprobar {view === 'DEVELOPER' ? 'Desarrollador' : 'Inversor'}
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
                        <DialogTitle>Rechazar Verificación de {view === 'DEVELOPER' ? 'Desarrollador' : 'Inversor'}</DialogTitle>
                        <DialogDescription>
                            Indica el motivo del rechazo. El usuario recibirá una notificación y podrá volver a presentar la documentación corregida.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        className="w-full h-32 p-4 bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] rounded-xl text-[12px] font-bold text-slate-800 dark:text-slate-200 focus:border-brand-500 focus:outline-none resize-none placeholder:text-slate-500/50"
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
