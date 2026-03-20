"use client";

import { useState } from "react";
import {
    ShieldCheck, User, Building2, FileText,
    CheckCircle, Clock, XCircle, AlertCircle,
    ChevronRight, ChevronLeft, Loader2, BadgeCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadKYCDoc } from "@/lib/actions/kyc";
import { saveKycProfile, submitKycForReview } from "@/lib/actions/kyc-actions";
import FileUploader from "@/components/ui/file-uploader";
import { toast } from "sonner";

const STEPS = [
    { id: 0, label: "Identidad", icon: User },
    { id: 1, label: "Perfil Profesional", icon: ShieldCheck },
    { id: 2, label: "Empresa", icon: Building2 },
    { id: 3, label: "Documentación Legal", icon: FileText },
];

const IDENTITY_DOCS = [
    { id: "dni_front", label: "DNI (Frente)", description: "Foto clara del frente de tu documento", required: true },
    { id: "dni_back", label: "DNI (Dorso)", description: "Foto clara del dorso de tu documento", required: true },
    { id: "prueba_domicilio", label: "Prueba de Domicilio", description: "Servicio a tu nombre con antigüedad menor a 3 meses", required: true },
    { id: "afip", label: "Constancia de AFIP/CUIT", description: "Comprobante de inscripción fiscal", required: true },
    { id: "selfie", label: "Selfie con DNI", description: "Foto tuya sosteniendo el DNI abierto", required: true },
];

const ESPECIALIDADES = ["BARRIOS_PRIVADOS", "EDIFICIOS", "LOTEOS", "INVERSION"];
const TIPOS_DEVELOPER = ["PERSONA_FISICA", "EMPRESA", "FIDEICOMISO"];

interface Props {
    userId: string;
    initialStatus: string;
    initialDocs: { tipo: string; archivoUrl: string }[];
    initialProfile: any;
}

