"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Building2, CheckCircle, XCircle, Clock, AlertTriangle,
    Search, User, CalendarDays, ChevronDown, ChevronUp,
    History, Loader2, MessageSquare, ClipboardCheck, ArrowRight, Workflow
} from "lucide-react";
import { getProyectosPendientesValidacion, getProyectoEstadoLogs } from "@/lib/actions/validation-actions";
import { adminTransitionProyectoState } from "@/lib/actions/project-state-actions";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ProjectLog = {
    id: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    motivo: string | null;
    createdAt: string;
    realizadoPor: { nombre: string; email: string } | null;
};

type ProjectValidation = {
    id: string;
    nombre: string;
    orgId: string | null;
    estadoValidacion: string;
    createdAt: string;
    fechaSubmit: string | null;
    submittedBy: { id: string; nombre: string; email: string } | null;
    latestLog: ProjectLog | null;
};

function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    try {
        return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
        return "—";
    }
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        PENDIENTE_VALIDACION: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        EN_REVISION: "bg-sky-500/10 text-sky-500 border-sky-500/20",
        APROBADO: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        OBSERVADO: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        RECHAZADO: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    };

    return (
        <span className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shrink-0",
            styles[status] || "bg-slate-500/10 text-slate-400 border-white/10"
        )}>
            {status.replace("_", " ")}
        </span>
    );
}

