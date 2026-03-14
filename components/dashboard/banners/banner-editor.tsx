"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    X, Save, Upload, Film, ImageIcon, Link as LinkIcon,
    Sparkles, ChevronDown, ChevronUp, CheckCircle,
    Eye, Send, Loader2, AlertCircle, FileVideo, Globe
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { createBanner, updateBanner, submitBannerForApproval } from "@/lib/actions/banners";
import { generateBannerContent, type BannerAIContent } from "@/lib/actions/banner-ai";
import { getProyectoImagenes } from "@/lib/actions/proyectos";
import { BANNER_ESTADOS, BANNER_CONTENT_LIMITS, MAX_PUBLISHED_PER_CONTEXT } from "@/lib/actions/banners-constants";

type ProyectoOption = { id: string; nombre: string };
type ProyectoImagen = { id: string; url: string; categoria: string; esPrincipal: boolean };
type MediaSource = "upload" | "galeria" | "url";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BannerEditorProps {
    banner?: any;
    onClose: () => void;
    onSaved?: () => void;
    isAdmin?: boolean;
    projects?: ProyectoOption[];
}

const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all placeholder:text-slate-400";
const labelClass = "text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block uppercase tracking-wider";

// ─── Char counter ──────────────────────────────────────────────────────────────

function CharCount({ value, max }: { value: string; max: number }) {
    const len = value.length;
    const over = len > max;
    const near = len > max * 0.85;
    return (
        <span className={cn(
            "text-[10px] tabular-nums",
            over ? "text-rose-500 font-bold" : near ? "text-amber-500" : "text-slate-400"
        )}>
            {len}/{max}
        </span>
    );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────

function AIPanel({
    mediaType,
    onApply,
}: {
    mediaType: "IMAGEN" | "VIDEO";
    onApply: (content: BannerAIContent) => void;
}) {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<BannerAIContent | null>(null);
    const [error, setError] = useState("");
    const [openSection, setOpenSection] = useState<string | null>("headline");

    const generate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError("");
        const res = await generateBannerContent(prompt, mediaType);
        if (res.success && res.data) {
            setResult(res.data);
            setOpenSection("headline");
        } else {
            setError(res.error || "Error al generar contenido.");
        }
        setLoading(false);
    };

    const toggle = (s: string) => setOpenSection(openSection === s ? null : s);

    return (
        <div className="space-y-4">
            {/* Context hint */}
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                    Describí tu campaña con detalle: producto, zona, público, tono y objetivo.
                    La IA va a generar copy dentro de los límites del banner.
                </p>
            </div>

            {/* Prompt input */}
            <div>
                <label className={labelClass}>Describí tu campaña</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                        mediaType === "VIDEO"
                            ? "Ej: Video de lanzamiento para un loteo en Pilar, preventa con financiación a 36 meses, público inversor, tono premium y urgencia."
                            : "Ej: Lanzamiento de loteo en preventa en Pilar, con financiación propia a 36 meses, para inversores que buscan terrenos en barrios privados con amenities."
                    }
                    rows={3}
                    className={cn(inputClass, "resize-none")}
                />
            </div>

            <button
                onClick={generate}
                disabled={loading || prompt.trim().length < 10}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {loading ? "Generando..." : `Generar contenido para ${mediaType === "VIDEO" ? "video (30-35s)" : "imagen (20-25s)"}`}
            </button>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {result && (
                <div className="space-y-0 border border-violet-200 dark:border-violet-800/50 rounded-xl overflow-hidden">
                    {/* Campaign hook + tone summary */}
                    {(result.campaignHook || result.tone) && (
                        <div className="px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800/30 space-y-1">
                            {result.campaignHook && (
                                <div>
                                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider">Concepto</span>
                                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{result.campaignHook}</p>
                                </div>
                            )}
                            {result.tone && (
                                <div>
                                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">Tono</span>
                                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{result.tone}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Headlines */}
                    <Accordion title="Headlines" open={openSection === "headline"} onToggle={() => toggle("headline")}>
                        <OptionList items={result.headlineOptions} onSelect={(v) => onApply({ ...result, headlineOptions: [v] })} />
                    </Accordion>

                    {/* Subheadlines */}
                    <Accordion title="Subheadlines" open={openSection === "sub"} onToggle={() => toggle("sub")}>
                        <OptionList items={result.subheadlineOptions} onSelect={(v) => onApply({ ...result, subheadlineOptions: [v] })} />
                    </Accordion>

                    {/* Taglines */}
                    <Accordion title="Taglines / Badge" open={openSection === "tag"} onToggle={() => toggle("tag")}>
                        <OptionList items={result.taglineOptions} onSelect={(v) => onApply({ ...result, taglineOptions: [v] })} />
                    </Accordion>

                    {/* CTAs */}
                    <Accordion title="CTAs" open={openSection === "cta"} onToggle={() => toggle("cta")}>
                        <OptionList items={result.ctaOptions} onSelect={(v) => onApply({ ...result, ctaOptions: [v] })} />
                    </Accordion>

                    {/* Visual suggestion */}
                    {result.visualSuggestion && (
                        <div className="px-4 py-3 border-t border-violet-100 dark:border-violet-800/30">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Sugerencia visual</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic">{result.visualSuggestion}</p>
                        </div>
                    )}

                    {/* Video-only sections */}
                    {result.videoScript && (
                        <Accordion title="Guión de video" open={openSection === "script"} onToggle={() => toggle("script")}>
                            <div className="px-4 pb-3 space-y-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Guión completo (30-35s)</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{result.videoScript}</p>
                                </div>
                            </div>
                        </Accordion>
                    )}

                    {result.scenePlan && result.scenePlan.length > 0 && (
                        <Accordion title={`Plan de escenas (${result.scenePlan.length})`} open={openSection === "scenes"} onToggle={() => toggle("scenes")}>
                            <div className="px-4 pb-3 space-y-2">
                                {result.scenePlan.map((scene) => (
                                    <div key={scene.scene} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-black text-violet-500 uppercase">Escena {scene.scene}</span>
                                            <span className="text-[11px] text-slate-400 font-mono">{scene.duration}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">{scene.description}</p>
                                        {scene.overlay && (
                                            <p className="text-[11px] italic text-violet-500 dark:text-violet-400">"{scene.overlay}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Accordion>
                    )}

                    {result.overlayTexts && result.overlayTexts.length > 0 && (
                        <Accordion title="Overlays de texto" open={openSection === "overlays"} onToggle={() => toggle("overlays")}>
                            {/* Overlays son textos del guión del video — solo referencia, no se aplican al formulario */}
                            <div className="px-4 pb-3 space-y-1.5">
                                {result.overlayTexts.map((item, i) => (
                                    <div
                                        key={i}
                                        className="px-3 py-2 rounded-lg text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 select-all"
                                    >
                                        {item}
                                    </div>
                                ))}
                                <p className="text-[10px] text-slate-400 mt-1">Textos de pantalla para el video. Hacé clic en cada uno para seleccionarlo y copiarlo.</p>
                            </div>
                        </Accordion>
                    )}

                    {/* Apply all */}
                    <div className="px-4 pb-4 pt-2 border-t border-violet-100 dark:border-violet-800/30">
                        <button
                            onClick={() => onApply(result)}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-bold hover:bg-violet-200 dark:hover:bg-violet-900/40 transition-all"
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aplicar todo al formulario
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Accordion({
    title, open, onToggle, children,
}: {
    title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
    return (
        <div className="border-b border-violet-100 dark:border-violet-800/30 last:border-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors"
            >
                {title}
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {open && children}
        </div>
    );
}

function OptionList({ items, onSelect }: { items: string[]; onSelect: (v: string) => void }) {
    return (
        <div className="px-4 pb-3 space-y-1.5">
            {items.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(item)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                >
                    {item}
                </button>
            ))}
        </div>
    );
}

// ─── Preview ──────────────────────────────────────────────────────────────────

function BannerPreview({ form }: { form: any }) {
    const hasMedia = form.mediaUrl || form._localPreview;
    const previewSrc = form._localPreview || form.mediaUrl;
    const isVideo = form.tipo === "VIDEO";

    return (
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-xl">
            {hasMedia ? (
                isVideo ? (
                    previewSrc ? (
                        <video
                            src={previewSrc}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            loop
                            autoPlay
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 gap-3">
                            <FileVideo className="w-12 h-12 text-slate-600" />
                            <span className="text-sm text-slate-400">Video cargado — preview no disponible</span>
                        </div>
                    )
                ) : (
                    <img
                        src={previewSrc}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                )
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <ImageIcon className="w-10 h-10 text-slate-700" />
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                {form.tagline && (
                    <span className="inline-block mb-2 px-2 py-0.5 bg-brand-orange text-white text-[10px] font-black uppercase tracking-widest rounded">
                        {form.tagline}
                    </span>
                )}
                {form.headline ? (
                    <h2 className="text-white font-black text-xl sm:text-2xl leading-tight drop-shadow mb-1">
                        {form.headline}
                    </h2>
                ) : (
                    <h2 className="text-white/30 font-black text-xl italic">Tu headline aquí</h2>
                )}
                {form.subheadline && (
                    <p className="text-white/80 text-sm mb-3 drop-shadow">{form.subheadline}</p>
                )}
                {form.ctaText && (
                    <span className="inline-block px-4 py-2 rounded-full bg-brand-orange text-white font-bold text-sm">
                        {form.ctaText}
                    </span>
                )}
            </div>

            {/* Duration badge */}
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-white/70 text-[10px] font-mono backdrop-blur-sm">
                {isVideo ? "30-35s" : "20-25s"}
            </div>
        </div>
    );
}

// ─── Labeled input with char counter ─────────────────────────────────────────

function LimitedInput({
    label, value, onChange, placeholder, max, hint, error: err,
}: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; max: number; hint?: string; error?: string;
}) {
    const over = value.length > max;
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>{label}</label>
                <CharCount value={value} max={max} />
            </div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(inputClass, (err || over) && "border-rose-400")}
            />
            {hint && !err && !over && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
            {over && <p className="text-[11px] text-rose-400 mt-1">Muy largo — reducí a {max} caracteres máximo.</p>}
            {err && !over && <p className="text-[11px] text-rose-400 mt-1">{err}</p>}
        </div>
    );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

type TabId = "contenido" | "media" | "ia" | "preview" | "publicacion";

export default function BannerEditor({ banner, onClose, onSaved, isAdmin = false, projects = [] }: BannerEditorProps) {
    const isNew = !banner;
    const [activeTab, setActiveTab] = useState<TabId>("contenido");
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Media source tabs
    const [mediaSource, setMediaSource] = useState<MediaSource>("upload");
    const [galeriaImages, setGaleriaImages] = useState<ProyectoImagen[]>([]);
    const [galeriaLoading, setGaleriaLoading] = useState(false);
    const prevProjectIdRef = useRef<string>("");

    const [form, setForm] = useState({
        titulo: banner?.titulo || "",
        internalName: banner?.internalName || "",
        headline: banner?.headline || "",
        subheadline: banner?.subheadline || "",
        tagline: banner?.tagline || "",
        ctaText: banner?.ctaText || "",
        ctaUrl: banner?.ctaUrl || banner?.linkDestino || "",
        tipo: (banner?.tipo as "IMAGEN" | "VIDEO") || "IMAGEN",
        mediaUrl: banner?.mediaUrl || "",
        context: banner?.context || "ORG_LANDING",
        projectId: banner?.projectId || "",
        fechaInicio: banner?.fechaInicio ? new Date(banner.fechaInicio).toISOString().split("T")[0] : "",
        fechaFin: banner?.fechaFin ? new Date(banner.fechaFin).toISOString().split("T")[0] : "",
        prioridad: banner?.prioridad?.toString() || "0",
        _localPreview: "" as string,
    });

    const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

    // Fetch project gallery when projectId changes (only for PROJECT_LANDING)
    useEffect(() => {
        const pid = form.projectId;
        if (!pid || form.context !== "PROJECT_LANDING") {
            setGaleriaImages([]);
            return;
        }
        if (pid === prevProjectIdRef.current) return;
        prevProjectIdRef.current = pid;
        setGaleriaLoading(true);
        getProyectoImagenes(pid).then((res) => {
            setGaleriaImages((res.data as ProyectoImagen[]) || []);
            setGaleriaLoading(false);
        });
    }, [form.projectId, form.context]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const isVid = f.type.startsWith("video/");
        set("tipo", isVid ? "VIDEO" : "IMAGEN");
        set("_localPreview", isVid ? URL.createObjectURL(f) : URL.createObjectURL(f));
    };

    const handleAIApply = useCallback((content: BannerAIContent) => {
        if (content.headlineOptions?.[0]) set("headline", content.headlineOptions[0].slice(0, BANNER_CONTENT_LIMITS.headline.max));
        if (content.subheadlineOptions?.[0]) set("subheadline", content.subheadlineOptions[0].slice(0, BANNER_CONTENT_LIMITS.subheadline.max));
        if (content.taglineOptions?.[0]) set("tagline", content.taglineOptions[0].slice(0, BANNER_CONTENT_LIMITS.tagline.max));
        if (content.ctaOptions?.[0]) set("ctaText", content.ctaOptions[0].slice(0, BANNER_CONTENT_LIMITS.ctaText.max));
        setActiveTab("contenido");
    }, []);

    const uploadMedia = async (): Promise<string | null> => {
        if (!file) return form.mediaUrl || null;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (data.success) return data.url as string;
            setErrors({ media: data.error || "Error al subir archivo" });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const buildPayload = (mediaUrl: string) => ({
        titulo: form.titulo || form.headline || form.internalName || "Banner",
        internalName: form.internalName || null,
        headline: form.headline || null,
        subheadline: form.subheadline || null,
        tagline: form.tagline || null,
        ctaText: form.ctaText || null,
        ctaUrl: form.ctaUrl || null,
        tipo: form.tipo,
        mediaUrl,
        context: form.context as "SEVENTOOP_GLOBAL" | "ORG_LANDING" | "PROJECT_LANDING",
        projectId: form.context === "PROJECT_LANDING" ? (form.projectId || null) : null,
        fechaInicio: form.fechaInicio ? new Date(form.fechaInicio) : null,
        fechaFin: form.fechaFin ? new Date(form.fechaFin) : null,
        prioridad: parseInt(form.prioridad) || 0,
    });

    const hasContentOverLimit =
        form.headline.length > BANNER_CONTENT_LIMITS.headline.max ||
        form.subheadline.length > BANNER_CONTENT_LIMITS.subheadline.max ||
        form.tagline.length > BANNER_CONTENT_LIMITS.tagline.max ||
        form.ctaText.length > BANNER_CONTENT_LIMITS.ctaText.max;

    const handleSaveDraft = async () => {
        setErrors({});
        if (!form.titulo && !form.headline && !form.internalName) {
            setErrors({ titulo: "Ingresá al menos un título o headline." });
            setActiveTab("contenido");
            return;
        }
        setSaving(true);
        try {
            const mediaUrl = await uploadMedia();
            if (mediaUrl === null && file) return;
            const payload = buildPayload(mediaUrl || "");
            const result = isNew
                ? await createBanner(payload)
                : await updateBanner(banner.id, payload);
            if (result.success) { onSaved?.(); onClose(); }
            else setErrors({ submit: result.error || "Error al guardar" });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForApproval = async () => {
        setErrors({});
        if (!form.mediaUrl && !file) {
            setErrors({ media: "Debés cargar un archivo de imagen o video antes de enviar." });
            setActiveTab("media");
            return;
        }
        if (hasContentOverLimit) {
            setErrors({ submit: "Hay campos que superan el límite de caracteres. Revisá el tab Contenido." });
            setActiveTab("contenido");
            return;
        }
        setSubmitting(true);
        try {
            const mediaUrl = await uploadMedia();
            if (mediaUrl === null && file) return;
            const payload = buildPayload(mediaUrl || form.mediaUrl);

            let bannerId = banner?.id;
            if (isNew) {
                const createRes = await createBanner(payload);
                if (!createRes.success) { setErrors({ submit: createRes.error || "Error al crear" }); return; }
                bannerId = (createRes as any).data?.id;
            } else {
                const updateRes = await updateBanner(banner.id, payload);
                if (!updateRes.success) { setErrors({ submit: updateRes.error || "Error al actualizar" }); return; }
            }

            if (bannerId) {
                const submitRes = await submitBannerForApproval(bannerId);
                if (submitRes.success) { onSaved?.(); onClose(); }
                else setErrors({ submit: submitRes.error || "Error al enviar" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = !!(form.mediaUrl || file);

    const TABS: { id: TabId; label: string }[] = [
        { id: "contenido", label: "Contenido" },
        { id: "media", label: "Media" },
        { id: "ia", label: "✦ IA" },
        { id: "preview", label: "Preview" },
        { id: "publicacion", label: "Publicación" },
    ];

    const STATE_LABEL: Record<string, string> = {
        DRAFT: "Borrador",
        PENDING_APPROVAL: "En revisión",
        PUBLISHED: "Publicado",
        REJECTED: "Rechazado",
        PAUSED: "Pausado",
        ARCHIVED: "Archivado",
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            {isNew ? "Nuevo Banner" : "Editar Banner"}
                        </h2>
                        {banner?.estado && (
                            <span className={cn(
                                "text-[11px] font-bold uppercase tracking-wider",
                                banner.estado === BANNER_ESTADOS.PUBLISHED ? "text-emerald-500" :
                                    banner.estado === BANNER_ESTADOS.PENDING_APPROVAL ? "text-amber-500" :
                                        banner.estado === BANNER_ESTADOS.REJECTED ? "text-rose-500" :
                                            "text-slate-400"
                            )}>
                                {STATE_LABEL[banner.estado] || banner.estado}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 relative",
                                activeTab === tab.id
                                    ? "border-brand-500 text-brand-600 dark:text-brand-400"
                                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            {tab.label}
                            {/* Warn indicator on contenido tab if over limit */}
                            {tab.id === "contenido" && hasContentOverLimit && (
                                <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* ── Contenido ── */}
                    {activeTab === "contenido" && (
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Nombre interno</label>
                                <input
                                    value={form.internalName}
                                    onChange={(e) => set("internalName", e.target.value)}
                                    placeholder="Solo visible en el panel (ej: 'Campaña Pilar Q1')"
                                    className={inputClass}
                                />
                            </div>

                            <LimitedInput
                                label="Headline principal *"
                                value={form.headline}
                                onChange={(v) => set("headline", v)}
                                placeholder="Ej: Invertí en tu futuro desde USD 25.000"
                                max={BANNER_CONTENT_LIMITS.headline.max}
                                hint={BANNER_CONTENT_LIMITS.headline.hint}
                                error={errors.titulo}
                            />

                            <LimitedInput
                                label="Subheadline"
                                value={form.subheadline}
                                onChange={(v) => set("subheadline", v)}
                                placeholder="Ej: Loteo en preventa con financiación a 36 meses"
                                max={BANNER_CONTENT_LIMITS.subheadline.max}
                                hint={BANNER_CONTENT_LIMITS.subheadline.hint}
                            />

                            <LimitedInput
                                label="Tagline / Badge"
                                value={form.tagline}
                                onChange={(v) => set("tagline", v)}
                                placeholder="Ej: PREVENTA · LANZAMIENTO"
                                max={BANNER_CONTENT_LIMITS.tagline.max}
                                hint={BANNER_CONTENT_LIMITS.tagline.hint}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <LimitedInput
                                    label="Texto del CTA"
                                    value={form.ctaText}
                                    onChange={(v) => set("ctaText", v)}
                                    placeholder="Ej: Ver proyecto"
                                    max={BANNER_CONTENT_LIMITS.ctaText.max}
                                    hint={BANNER_CONTENT_LIMITS.ctaText.hint}
                                />
                                <div>
                                    <label className={labelClass}>URL del CTA</label>
                                    <div className="flex gap-2">
                                        <span className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <LinkIcon className="w-4 h-4 text-slate-400" />
                                        </span>
                                        <input
                                            type="url"
                                            value={form.ctaUrl}
                                            onChange={(e) => set("ctaUrl", e.target.value)}
                                            placeholder="https://..."
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Media ── */}
                    {activeTab === "media" && (
                        <div className="space-y-4">
                            {/* Tipo selector */}
                            <div>
                                <label className={labelClass}>Tipo de media</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => set("tipo", "IMAGEN")}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                                            form.tipo === "IMAGEN"
                                                ? "bg-brand-50 border-brand-400 text-brand-600 dark:bg-brand-900/20 dark:border-brand-500 dark:text-brand-400"
                                                : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700"
                                        )}
                                    >
                                        <ImageIcon className="w-4 h-4" /> Imagen (20-25s)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => set("tipo", "VIDEO")}
                                        disabled={form.context === "PROJECT_LANDING"}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                                            form.tipo === "VIDEO"
                                                ? "bg-brand-50 border-brand-400 text-brand-600 dark:bg-brand-900/20 dark:border-brand-500 dark:text-brand-400"
                                                : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700",
                                            form.context === "PROJECT_LANDING" && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        <Film className="w-4 h-4" /> Video (30-35s)
                                    </button>
                                </div>
                                {form.context === "PROJECT_LANDING" ? (
                                    <p className="text-[11px] text-amber-500 mt-1.5">
                                        El banner de proyecto solo admite imagen.
                                    </p>
                                ) : form.tipo === "VIDEO" && (
                                    <p className="text-[11px] text-slate-400 mt-1.5">
                                        Usá el tab IA para generar el guión, escenas y overlays del video.
                                    </p>
                                )}
                            </div>

                            {/* Source tabs */}
                            <div>
                                <label className={labelClass}>Fuente de la imagen</label>
                                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setMediaSource("upload")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                                            mediaSource === "upload"
                                                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                        )}
                                    >
                                        <Upload className="w-3.5 h-3.5" /> Subir archivo
                                    </button>
                                    {form.context === "PROJECT_LANDING" && form.projectId && (
                                        <button
                                            type="button"
                                            onClick={() => setMediaSource("galeria")}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                                                mediaSource === "galeria"
                                                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                            )}
                                        >
                                            <ImageIcon className="w-3.5 h-3.5" /> Galería del proyecto
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setMediaSource("url")}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all",
                                            mediaSource === "url"
                                                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                                        )}
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" /> Pegar URL
                                    </button>
                                </div>
                            </div>

                            {/* ── Source: Upload ── */}
                            {mediaSource === "upload" && (
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[160px] relative">
                                    {file || form.mediaUrl ? (
                                        <>
                                            {form.tipo === "VIDEO" ? (
                                                form._localPreview || form.mediaUrl ? (
                                                    <video
                                                        src={form._localPreview || form.mediaUrl}
                                                        className="max-h-[140px] rounded-lg shadow object-contain"
                                                        muted
                                                        playsInline
                                                        controls
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileVideo className="w-10 h-10 text-brand-500" />
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{file?.name || "Video cargado"}</p>
                                                    </div>
                                                )
                                            ) : (
                                                <img
                                                    src={form._localPreview || form.mediaUrl}
                                                    alt="Preview"
                                                    className="max-h-[140px] rounded-lg shadow object-contain"
                                                />
                                            )}
                                            <button
                                                onClick={() => { setFile(null); set("mediaUrl", ""); set("_localPreview", ""); }}
                                                className="absolute top-2 right-2 p-1 rounded-full bg-rose-500 text-white hover:scale-110 transition-transform"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="flex flex-col items-center gap-3 cursor-pointer">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                            <p className="text-sm text-slate-500">Arrastrá o hacé clic para subir</p>
                                            <p className="text-xs text-slate-400">
                                                {form.tipo === "VIDEO" ? "MP4, MOV, WebM — máx 50MB" : "JPG, PNG, WebP — máx 10MB"}
                                            </p>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept={form.tipo === "VIDEO" ? "video/*" : "image/*"}
                                                onChange={handleFile}
                                            />
                                        </label>
                                    )}
                                </div>
                            )}

                            {/* ── Source: Galería del proyecto ── */}
                            {mediaSource === "galeria" && form.context === "PROJECT_LANDING" && form.projectId && (
                                <div>
                                    {galeriaLoading ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i} className="aspect-video rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : galeriaImages.length === 0 ? (
                                        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm text-slate-400">Este proyecto no tiene imágenes en su galería.</p>
                                            <p className="text-xs text-slate-400 mt-1">Subí imágenes al proyecto primero, o usá "Subir archivo".</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-3 gap-2">
                                                {galeriaImages.map((img) => (
                                                    <button
                                                        key={img.id}
                                                        type="button"
                                                        onClick={() => {
                                                            set("mediaUrl", img.url);
                                                            set("tipo", "IMAGEN");
                                                            set("_localPreview", "");
                                                            setFile(null);
                                                        }}
                                                        className={cn(
                                                            "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                                                            form.mediaUrl === img.url
                                                                ? "border-brand-500 shadow-md shadow-brand-500/30"
                                                                : "border-transparent hover:border-brand-300"
                                                        )}
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt={img.categoria}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {form.mediaUrl === img.url && (
                                                            <div className="absolute inset-0 bg-brand-500/20 flex items-center justify-center">
                                                                <CheckCircle className="w-6 h-6 text-brand-500 drop-shadow" />
                                                            </div>
                                                        )}
                                                        {img.esPrincipal && (
                                                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded uppercase tracking-wider">
                                                                Principal
                                                            </span>
                                                        )}
                                                        <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/50 text-white/80 text-[9px] rounded uppercase tracking-wider">
                                                            {img.categoria}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            {form.mediaUrl && galeriaImages.some(i => i.url === form.mediaUrl) && (
                                                <p className="text-[11px] text-brand-500 mt-1.5 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Imagen seleccionada de la galería
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── Source: URL manual ── */}
                            {mediaSource === "url" && (
                                <div>
                                    <input
                                        type="url"
                                        value={form.mediaUrl}
                                        onChange={(e) => { set("mediaUrl", e.target.value); setFile(null); set("_localPreview", ""); }}
                                        placeholder="https://cdn.ejemplo.com/banner.jpg"
                                        className={cn(inputClass, errors.media && "border-rose-400")}
                                    />
                                    {form.mediaUrl && (
                                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[160px] flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                                            {form.tipo === "VIDEO" ? (
                                                <video src={form.mediaUrl} className="max-h-[160px] w-full object-contain" muted playsInline />
                                            ) : (
                                                <img
                                                    src={form.mediaUrl}
                                                    alt="Preview URL"
                                                    className="max-h-[160px] object-contain"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {errors.media && <p className="text-xs text-rose-400 mt-1">{errors.media}</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── IA ── */}
                    {activeTab === "ia" && (
                        <AIPanel mediaType={form.tipo as "IMAGEN" | "VIDEO"} onApply={handleAIApply} />
                    )}

                    {/* ── Preview ── */}
                    {activeTab === "preview" && (
                        <div className="space-y-4">
                            <p className="text-xs text-slate-500">Vista previa del banner en la landing pública.</p>
                            <BannerPreview form={form} />
                            {!form.headline && !form.mediaUrl && !file && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-xs">
                                    <AlertCircle className="w-4 h-4" />
                                    Completá el headline y la media para ver el preview completo.
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Publicación ── */}
                    {activeTab === "publicacion" && (
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Contexto de publicación</label>
                                <select
                                    value={form.context}
                                    onChange={(e) => {
                                        set("context", e.target.value);
                                        if (e.target.value === "PROJECT_LANDING") set("tipo", "IMAGEN");
                                    }}
                                    className={inputClass}
                                >
                                    {isAdmin && (
                                        <option value="SEVENTOOP_GLOBAL">
                                            SevenToop Global — visible en toda la plataforma
                                        </option>
                                    )}
                                    <option value="ORG_LANDING">Landing de la organización</option>
                                    <option value="PROJECT_LANDING">Landing de un proyecto específico</option>
                                </select>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Se pueden publicar hasta {MAX_PUBLISHED_PER_CONTEXT} banners por contexto de forma simultánea.
                                    Al publicar un cuarto, el más antiguo se pausa automáticamente.
                                </p>
                                {form.context === "SEVENTOOP_GLOBAL" && (
                                    <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                        <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-blue-700 dark:text-blue-300">
                                            Los banners globales aparecen en la landing principal de SevenToop y en todas las landings de organizaciones.
                                        </p>
                                    </div>
                                )}
                                {form.context === "PROJECT_LANDING" && (
                                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                            Solo imagen — 1 banner activo por proyecto. Al publicar uno nuevo, el anterior se pausa automáticamente.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Project selector — only for PROJECT_LANDING */}
                            {form.context === "PROJECT_LANDING" && (
                                <div>
                                    <label className={labelClass}>Proyecto *</label>
                                    {projects.length > 0 ? (
                                        <select
                                            value={form.projectId}
                                            onChange={(e) => set("projectId", e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">— Seleccioná un proyecto —</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={form.projectId}
                                            onChange={(e) => set("projectId", e.target.value)}
                                            placeholder="ID del proyecto"
                                            className={inputClass}
                                        />
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Fecha inicio (opcional)</label>
                                    <input
                                        type="date"
                                        value={form.fechaInicio}
                                        onChange={(e) => set("fechaInicio", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Fecha fin (opcional)</label>
                                    <input
                                        type="date"
                                        value={form.fechaFin}
                                        onChange={(e) => set("fechaFin", e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Prioridad (mayor número = primero)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.prioridad}
                                    onChange={(e) => set("prioridad", e.target.value)}
                                    className={inputClass}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    0 = normal · 10 = destacado · 100 = urgente
                                </p>
                            </div>

                            {/* Workflow explanation */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Flujo de publicación</p>
                                <ol className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <li className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                                        Guardás el banner como borrador
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                                        {isAdmin ? "Enviás directo a publicación" : "Enviás a revisión → queda en PENDING_APPROVAL"}
                                    </li>
                                    {!isAdmin && (
                                        <li className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                                            Admin aprueba → se publica en la landing
                                        </li>
                                    )}
                                </ol>
                            </div>
                        </div>
                    )}

                    {errors.submit && (
                        <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                            <AlertCircle className="w-4 h-4" /> {errors.submit}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveDraft}
                            disabled={saving || uploading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                            {uploading ? "Subiendo..." : "Guardar borrador"}
                        </button>
                        <button
                            onClick={handleSubmitForApproval}
                            disabled={submitting || !canSubmit || uploading}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-brand-600/20"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isAdmin ? "Publicar" : "Enviar a revisión"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