export default function KycWizardClient({ userId, initialStatus, initialDocs, initialProfile }: Props) {
    const [step, setStep] = useState(0);
    const [status, setStatus] = useState(initialStatus);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Identity docs
    const [uploads, setUploads] = useState<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        initialDocs.forEach((d) => { map[d.tipo] = d.archivoUrl; });
        if (initialProfile?.selfieUrl) map["selfie"] = initialProfile.selfieUrl;
        return map;
    });

    // Step 2: Professional profile
    const [profile, setProfile] = useState({
        nombrePublico: initialProfile?.nombrePublico || "",
        tipoDeveloper: initialProfile?.tipoDeveloper || "",
        yearsExperience: initialProfile?.yearsExperience?.toString() || "",
        proyectosRealizados: initialProfile?.proyectosRealizados?.toString() || "",
        descripcionProfesional: initialProfile?.descripcionProfesional || "",
        especialidad: initialProfile?.especialidad || "",
    });

    // Step 3: Company
    const [company, setCompany] = useState({
        razonSocial: initialProfile?.razonSocial || "",
        nombreComercial: initialProfile?.nombreComercial || "",
        cuitEmpresa: initialProfile?.cuitEmpresa || "",
        direccionOficina: initialProfile?.direccionOficina || "",
        ciudad: initialProfile?.ciudad || "",
        provincia: initialProfile?.provincia || "",
        sitioWeb: initialProfile?.sitioWeb || "",
        linkedinEmpresa: initialProfile?.linkedinEmpresa || "",
        telefonoComercial: initialProfile?.telefonoComercial || "",
    });

    // Step 4: Legal docs
    const [legalDocs, setLegalDocs] = useState({
        estatutoUrl: initialProfile?.estatutoUrl || "",
        matriculaUrl: initialProfile?.matriculaUrl || "",
        constanciaBancariaUrl: initialProfile?.constanciaBancariaUrl || "",
    });

    const isLocked = status === "EN_REVISION" || status === "VERIFICADO" || status === "APROBADO";

    // ─── Handlers ───

    const handleDocUpload = async (docId: string, url: string) => {
        if (docId === "selfie") {
            await saveKycProfile({ selfieUrl: url });
            setUploads((prev) => ({ ...prev, selfie: url }));
            return;
        }
        const res = await uploadKYCDoc(userId, url, docId);
        if (res.success) {
            setUploads((prev) => ({ ...prev, [docId]: url }));
        } else {
            toast.error("Error al guardar el documento");
        }
    };

    const handleSaveStep2 = async () => {
        if (!profile.nombrePublico || !profile.tipoDeveloper || !profile.yearsExperience || !profile.especialidad) {
            toast.error("Por favor completa todos los campos requeridos del perfil profesional.");
            return;
        }
        setIsSaving(true);
        const res = await saveKycProfile({
            nombrePublico: profile.nombrePublico || undefined,
            tipoDeveloper: profile.tipoDeveloper || undefined,
            yearsExperience: profile.yearsExperience ? parseInt(profile.yearsExperience) : undefined,
            proyectosRealizados: profile.proyectosRealizados ? parseInt(profile.proyectosRealizados) : undefined,
            descripcionProfesional: profile.descripcionProfesional || undefined,
            especialidad: profile.especialidad || undefined,
        });
        setIsSaving(false);
        if (res.success) {
            setStep(2);
        } else {
            toast.error((res as any).error || "Error al guardar");
        }
    };

    const handleSaveStep3 = async () => {
        setIsSaving(true);
        const res = await saveKycProfile({
            razonSocial: company.razonSocial || undefined,
            nombreComercial: company.nombreComercial || undefined,
            cuitEmpresa: company.cuitEmpresa || undefined,
            direccionOficina: company.direccionOficina || undefined,
            ciudad: company.ciudad || undefined,
            provincia: company.provincia || undefined,
            sitioWeb: company.sitioWeb || undefined,
            linkedinEmpresa: company.linkedinEmpresa || undefined,
            telefonoComercial: company.telefonoComercial || undefined,
        });
        setIsSaving(false);
        if (res.success) {
            setStep(3);
        } else {
            toast.error((res as any).error || "Error al guardar");
        }
    };

    const handleSaveStep4 = async () => {
        setIsSaving(true);
        const res = await saveKycProfile({
            estatutoUrl: legalDocs.estatutoUrl || undefined,
            matriculaUrl: legalDocs.matriculaUrl || undefined,
            constanciaBancariaUrl: legalDocs.constanciaBancariaUrl || undefined,
        });
        setIsSaving(false);
        if (!res.success) {
            toast.error((res as any).error || "Error al guardar");
        }
    };

    const handleSubmit = async () => {
        // Final check on identity docs
        const missingIdentity = IDENTITY_DOCS.filter(d => d.required && !uploads[d.id]);
        if (missingIdentity.length > 0) {
            toast.error(`Aún faltan documentos de identidad: ${missingIdentity.map(m => m.label).join(", ")}`);
            setStep(0);
            return;
        }

        // Check legal docs based on type
        if ((profile.tipoDeveloper === "EMPRESA" || profile.tipoDeveloper === "FIDEICOMISO") && !legalDocs.estatutoUrl) {
            toast.error("El Estatuto es obligatorio para empresas y fideicomisos.");
            return;
        }

        setIsSubmitting(true);
        const res = await submitKycForReview();
        setIsSubmitting(false);
        if (res.success) {
            setStatus("EN_REVISION");
            toast.success("¡Solicitud enviada! Revisaremos tu documentación en breve.");
        } else {
            toast.error((res as any).error || "Error al enviar");
        }
    };

    const getStatusBadge = () => {
        switch (status) {
            case "VERIFICADO":
            case "APROBADO":
                return { icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Verificado" };
            case "RECHAZADO":
                return { icon: XCircle, color: "text-rose-500 bg-rose-500/10 border-rose-500/20", label: "Rechazado" };
            case "EN_REVISION":
                return { icon: Clock, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "En Revisión" };
            default:
                return { icon: AlertCircle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Pendiente" };
        }
    };

    const badge = getStatusBadge();
    const StatusIcon = badge.icon;

    // ─── Render ───

    return (
        <div className="space-y-8">
            {/* Header Status Badge */}
            <div className="flex justify-end">
                <div className={cn("px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-black uppercase shadow-sm bg-white dark:bg-[#0A0A0C]", badge.color)}>
                    <StatusIcon className="w-4 h-4" />
                    {badge.label}
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => {
                    const StepIcon = s.icon;
                    const isActive = step === i;
                    const isDone = step > i;
                    return (
                        <div key={s.id} className="flex items-center flex-1">
                            <button
                                onClick={() => !isLocked && i < step && setStep(i)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex-1 justify-center",
                                    isActive ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" :
                                        isDone ? "bg-emerald-500/10 text-emerald-600" :
                                            "bg-slate-100 dark:bg-white/[0.02] text-slate-400"
                                )}
                            >
                                {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className={cn("h-px flex-1 mx-1 transition-colors", isDone ? "bg-emerald-500" : "bg-slate-200 dark:bg-white/[0.06]")} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Step content */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 space-y-6 shadow-sm dark:shadow-none">
                {/* STEP 1: Identidad */}
                {step === 0 && (
                    <div className="space-y-5">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-500" /> Paso 1 — Identidad
                        </h2>
                        {IDENTITY_DOCS.map((doc) => (
                            <div key={doc.id} className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                    {doc.label}
                                    {doc.required && <span className="text-rose-500 text-xs bg-rose-50 dark:bg-rose-500/10 px-1 rounded">Requerido</span>}
                                    {uploads[doc.id] && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                </label>
                                <FileUploader
                                    label={`Subir ${doc.label}`}
                                    onUploadComplete={(url) => handleDocUpload(doc.id, url)}
                                    currentFileUrl={uploads[doc.id]}
                                    disabled={isLocked}
                                />
                                <p className="text-sm text-slate-500">{doc.description}</p>
                            </div>
                        ))}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => {
                                    const missing = IDENTITY_DOCS.filter(d => d.required && !uploads[d.id]);
                                    if (missing.length > 0) {
                                        toast.error(`Faltan documentos requeridos: ${missing.map(m => m.label).join(", ")}`);
                                        return;
                                    }
                                    setStep(1);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-black uppercase hover:bg-brand-600 transition-colors"
                            >
                                Guardar y continuar <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Perfil Profesional */}
                {step === 1 && (
                    <div className="space-y-5">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-brand-500" /> Paso 2 — Perfil Profesional
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Nombre Público</label>
                                <input
                                    value={profile.nombrePublico}
                                    onChange={(e) => setProfile((p) => ({ ...p, nombrePublico: e.target.value }))}
                                    disabled={isLocked}
                                    placeholder="Ej: Construcciones García"
                                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Tipo de Developer</label>
                                <select
                                    value={profile.tipoDeveloper}
                                    onChange={(e) => setProfile((p) => ({ ...p, tipoDeveloper: e.target.value }))}
                                    disabled={isLocked}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                >
                                    <option value="">Seleccionar...</option>
                                    {TIPOS_DEVELOPER.map((t) => (
                                        <option key={t} value={t}>{t.replace("_", " ")}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Años de Experiencia</label>
                                <input
                                    type="number"
                                    value={profile.yearsExperience}
                                    onChange={(e) => setProfile((p) => ({ ...p, yearsExperience: e.target.value }))}
                                    disabled={isLocked}
                                    min={0} max={60}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Proyectos Realizados</label>
                                <input
                                    type="number"
                                    value={profile.proyectosRealizados}
                                    onChange={(e) => setProfile((p) => ({ ...p, proyectosRealizados: e.target.value }))}
                                    disabled={isLocked}
                                    min={0}
                                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Especialidad</label>
                            <div className="flex flex-wrap gap-2">
                                {ESPECIALIDADES.map((e) => (
                                    <button
                                        key={e}
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => setProfile((p) => ({ ...p, especialidad: p.especialidad === e ? "" : e }))}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-black uppercase border transition-all",
                                            profile.especialidad === e
                                                ? "bg-brand-500 text-white border-brand-500"
                                                : "border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 dark:hover:bg-white/[0.03] hover:border-brand-500/50"
                                        )}
                                    >
                                        {e.replace("_", " ")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Descripción Profesional</label>
                            <textarea
                                value={profile.descripcionProfesional}
                                onChange={(e) => setProfile((p) => ({ ...p, descripcionProfesional: e.target.value }))}
                                disabled={isLocked}
                                rows={4}
                                placeholder="Describe tu trayectoria, proyectos destacados y filosofía de trabajo..."
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:opacity-50"
                            />
                        </div>

                        <div className="flex justify-between pt-2">
                            <button onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Volver
                            </button>
                            <button
                                onClick={handleSaveStep2}
                                disabled={isSaving || isLocked}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-black uppercase hover:bg-brand-600 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Guardar y continuar <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Empresa */}
                {step === 2 && (
                    <div className="space-y-5">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-500" /> Paso 3 — Empresa / Oficina
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { key: "razonSocial", label: "Razón Social", placeholder: "Nombre legal de la empresa" },
                                { key: "nombreComercial", label: "Nombre Comercial", placeholder: "Nombre comercial" },
                                { key: "cuitEmpresa", label: "CUIT Empresa", placeholder: "30-12345678-9" },
                                { key: "telefonoComercial", label: "Teléfono Comercial", placeholder: "+54 9 11 1234-5678" },
                                { key: "ciudad", label: "Ciudad", placeholder: "Buenos Aires" },
                                { key: "provincia", label: "Provincia", placeholder: "CABA" },
                                { key: "sitioWeb", label: "Sitio Web", placeholder: "https://www.empresa.com" },
                                { key: "linkedinEmpresa", label: "LinkedIn Empresa", placeholder: "https://linkedin.com/company/..." },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-tight">{label}</label>
                                    <input
                                        value={(company as any)[key]}
                                        onChange={(e) => setCompany((c) => ({ ...c, [key]: e.target.value }))}
                                        disabled={isLocked}
                                        placeholder={placeholder}
                                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-tight">Dirección de Oficina</label>
                            <input
                                value={company.direccionOficina}
                                onChange={(e) => setCompany((c) => ({ ...c, direccionOficina: e.target.value }))}
                                disabled={isLocked}
                                placeholder="Av. Corrientes 1234, Piso 5"
                                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                            />
                        </div>

                        <div className="flex justify-between pt-2">
                            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                <ChevronLeft className="w-4 h-4" /> Volver
                            </button>
                            <button
                                onClick={handleSaveStep3}
                                disabled={isSaving || isLocked}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-black uppercase hover:bg-brand-600 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Guardar y continuar <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Documentación Legal */}
                {step === 3 && (
                    <div className="space-y-5">
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <FileText className="w-4 h-4 text-brand-500" /> Paso 4 — Documentación Legal
                        </h2>

                        {[
                            { key: "estatutoUrl", label: "Estatuto Societario", description: "Requerido para EMPRESA y FIDEICOMISO" },
                            { key: "matriculaUrl", label: "Matrícula Profesional", description: "Si aplica (arquitecto, ing. civil, etc.)" },
                            { key: "constanciaBancariaUrl", label: "Constancia Bancaria", description: "CBU o cuenta bancaria a nombre de la empresa" },
                        ].map(({ key, label, description }) => (
                            <div key={key} className="space-y-2">
                                <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-2">
                                    {label}
                                    {(legalDocs as any)[key] && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                </label>
                                <FileUploader
                                    label={`Subir ${label}`}
                                    onUploadComplete={(url) => {
                                        setLegalDocs((d) => ({ ...d, [key]: url }));
                                        saveKycProfile({ [key]: url });
                                    }}
                                    currentFileUrl={(legalDocs as any)[key]}
                                    disabled={isLocked}
                                />
                                <p className="text-sm text-slate-500">{description}</p>
                            </div>
                        ))}

                        {/* Submit section */}
                        {!isLocked && (
                            <div className="pt-4 border-t border-slate-200 dark:border-white/[0.06]">
                                <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-xl mb-4">
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                        Al enviar, tu documentación pasará a revisión por nuestro equipo. Recibirás una notificación con el resultado.
                                    </p>
                                </div>
                                <div className="flex justify-between">
                                    <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                        <ChevronLeft className="w-4 h-4" /> Volver
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                                        Enviar para Revisión
                                    </button>
                                </div>
                            </div>
                        )}

                        {isLocked && (
                            <div className="flex justify-start pt-2">
                                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                    <ChevronLeft className="w-4 h-4" /> Volver
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status messages */}
            {status === "EN_REVISION" && (
                <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        Tu documentación está siendo revisada. Nuestro equipo la verificará en 24-48 horas hábiles.
                    </p>
                </div>
            )}
            {(status === "VERIFICADO" || status === "APROBADO") && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        ¡Verificación completada! Ya puedes publicar proyectos y operar sin restricciones.
                    </p>
                </div>
            )}
            {status === "RECHAZADO" && (
                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                        Tu documentación fue rechazada. Por favor, corrígela y vuelve a enviarla.
                    </p>
                </div>
            )}
        </div>
    );
}
