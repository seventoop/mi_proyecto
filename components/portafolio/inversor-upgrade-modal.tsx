"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { submitInversorKycUpgrade } from "@/lib/actions/kyc-upgrade-actions";
import FileUploader from "@/components/ui/file-uploader";
import { cn } from "@/lib/utils";
import {
    X, User, Shield, Camera, CheckSquare, ArrowRight, ArrowLeft,
    Check, Loader2, Star, TrendingUp, Lock, Rocket, BarChart3
} from "lucide-react";

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

const STEPS = [
    { id: 1, title: "Datos Personales", icon: User },
    { id: 2, title: "Identidad", icon: Shield },
    { id: 3, title: "Verificación Facial", icon: Camera },
    { id: 4, title: "Políticas", icon: CheckSquare },
];

const PERFILES_RIESGO = [
    {
        value: "CONSERVADOR",
        label: "Conservador",
        desc: "Priorizo preservar mi capital. Acepto menor rentabilidad a cambio de más seguridad.",
        color: "border-emerald-500 bg-emerald-500/10 text-emerald-500"
    },
    {
        value: "MODERADO",
        label: "Moderado",
        desc: "Busco un balance entre rendimiento y riesgo. Acepto variaciones moderadas.",
        color: "border-amber-500 bg-amber-500/10 text-amber-500"
    },
    {
        value: "AGRESIVO",
        label: "Agresivo",
        desc: "Busco máxima rentabilidad. Estoy dispuesto a asumir mayor riesgo.",
        color: "border-rose-500 bg-rose-500/10 text-rose-500"
    }
];

const INGRESOS_OPTIONS = [
    "Menos de $500,000 ARS",
    "$500,000 - $1,500,000 ARS",
    "$1,500,000 - $5,000,000 ARS",
    "Más de $5,000,000 ARS",
    "Prefiero no indicarlo",
];

const PATRIMONIO_OPTIONS = [
    "Menos de $5,000,000 ARS",
    "$5,000,000 - $20,000,000 ARS",
    "$20,000,000 - $100,000,000 ARS",
    "Más de $100,000,000 ARS",
    "Prefiero no indicarlo",
];

