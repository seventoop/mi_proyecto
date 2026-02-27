"use client";

import { useState } from "react";
import { X, Save, Image, Link as LinkIcon, Calendar, Layout, AlertCircle, DollarSign, UploadCloud, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { createBanner, linkBannerPayment } from "@/lib/actions/banners";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useSession } from "next-auth/react";

interface DeveloperBannerFormProps {
    onClose: () => void;
}

const PRECIO_BANNER = 50; // USD Fijo por ahora

export default function DeveloperBannerForm({ onClose }: DeveloperBannerFormProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Datos, 2: Pago
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // File states
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

    const [createdBannerId, setCreatedBannerId] = useState<string | null>(null);

    const [form, setForm] = useState({
        titulo: "",
        mediaUrl: "",
        linkDestino: "",
        posicion: "HOME_MID", // Default for devs
        tipo: "IMAGEN",
        fechaInicio: "",
        fechaFin: "",
    });

    const updateForm = (key: string, value: any) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Error subiendo archivo");
        return data.url;
    };

    const handleSubmitBanner = async () => {
        setErrors({});
        if (!form.titulo) return setErrors({ titulo: "Requerido" });
        if (!bannerFile && !form.mediaUrl) return setErrors({ mediaUrl: "Imagen requerida" });

        setLoading(true);
        try {
            let mediaUrl = form.mediaUrl;
            if (bannerFile) {
                mediaUrl = await handleFileUpload(bannerFile);
            }

            const res = await createBanner({
                ...form,
                mediaUrl,
                prioridad: 0,
                creadoPorId: (session?.user as any)?.id,
                fechaInicio: form.fechaInicio ? new Date(form.fechaInicio) : undefined,
                fechaFin: form.fechaFin ? new Date(form.fechaFin) : undefined,
            });

            if (res.success && res.data) {
                setCreatedBannerId(res.data.id);
                setStep(2); // Move to payment
            } else {
                setErrors({ submit: res.error || "Error creando banner" });
            }
        } catch (e: any) {
            setErrors({ submit: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPayment = async () => {
        if (!comprobanteFile) return setErrors({ comprobante: "Sube el comprobante" });
        if (!createdBannerId) return;

        setLoading(true);
        try {
            const url = await handleFileUpload(comprobanteFile);
            const res = await linkBannerPayment(createdBannerId, url, PRECIO_BANNER);

            if (res.success) {
                router.refresh();
                onClose();
            } else {
                setErrors({ payment: res.error || "Error registrando pago" });
            }
        } catch (e: any) {
            setErrors({ payment: e.message });
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all";
    const labelClass = "text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 block";

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg flex flex-col animate-slide-up bg-white dark:bg-slate-900 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-brand-900/5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {step === 1 ? "publicar Anuncio" : "Confirmar Pago"}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {step === 1 ? "Configura tu banner publicitario" : "Sube el comprobante para revisión"}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {step === 1 ? (
                        <>
                            {/* Preview Area */}
                            <div className="aspect-video rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 relative overflow-hidden group hover:border-brand-500 transition-colors cursor-pointer">
                                {bannerFile || form.mediaUrl ? (
                                    <>
                                        {form.tipo === "VIDEO" || bannerFile?.type.startsWith("video/") ? (
                                            <video src={bannerFile ? URL.createObjectURL(bannerFile) : form.mediaUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={bannerFile ? URL.createObjectURL(bannerFile) : form.mediaUrl} className="w-full h-full object-cover" />
                                        )}
                                        <button onClick={() => { setBannerFile(null); updateForm("mediaUrl", ""); }}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                        <UploadCloud className="w-10 h-10 text-slate-400 mb-2 group-hover:text-brand-500 transition-colors" />
                                        <span className="text-xs text-slate-500">Click para subir imagen o video</span>
                                        <input type="file" className="hidden" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                                    </label>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Título del Anuncio</label>
                                    <input value={form.titulo} onChange={(e) => updateForm("titulo", e.target.value)}
                                        className={inputClass} placeholder="Ej: Venta de Lote en Barrio Privado" />
                                </div>

                                <div>
                                    <label className={labelClass}>Link de Destino (Opcional)</label>
                                    <div className="flex gap-2">
                                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <LinkIcon className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <input type="url" value={form.linkDestino} onChange={(e) => updateForm("linkDestino", e.target.value)}
                                            className={inputClass} placeholder="https://..." />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Fecha Inicio</label>
                                        <input type="date" value={form.fechaInicio} onChange={(e) => updateForm("fechaInicio", e.target.value)}
                                            className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Fecha Fin</label>
                                        <input type="date" value={form.fechaFin} onChange={(e) => updateForm("fechaFin", e.target.value)}
                                            className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="p-6 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-500/20">
                                <h3 className="text-brand-800 dark:text-brand-200 font-bold text-lg mb-1">Monto a Pagar</h3>
                                <div className="text-4xl font-black text-brand-600 dark:text-brand-400 flex items-center justify-center gap-1">
                                    <span className="text-2xl">$</span>{PRECIO_BANNER} <span className="text-lg text-brand-500/60">USD</span>
                                </div>
                                <p className="text-xs text-brand-600/70 dark:text-brand-400/70 mt-2">
                                    Transferir al CBU: 0000003123123123 (Banco X)
                                </p>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                    {comprobanteFile ? (
                                        <>
                                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                                                <DollarSign className="w-6 h-6" />
                                            </div>
                                            <span className="text-sm font-medium text-emerald-600">{comprobanteFile.name}</span>
                                            <span className="text-xs text-emerald-500">Click para cambiar</span>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-12 h-12 text-slate-300 mb-2" />
                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subir Comprobante de Pago</span>
                                            <span className="text-xs text-slate-400">PDF, JPG, PNG</span>
                                        </>
                                    )}
                                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                            {errors.payment && <p className="text-rose-500 text-sm font-bold">{errors.payment}</p>}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between">
                    {step === 2 && (
                        <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 text-sm font-medium">Volver</button>
                    )}
                    <div className="ml-auto">
                        {step === 1 ? (
                            <button onClick={handleSubmitBanner} disabled={loading} className="btn-primary">
                                {loading ? "Procesando..." : "Siguiente: Pago"}
                            </button>
                        ) : (
                            <button onClick={handleSubmitPayment} disabled={loading} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
                                {loading ? "Verificando..." : "Confirmar Pago"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