export default function AdminValidacionesPage() {
    const [projects, setProjects] = useState<ProjectValidation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, ProjectLog[]>>({});
    const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});

    // Transition modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"OBSERVADO" | "RECHAZADO" | "APROBADO" | "EN_REVISION" | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectValidation | null>(null);
    const [nota, setNota] = useState("");
    const [isPending, startTransition] = useTransition();

    const fetchProjects = async () => {
        setLoading(true);
        const res = await getProyectosPendientesValidacion();
        if (res.success && res.data) {
            setProjects(res.data as unknown as ProjectValidation[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchLogs = async (projectId: string) => {
        if (logs[projectId]) return;
        setLoadingLogs(prev => ({ ...prev, [projectId]: true }));
        const res = await getProyectoEstadoLogs(projectId);
        if (res.success && res.data) {
            setLogs(prev => ({ ...prev, [projectId]: res.data as unknown as ProjectLog[] }));
        }
        setLoadingLogs(prev => ({ ...prev, [projectId]: false }));
    };

    const handleExpandOrCollapse = (projectId: string) => {
        if (expandedId === projectId) {
            setExpandedId(null);
        } else {
            setExpandedId(projectId);
            fetchLogs(projectId);
        }
    };

    const openModal = (project: ProjectValidation, type: typeof modalType) => {
        setSelectedProject(project);
        setModalType(type);
        setNota("");
        setModalOpen(true);
    };

    const handleAction = (project: ProjectValidation, toEstado: any, nota?: string) => {
        startTransition(async () => {
            const res = await adminTransitionProyectoState({
                proyectoId: project.id,
                toEstado,
                nota: nota || undefined
            });

            if (res.success) {
                toast.success(`Proyecto ${project.nombre} transicionado a ${toEstado}`);
                setModalOpen(false);
                fetchProjects();
            } else {
                toast.error(res.error || "Error al cambiar estado");
            }
        });
    };

    const getModalTitle = () => {
        if (modalType === "OBSERVADO") return "Agregar Observaciones";
        if (modalType === "RECHAZADO") return "Rechazar Proyecto";
        if (modalType === "APROBADO") return "Aprobar Proyecto";
        if (modalType === "EN_REVISION") return "Poner en Revisión";
        return "";
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in uppercase-none">
            {/* Header */}
            <ModuleHelp content={MODULE_HELP_CONTENT.adminValidaciones} />

            {/* Stats Bar */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0C] border border-white/[0.06] rounded-xl shadow-sm">
                    <Clock className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-semibold text-slate-300">
                        {loading ? "—" : projects.length} proyectos pendientes
                    </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Cronología FIFO — Prioridad a envíos antiguos.</p>
            </div>

            {/* Content Container */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-3xl p-20 text-center border-dashed">
                    <ClipboardCheck className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Todo en orden</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        No hay proyectos esperando validación en este momento. Buen trabajo.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className={cn(
                                "group bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden transition-all duration-300",
                                expandedId === project.id ? "border-slate-700 shadow-xl" : "hover:border-white/10"
                            )}
                        >
                            {/* Card Header Row */}
                            <div className="p-4 flex items-center gap-4 flex-wrap md:flex-nowrap">
                                {/* Project Icon */}
                                <div className="w-12 h-12 rounded-2xl bg-brand-500/5 border border-brand-500/10 flex items-center justify-center shrink-0">
                                    <Building2 className="w-6 h-6 text-brand-500" />
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-bold text-slate-100 truncate">{project.nombre}</h4>
                                        <StatusBadge status={project.estadoValidacion} />
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5" />
                                            {project.submittedBy?.nombre || "Owner desconocido"}
                                        </span>
                                        <span className="opacity-30">|</span>
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            {formatDate(project.fechaSubmit)}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Actions Area */}
                                <div className="flex items-center gap-2">
                                    {project.estadoValidacion === "PENDIENTE_VALIDACION" && (
                                        <button
                                            disabled={isPending}
                                            onClick={() => handleAction(project, "EN_REVISION")}
                                            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                            Evaluar
                                        </button>
                                    )}

                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                                        <button
                                            disabled={isPending}
                                            onClick={() => openModal(project, "APROBADO")}
                                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                            title="Aprobar"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            disabled={isPending}
                                            onClick={() => openModal(project, "OBSERVADO")}
                                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/20 transition-colors"
                                            title="Observar"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                        <button
                                            disabled={isPending}
                                            onClick={() => openModal(project, "RECHAZADO")}
                                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-colors"
                                            title="Rechazar"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => handleExpandOrCollapse(project.id)}
                                        className={cn(
                                            "p-2 rounded-xl border transition-all",
                                            expandedId === project.id
                                                ? "bg-white/10 border-white/20 text-white"
                                                : "bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300"
                                        )}
                                    >
                                        {expandedId === project.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Content */}
                            {expandedId === project.id && (
                                <div className="border-t border-white/[0.06] bg-black/20 p-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="grid md:grid-cols-3 gap-8">
                                        {/* Column 1: Context */}
                                        <div className="space-y-4">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                <History className="w-3 h-3" />
                                                Contexto de envío
                                            </h5>
                                            <div className="space-y-3">
                                                <DetailCard icon={<User className="w-4 h-4" />} label="Solicitante" value={project.submittedBy?.nombre || "N/A"} sub={project.submittedBy?.email} />
                                                <DetailCard icon={<CalendarDays className="w-4 h-4" />} label="Fecha envío" value={formatDate(project.fechaSubmit)} />
                                            </div>
                                        </div>

                                        {/* Column 2: History Timeline */}
                                        <div className="md:col-span-2 space-y-4">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                <Workflow className="w-3 h-3" />
                                                Historial de estados
                                            </h5>
                                            <div className="space-y-3">
                                                {loadingLogs[project.id] ? (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Cargando historial...
                                                    </div>
                                                ) : logs[project.id]?.length === 0 ? (
                                                    <div className="text-xs text-slate-600 italic py-4">Sin registros de cambios.</div>
                                                ) : (
                                                    logs[project.id]?.map((log, idx) => (
                                                        <div key={log.id} className="relative pl-6 py-1 border-l border-white/5 last:border-transparent">
                                                            <div className="absolute left-[-5px] top-2.5 w-2 h-2 rounded-full bg-brand-500/40 border border-brand-500" />
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white font-bold">{log.estadoNuevo.replace("_", " ")}</span>
                                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{formatDate(log.createdAt)}</span>
                                                                    <span className="text-[9px] text-brand-500 font-black uppercase">por {log.realizadoPor?.nombre || "Sistema"}</span>
                                                                </div>
                                                                {log.motivo && (
                                                                    <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.04]">
                                                                        <p className="text-xs text-slate-400 italic leading-relaxed">"{log.motivo}"</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Action Dialog */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="bg-[#0A0A0C] border border-white/[0.1] text-white rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            {modalType === "APROBADO" && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                            {modalType === "OBSERVADO" && <AlertTriangle className="w-6 h-6 text-amber-500" />}
                            {modalType === "RECHAZADO" && <XCircle className="w-6 h-6 text-rose-500" />}
                            {getModalTitle()}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">
                            Proyecto: <span className="text-white font-bold">{selectedProject?.nombre}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {(modalType === "OBSERVADO" || modalType === "RECHAZADO") && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Motivo y recomendaciones</label>
                                <textarea
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value)}
                                    placeholder="Detallá qué necesita corregir el desarrollador..."
                                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors resize-none"
                                />
                            </div>
                        )}
                        {modalType === "APROBADO" && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex gap-3">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                                    Al aprobar el proyecto, se habilitarán las operaciones comerciales automáticas (leads, reservas y publicación) según las reglas del sistema.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <button
                            disabled={isPending}
                            onClick={() => setModalOpen(false)}
                            className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={isPending || ((modalType === "OBSERVADO" || modalType === "RECHAZADO") && !nota.trim())}
                            onClick={() => handleAction(selectedProject!, modalType, nota)}
                            className={cn(
                                "px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2",
                                modalType === "APROBADO" ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40" :
                                    modalType === "RECHAZADO" ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/40" :
                                        "bg-brand-600 hover:bg-brand-500 shadow-brand-900/40"
                            )}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar acción"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DetailCard({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub?: string }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-0.5">{label}</p>
                <p className="text-xs font-bold text-slate-200 truncate">{value}</p>
                {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
            </div>
        </div>
    );
}

function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