export default function InversorUpgradeModal({ onClose, onSuccess }: Props) {
    const { data: session } = useSession();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [nombreCompleto, setNombreCompleto] = useState(session?.user?.name || "");
    const [fechaNacimiento, setFechaNacimiento] = useState("");
    const [nacionalidad, setNacionalidad] = useState("");
    const [ocupacion, setOcupacion] = useState("");
    const [perfilRiesgo, setPerfilRiesgo] = useState("");
    const [ingresosEstimados, setIngresosEstimados] = useState("");
    const [patrimonioEstimado, setPatrimonioEstimado] = useState("");
    const [dniFrente, setDniFrente] = useState("");
    const [dniDorso, setDniDorso] = useState("");
    const [pasaporteUrl, setPasaporteUrl] = useState("");
    const [selfieUrl, setSelfieUrl] = useState("");
    const [politicas, setPoliticas] = useState({
        terminos: false,
        privacidad: false,
        veracidad: false,
        inversiones: false,
    });

    const allPoliticas = Object.values(politicas).every(Boolean);

    const canGoNext = useCallback(() => {
        if (step === 1) return nombreCompleto && fechaNacimiento && nacionalidad && ocupacion && perfilRiesgo && ingresosEstimados && patrimonioEstimado;
        if (step === 2) return dniFrente || pasaporteUrl;
        if (step === 3) return !!selfieUrl;
        if (step === 4) return allPoliticas;
        return false;
    }, [step, nombreCompleto, fechaNacimiento, nacionalidad, ocupacion, perfilRiesgo, ingresosEstimados, patrimonioEstimado, dniFrente, pasaporteUrl, selfieUrl, allPoliticas]);

    const handleSubmit = async () => {
        if (!canGoNext()) return;
        setSubmitting(true);
        try {
            const res = await submitInversorKycUpgrade({
                nombreCompleto,
                fechaNacimiento,
                nacionalidad,
                ocupacion,
                ingresosEstimados,
                patrimonioEstimado,
                perfilRiesgo,
                dniFrente: dniFrente || undefined,
                dniDorso: dniDorso || undefined,
                pasaporteUrl: pasaporteUrl || undefined,
                selfieUrl,
                politicasAceptadas: true,
            });
            if (res.success) {
                toast.success("¡Solicitud enviada! La revisaremos en 24-48hs hábiles.");
                onSuccess();
            } else {
                toast.error((res as any).error || "Error al enviar la solicitud");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f1117] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Convertirme en Inversor</h2>
                            <p className="text-xs text-slate-400">Verificación requerida por normativa AML</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="px-6 pt-6">
                    <div className="flex items-center gap-2 mb-6">
                        {STEPS.map((s, i) => {
                            const isCompleted = step > s.id;
                            const isCurrent = step === s.id;
                            return (
                                <div key={s.id} className="flex items-center gap-2 flex-1">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0",
                                        isCompleted ? "bg-emerald-500 text-white" :
                                            isCurrent ? "bg-brand-500 text-white ring-4 ring-brand-500/20" :
                                                "bg-white/5 text-slate-500 border border-white/10"
                                    )}>
                                        {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                                    </div>
                                    <span className={cn(
                                        "text-xs font-semibold hidden sm:block",
                                        isCurrent ? "text-white" : isCompleted ? "text-emerald-400" : "text-slate-500"
                                    )}>
                                        {s.title}
                                    </span>
                                    {i < STEPS.length - 1 && (
                                        <div className={cn(
                                            "flex-1 h-0.5 rounded-full mx-1",
                                            isCompleted ? "bg-emerald-500" : "bg-white/10"
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step content */}
                <div className="px-6 pb-6 space-y-6">
                    {/* STEP 1: Personal & financial data */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <h3 className="text-lg font-bold text-white mb-4">Datos Biográficos</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2">Nombre Completo</label>
                                            <input
                                                type="text"
                                                value={nombreCompleto}
                                                onChange={(e) => setNombreCompleto(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                placeholder="Como figura en tu DNI"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2">Fecha de Nacimiento</label>
                                            <input
                                                type="date"
                                                value={fechaNacimiento}
                                                onChange={(e) => setFechaNacimiento(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2">Nacionalidad</label>
                                            <input
                                                type="text"
                                                value={nacionalidad}
                                                onChange={(e) => setNacionalidad(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                placeholder="Ej: Argentina"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2">Ocupación</label>
                                            <input
                                                type="text"
                                                value={ocupacion}
                                                onChange={(e) => setOcupacion(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                                placeholder="Ej: Empleado, Autónomo..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 mt-4">
                                    <h3 className="text-lg font-bold text-white mb-1">Perfil de Riesgo</h3>
                                    <p className="text-sm text-slate-400 mb-4">Seleccioná el perfil que mejor describe tu estilo de inversión.</p>
                                    <div className="grid grid-cols-1 gap-3 mb-6">
                                        {PERFILES_RIESGO.map((p) => (
                                            <button
                                                key={p.value}
                                                onClick={() => setPerfilRiesgo(p.value)}
                                                className={cn(
                                                    "text-left p-4 rounded-2xl border-2 transition-all",
                                                    perfilRiesgo === p.value
                                                        ? p.color + " border-opacity-100"
                                                        : "border-white/10 hover:border-white/20 text-slate-400"
                                                )}
                                            >
                                                <p className="font-bold">{p.label}</p>
                                                <p className="text-sm opacity-80 mt-1">{p.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2">Ingresos Estimados (mensuales)</label>
                                            <select
                                                value={ingresosEstimados}
                                                onChange={(e) => setIngresosEstimados(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {INGRESOS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-300 mb-2">Patrimonio Estimado</label>
                                            <select
                                                value={patrimonioEstimado}
                                                onChange={(e) => setPatrimonioEstimado(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {PATRIMONIO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Identity documents */}
                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Documentación de Identidad</h3>
                                <p className="text-sm text-slate-400">Subí tu DNI (frente y dorso) o pasaporte vigente. Archivos JPG, PNG o PDF. Máx. 5MB.</p>
                            </div>
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">DNI argentino</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FileUploader
                                        label="DNI Frente"
                                        onUploadComplete={(url) => setDniFrente(url)}
                                        currentFileUrl={dniFrente}
                                    />
                                    <FileUploader
                                        label="DNI Dorso"
                                        onUploadComplete={(url) => setDniDorso(url)}
                                        currentFileUrl={dniDorso}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs font-bold">O si sos extranjero</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pasaporte vigente</p>
                                <FileUploader
                                    label="Pasaporte (foto o PDF)"
                                    onUploadComplete={(url) => setPasaporteUrl(url)}
                                    currentFileUrl={pasaporteUrl}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Selfie */}
                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Verificación Facial</h3>
                                <p className="text-sm text-slate-400">Tomá una selfie sosteniéndote junto a tu DNI o pasaporte.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-400 space-y-2">
                                <p className="text-sm font-bold">Requisitos de la foto:</p>
                                <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
                                    <li>Buena iluminación, rostro completamente visible</li>
                                    <li>Documento de identidad legible junto a tu cara</li>
                                    <li>Sin filtros ni ediciones</li>
                                    <li>Formato JPG o PNG, máx. 5MB</li>
                                </ul>
                            </div>
                            <FileUploader
                                label="Selfie con documento"
                                onUploadComplete={(url) => setSelfieUrl(url)}
                                currentFileUrl={selfieUrl}
                            />
                        </div>
                    )}

                    {/* STEP 4: Policies */}
                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Aceptación de Políticas</h3>
                                <p className="text-sm text-slate-400">Leé y aceptá todos los términos para finalizar tu solicitud.</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { key: "terminos" as const, text: "Acepto los", link: "/terminos", linkText: "Términos y Condiciones de Seventoop" },
                                    { key: "privacidad" as const, text: "Acepto la", link: "/privacidad", linkText: "Política de Privacidad" },
                                    { key: "veracidad" as const, text: "Declaro que todos los datos proporcionados son verídicos y de mi propia autoría.", link: null, linkText: null },
                                    { key: "inversiones" as const, text: "Acepto la", link: "/inversiones", linkText: "Política de Inversiones y entiendo los riesgos asociados" },
                                ].map(({ key, text, link, linkText }) => (
                                    <button
                                        key={key}
                                        onClick={() => setPoliticas(p => ({ ...p, [key]: !p[key] }))}
                                        className={cn(
                                            "w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all",
                                            politicas[key]
                                                ? "border-emerald-500/50 bg-emerald-500/5"
                                                : "border-white/10 hover:border-white/20"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                            politicas[key] ? "border-emerald-500 bg-emerald-500" : "border-white/30"
                                        )}>
                                            {politicas[key] && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <p className="text-sm text-slate-300">
                                            {text}{" "}
                                            {link && linkText && (
                                                <a
                                                    href={link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-brand-400 hover:text-brand-300 underline font-semibold"
                                                >
                                                    {linkText}
                                                </a>
                                            )}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <button
                            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            {step === 1 ? "Cancelar" : "Anterior"}
                        </button>
                        <div className="text-xs text-slate-500 font-semibold">{step}/4</div>
                        {step < 4 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={!canGoNext()}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    canGoNext()
                                        ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                        : "bg-white/5 text-slate-500 cursor-not-allowed"
                                )}
                            >
                                Siguiente <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!canGoNext() || submitting}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    canGoNext() && !submitting
                                        ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                                        : "bg-white/5 text-slate-500 cursor-not-allowed"
                                )}
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                Enviar Solicitud
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
