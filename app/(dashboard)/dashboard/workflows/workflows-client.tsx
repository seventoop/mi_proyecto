"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Zap, Plus, Play, ChevronDown, ChevronUp, CheckCircle2,
    XCircle, Clock, Pause, Loader2, GitBranch, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowRun {
    id: string;
    estado: string;
    startedAt: string;
    finishedAt: string | null;
}

interface WorkflowRow {
    id: string;
    nombre: string;
    descripcion: string | null;
    trigger: string;
    activo: boolean;
    version: number;
    createdAt: string;
    _count: { nodos: number; runs: number };
    runs: WorkflowRun[];
}

interface WorkflowsClientProps {
    initialWorkflows: WorkflowRow[];
    orgId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const triggerLabel: Record<string, string> = {
    NEW_LEAD: "Nuevo Lead",
    LEAD_STATUS_CHANGE: "Cambio Estado Lead",
    MANUAL: "Manual",
    SCHEDULED: "Programado",
};

const triggerColor: Record<string, string> = {
    NEW_LEAD: "bg-emerald-500/10 text-emerald-500",
    LEAD_STATUS_CHANGE: "bg-amber-500/10 text-amber-500",
    MANUAL: "bg-brand-500/10 text-brand-500",
    SCHEDULED: "bg-violet-500/10 text-violet-500",
};

const estadoIcon: Record<string, React.ReactNode> = {
    SUCCESS: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    FAILED: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
    RUNNING: <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />,
    PAUSED: <Pause className="w-3.5 h-3.5 text-amber-500" />,
};

const estadoClass: Record<string, string> = {
    SUCCESS: "text-emerald-500",
    FAILED: "text-rose-500",
    RUNNING: "text-brand-500",
    PAUSED: "text-amber-500",
};

function RelativeTime({ date }: { date: string }) {
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return <>{diff}s atrás</>;
    if (diff < 3600) return <>{Math.floor(diff / 60)}m atrás</>;
    if (diff < 86400) return <>{Math.floor(diff / 3600)}h atrás</>;
    return <>{d.toLocaleDateString("es-AR")}</>;
}

// ─── Create Workflow Modal ────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [nombre, setNombre] = useState("");
    const [trigger, setTrigger] = useState<string>("NEW_LEAD");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, trigger, nodos: [] }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Error al crear workflow");
            }
            toast.success("Workflow creado");
            onCreated();
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">Nuevo Workflow</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                        <input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Calificación automática de leads"
                            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trigger</label>
                        <select
                            value={trigger}
                            onChange={(e) => setTrigger(e.target.value)}
                            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
                        >
                            {Object.entries(triggerLabel).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Crear
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Run History Row ──────────────────────────────────────────────────────────

function RunHistoryRow({ run }: { run: WorkflowRun & { pasos?: { id: string; nodoTipo: string; estado: string; ms: number | null; input: unknown; output: unknown }[] } }) {
    const [expanded, setExpanded] = useState(false);
    const [pasos, setPasos] = useState(run.pasos ?? null);
    const [loading, setLoading] = useState(false);

    const loadPasos = async () => {
        if (pasos) { setExpanded(!expanded); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/workflows/runs/${run.id}`);
            if (res.ok) { const data = await res.json(); setPasos(data.pasos ?? []); }
        } finally {
            setLoading(false);
            setExpanded(true);
        }
    };

    const ms = run.finishedAt
        ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()))
        : null;

    return (
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
                onClick={loadPasos}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
                {estadoIcon[run.estado] ?? <Clock className="w-3.5 h-3.5 text-slate-400" />}
                <span className={cn("text-xs font-bold", estadoClass[run.estado] ?? "text-slate-400")}>
                    {run.estado}
                </span>
                <span className="text-xs text-slate-400 ml-auto"><RelativeTime date={run.startedAt} /></span>
                {ms !== null && <span className="text-xs text-slate-400">{ms}ms</span>}
                {loading ? <Loader2 className="w-3 h-3 animate-spin text-slate-400" /> : expanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>

            {expanded && pasos && (
                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {pasos.length === 0 && (
                        <p className="px-4 py-3 text-xs text-slate-400">Sin pasos registrados</p>
                    )}
                    {pasos.map((paso) => (
                        <div key={paso.id} className="px-4 py-2.5 flex items-center gap-3">
                            {estadoIcon[paso.estado] ?? <Clock className="w-3 h-3 text-slate-400" />}
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{paso.nodoTipo}</span>
                            <span className={cn("text-[10px] font-bold", estadoClass[paso.estado] ?? "text-slate-400")}>{paso.estado}</span>
                            {paso.ms !== null && <span className="text-[10px] text-slate-400 ml-auto">{paso.ms}ms</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({ workflow, onToggle, onRun }: {
    workflow: WorkflowRow;
    onToggle: (id: string, activo: boolean) => void;
    onRun: (id: string) => void;
}) {
    const [historyOpen, setHistoryOpen] = useState(false);
    const [runs, setRuns] = useState<WorkflowRun[]>(workflow.runs);
    const [loadingRuns, setLoadingRuns] = useState(false);

    const lastRun = runs[0];

    const loadHistory = async () => {
        if (historyOpen) { setHistoryOpen(false); return; }
        setHistoryOpen(true);
        setLoadingRuns(true);
        try {
            const res = await fetch(`/api/workflows?id=${workflow.id}`);
            if (res.ok) {
                const data = await res.json();
                const wf = Array.isArray(data) ? data.find((w: WorkflowRow) => w.id === workflow.id) : data;
                if (wf?.runs) setRuns(wf.runs);
            }
        } finally {
            setLoadingRuns(false);
        }
    };

    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{workflow.nombre}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${triggerColor[workflow.trigger] ?? "bg-slate-500/10 text-slate-400"}`}>
                            {triggerLabel[workflow.trigger] ?? workflow.trigger}
                        </span>
                    </div>
                    {workflow.descripcion && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{workflow.descripcion}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-slate-400"><GitBranch className="w-3 h-3 inline mr-0.5" />v{workflow.version}</span>
                        <span className="text-[10px] text-slate-400">{workflow._count.nodos} nodos</span>
                        <span className="text-[10px] text-slate-400">{workflow._count.runs} runs</span>
                        {lastRun && (
                            <span className={cn("text-[10px] font-bold flex items-center gap-0.5", estadoClass[lastRun.estado] ?? "text-slate-400")}>
                                {estadoIcon[lastRun.estado]}
                                <RelativeTime date={lastRun.startedAt} />
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Active toggle */}
                    <button
                        onClick={() => onToggle(workflow.id, !workflow.activo)}
                        className={cn(
                            "relative w-9 h-5 rounded-full transition-colors",
                            workflow.activo ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                        )}
                        title={workflow.activo ? "Desactivar" : "Activar"}
                    >
                        <span className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                            workflow.activo ? "translate-x-4" : "translate-x-0.5"
                        )} />
                    </button>

                    {/* Manual run */}
                    <button
                        onClick={() => onRun(workflow.id)}
                        className="p-1.5 rounded-lg text-brand-500 hover:bg-brand-500/10 transition-colors"
                        title="Ejecutar manualmente"
                    >
                        <Play className="w-3.5 h-3.5" />
                    </button>

                    {/* History toggle */}
                    <button
                        onClick={loadHistory}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Ver historial de runs"
                    >
                        <Activity className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {historyOpen && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial de ejecuciones</p>
                    {loadingRuns ? (
                        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando...
                        </div>
                    ) : runs.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">Sin ejecuciones registradas</p>
                    ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto">
                            {runs.map((run) => <RunHistoryRow key={run.id} run={run} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkflowsClient({ initialWorkflows, orgId }: WorkflowsClientProps) {
    const router = useRouter();
    const [workflows, setWorkflows] = useState<WorkflowRow[]>(initialWorkflows);
    const [showCreate, setShowCreate] = useState(false);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    const refresh = () => startTransition(() => router.refresh());

    const handleToggle = async (id: string, activo: boolean) => {
        setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, activo } : w));
        try {
            const res = await fetch(`/api/workflows/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activo }),
            });
            if (!res.ok) throw new Error("Error al actualizar");
            toast.success(activo ? "Workflow activado" : "Workflow desactivado");
        } catch {
            // Revert optimistic update
            setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, activo: !activo } : w));
            toast.error("Error al actualizar workflow");
        }
    };

    const handleRun = async (id: string) => {
        setRunningId(id);
        try {
            const res = await fetch(`/api/workflows/${id}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Error al ejecutar");
            toast.success(`Run ${data.estado} — ${data.pasos?.length ?? 0} pasos`);
            refresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error al ejecutar workflow");
        } finally {
            setRunningId(null);
        }
    };

    return (
        <>
            {showCreate && (
                <CreateModal onClose={() => setShowCreate(false)} onCreated={refresh} />
            )}

            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{workflows.length} workflow{workflows.length !== 1 ? "s" : ""}</p>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Workflow
                </button>
            </div>

            {workflows.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Zap className="w-10 h-10 text-brand-500/30 mx-auto mb-3" />
                    <p className="font-bold text-slate-600 dark:text-slate-400">Sin workflows todavía</p>
                    <p className="text-sm text-slate-400 mt-1">
                        Crea tu primer workflow para automatizar acciones en el CRM.
                    </p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Workflow
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {workflows.map((wf) => (
                        <WorkflowCard
                            key={wf.id}
                            workflow={{ ...wf, runs: wf.runs }}
                            onToggle={handleToggle}
                            onRun={handleRun}
                        />
                    ))}
                </div>
            )}

            {runningId && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl px-5 py-3">
                    <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Ejecutando workflow...</span>
                </div>
            )}
        </>
    );
}
