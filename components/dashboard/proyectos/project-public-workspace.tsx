"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowUpRight,
    Eye,
    Image as ImageIcon,
    LayoutTemplate,
    Loader2,
    Pencil,
    Save,
    Settings2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProyecto } from "@/lib/actions/proyectos";
import ProjectDetailShowcase from "@/components/public/project-detail-showcase";
import ProjectGalleryManager from "@/components/dashboard/proyectos/project-gallery-manager";
import type { ProjectShowcaseData, ProjectWorkspaceSnapshot } from "@/lib/project-showcase";

type Props = {
    project: ProjectShowcaseData;
    editorSnapshot: ProjectWorkspaceSnapshot;
    publicPath: string;
    managementPath?: string | null;
    canEditContextually: boolean;
    canConfigure: boolean;
    roleLabel: string;
};

const tipoOptions = [
    { value: "URBANIZACION", label: "Urbanizacion" },
    { value: "DEPARTAMENTOS", label: "Departamentos" },
    { value: "BARRIO_PRIVADO", label: "Barrio Privado" },
    { value: "BARRIO_CERRADO", label: "Barrio Cerrado" },
    { value: "LOTEO", label: "Loteo" },
    { value: "CHACRA", label: "Chacra" },
    { value: "COUNTRY", label: "Country" },
];

const estadoOptions = [
    { value: "PLANIFICACION", label: "Planificacion" },
    { value: "EN_DESARROLLO", label: "En desarrollo" },
    { value: "EN_VENTA", label: "En venta" },
    { value: "FINALIZADO", label: "Finalizado" },
];

export default function ProjectPublicWorkspace({
    project,
    editorSnapshot,
    publicPath,
    managementPath,
    canEditContextually,
    canConfigure,
    roleLabel,
}: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [coverUploading, setCoverUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageTone, setMessageTone] = useState<"success" | "error">("success");
    const [form, setForm] = useState({
        nombre: editorSnapshot.nombre || "",
        ubicacion: editorSnapshot.ubicacion || "",
        descripcion: editorSnapshot.descripcion || "",
        estado: editorSnapshot.estado || "PLANIFICACION",
        tipo: editorSnapshot.tipo || "URBANIZACION",
        imagenPortada: editorSnapshot.imagenPortada || "",
        precioM2Mercado: editorSnapshot.precioM2Mercado?.toString() || "",
        mapCenterLat: editorSnapshot.mapCenterLat?.toString() || "",
        mapCenterLng: editorSnapshot.mapCenterLng?.toString() || "",
        mapZoom: editorSnapshot.mapZoom?.toString() || "",
    });

    const canShowToolbar = canEditContextually || canConfigure;
    const workspaceSections = useMemo(
        () => [
            "Ver primero: esta pantalla replica la experiencia publica real del proyecto.",
            "Editar pasos: mantenemos la carga estructurada y operativa en su flujo original.",
            "Modo edicion: desde aqui ajustas textos, portada y galeria sin salir de la vista comercial.",
        ],
        []
    );

    const updateField = (field: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setCoverUploading(true);
        setMessage(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok || !uploadData?.success || !uploadData?.url) {
                throw new Error(uploadData?.error || "No se pudo subir la portada.");
            }

            updateField("imagenPortada", uploadData.url);
            setMessageTone("success");
            setMessage("Portada actualizada en el formulario. Guarda para publicarla.");
        } catch (error: any) {
            setMessageTone("error");
            setMessage(error?.message || "No se pudo subir la portada.");
        } finally {
            setCoverUploading(false);
            if (event.target) event.target.value = "";
        }
    };

    const handleSave = () => {
        setMessage(null);
        startTransition(async () => {
            const result = await updateProyecto(editorSnapshot.id, {
                nombre: form.nombre,
                ubicacion: form.ubicacion || undefined,
                descripcion: form.descripcion || undefined,
                estado: form.estado,
                tipo: form.tipo,
                imagenPortada: form.imagenPortada || undefined,
                precioM2Mercado: form.precioM2Mercado ? Number(form.precioM2Mercado) : undefined,
                mapCenterLat: form.mapCenterLat ? Number(form.mapCenterLat) : undefined,
                mapCenterLng: form.mapCenterLng ? Number(form.mapCenterLng) : undefined,
                mapZoom: form.mapZoom ? Number(form.mapZoom) : undefined,
            });

            if (!result.success) {
                setMessageTone("error");
                setMessage(result.error || "No se pudieron guardar los cambios.");
                return;
            }

            setMessageTone("success");
            setMessage("Cambios guardados. Recargando vista publica...");
            router.refresh();
        });
    };

    return (
        <div className="relative bg-[#050816]">
            {canShowToolbar && (
                <div className="sticky top-0 z-[90] border-b border-white/10 bg-slate-950/88 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-brand-orange">
                                    Workspace del proyecto
                                </p>
                                <h1 className="mt-1 text-xl font-black text-white md:text-2xl">
                                    {project.nombre}
                                </h1>
                                <p className="mt-1 text-sm text-slate-300">
                                    Vista publica para {roleLabel.toLowerCase()}. La experiencia del cliente queda limpia y las herramientas internas aparecen solo si activas edicion.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href={publicPath}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                                >
                                    <ArrowUpRight className="h-4 w-4" />
                                    Abrir publica
                                </Link>

                                {canConfigure && managementPath && (
                                    <Link
                                        href={managementPath}
                                        className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-orange transition hover:bg-brand-orange/20"
                                    >
                                        <Settings2 className="h-4 w-4" />
                                        Editar pasos
                                    </Link>
                                )}

                                {canEditContextually && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing((current) => !current)}
                                        className={cn(
                                            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition",
                                            isEditing
                                                ? "bg-white text-slate-950"
                                                : "border border-white/12 bg-white/5 text-white hover:bg-white/10"
                                        )}
                                    >
                                        {isEditing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                        {isEditing ? "Cerrar edicion" : "Modo edicion"}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                            {workspaceSections.map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-xs leading-6 text-slate-300"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <ProjectDetailShowcase project={project} />

            {canEditContextually && isEditing && (
                <div className="pointer-events-none fixed inset-0 z-[110] flex justify-end bg-black/40 backdrop-blur-[2px]">
                    <div className="pointer-events-auto h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[#08101f] shadow-2xl shadow-black/40">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#08101f]/96 px-6 py-5 backdrop-blur-xl">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
                                    Edicion contextual
                                </p>
                                <h2 className="mt-1 text-xl font-black text-white">
                                    Ajustar vista publica
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-8 px-6 py-6">
                            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-brand-orange/12 p-3 text-brand-orange">
                                        <LayoutTemplate className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white">Contenido principal</h3>
                                        <p className="text-sm text-slate-300">
                                            Titulos, descripcion, estado comercial y coordenadas visibles en la landing.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            Nombre
                                        </span>
                                        <input value={form.nombre} onChange={(event) => updateField("nombre", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                    </label>
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            Ubicacion
                                        </span>
                                        <input value={form.ubicacion} onChange={(event) => updateField("ubicacion", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            Estado
                                        </span>
                                        <select value={form.estado} onChange={(event) => updateField("estado", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40">
                                            {estadoOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            Tipo
                                        </span>
                                        <select value={form.tipo} onChange={(event) => updateField("tipo", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40">
                                            {tipoOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            Descripcion comercial
                                        </span>
                                        <textarea value={form.descripcion} onChange={(event) => updateField("descripcion", event.target.value)} rows={5} className="w-full rounded-[24px] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-7 text-white outline-none transition focus:border-brand-orange/40" />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            Precio m2 mercado
                                        </span>
                                        <input value={form.precioM2Mercado} onChange={(event) => updateField("precioM2Mercado", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                    </label>
                                    <div className="grid grid-cols-3 gap-3 md:col-span-2">
                                        <label className="space-y-2">
                                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Lat</span>
                                            <input value={form.mapCenterLat} onChange={(event) => updateField("mapCenterLat", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                        </label>
                                        <label className="space-y-2">
                                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Lng</span>
                                            <input value={form.mapCenterLng} onChange={(event) => updateField("mapCenterLng", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                        </label>
                                        <label className="space-y-2">
                                            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Zoom</span>
                                            <input value={form.mapZoom} onChange={(event) => updateField("mapZoom", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                        </label>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-brand-orange/12 p-3 text-brand-orange">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white">Portada y galeria</h3>
                                        <p className="text-sm text-slate-300">
                                            Cambia portada y administra imagenes sin abandonar la vista del proyecto.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <label className="space-y-2">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                                            URL de portada
                                        </span>
                                        <input value={form.imagenPortada} onChange={(event) => updateField("imagenPortada", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-orange/40" />
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={coverUploading} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10 disabled:opacity-50">
                                            {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                            Subir portada
                                        </button>
                                        <span className="text-xs text-slate-400">
                                            Para agregar, quitar o reordenar multiples imagenes, usa la galeria de abajo.
                                        </span>
                                    </div>
                                    <div className="rounded-[24px] border border-white/8 bg-slate-950/40 p-4">
                                        <ProjectGalleryManager proyectoId={editorSnapshot.id} />
                                    </div>
                                </div>
                            </section>

                            {message && (
                                <div className={cn("rounded-2xl border px-4 py-3 text-sm", messageTone === "success" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border-rose-400/20 bg-rose-500/10 text-rose-200")}>
                                    {message}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 flex items-center justify-between border-t border-white/10 bg-[#08101f]/96 px-6 py-4 backdrop-blur-xl">
                            <p className="text-xs leading-6 text-slate-400">
                                La configuracion estructurada sigue en "Editar pasos". Aqui ajustas la experiencia visible para cliente e inversor.
                            </p>
                            <button type="button" onClick={handleSave} disabled={isPending} className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#ff8b1f] disabled:opacity-60">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
