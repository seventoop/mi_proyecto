"use client";

import { useState, useEffect, useTransition } from "react";
import {
    FileText, CheckCircle, XCircle, Clock, ShieldCheck,
    Building2, User, CalendarDays, AlertTriangle, ChevronDown,
    ChevronUp, ExternalLink, Loader2
} from "lucide-react";
import { getPendingMandates, approveMandate, rejectMandate } from "@/lib/actions/mandate-actions";
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

type Mandate = {
    id: string;
    tipoRelacion: string;
    tipoMandato: string | null;
    mandatoVigenciaDesde: string | null;
    mandatoVigenciaHasta: string | null;
    documentoMandatoUrl: string | null;
    notas: string | null;
    createdAt: string;
    proyecto: { id: string; nombre: string; orgId: string | null };
    user: { id: string; nombre: string; email: string };
    asignadoPor: { id: string; nombre: string } | null;
};

function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    try {
        return format(new Date(d), "dd/MM/yyyy", { locale: es });
    } catch {
        return "—";
    }
}

function TipoMandatoBadge({ tipo }: { tipo: string }) {
    const isExclusivo = tipo === "COMERCIALIZADOR_EXCLUSIVO" || tipo === "EXCLUSIVO";
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-widest border",
            isExclusivo
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-sky-500/10 text-sky-400 border-sky-500/20"
        )}>
            {isExclusivo ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
            {isExclusivo ? "Exclusivo" : "No Exclusivo"}
        </span>
    );
}

function DocLink({ url }: { url: string | null }) {
    if (!url) return (
        <div className="flex items-center gap-2 text-slate-600 text-xs">
            <FileText className="w-4 h-4" />
            <span>Sin documento</span>
        </div>
    );
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0A0A0C] border border-white/[0.06] hover:border-brand-500/30 text-brand-400 hover:text-brand-300 transition-all text-xs font-semibold group"
        >
            <FileText className="w-3.5 h-3.5" />
            Ver documento
            <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </a>
    );
}

export default function AdminMandatosPage() {
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Reject dialog state
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<Mandate | null>(null);
    const [rejectMotivo, setRejectMotivo] = useState("");
    const [isPending, startTransition] = useTransition();

    const fetchMandates = async () => {
        setLoading(true);
        const res = await getPendingMandates();
        if (res.success && res.data) {
            setMandates(res.data as unknown as Mandate[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMandates();
    }, []);

    const handleApprove = (mandate: Mandate) => {
        startTransition(async () => {
            const res = await approveMandate({
                proyectoId: mandate.proyecto.id,
                targetUserId: mandate.user.id,
            });
            if (res.success) {
                toast.success(`Mandato aprobado para ${mandate.user.nombre}`);
                fetchMandates();
            } else {
                toast.error(res.error ?? "Error al aprobar el mandato");
            }
        });
    };

    const handleRejectConfirm = () => {
        if (!rejectTarget) return;
        startTransition(async () => {
            const res = await rejectMandate({
                proyectoId: rejectTarget.proyecto.id,
                targetUserId: rejectTarget.user.id,
                motivo: rejectMotivo || undefined,
            });
            if (res.success) {
                toast.success(`Mandato rechazado para ${rejectTarget.user.nombre}`);
                setRejectOpen(false);
                setRejectTarget(null);
                setRejectMotivo("");
                fetchMandates();
            } else {
                toast.error(res.error ?? "Error al rechazar el mandato");
            }
        });
    };

    const openRejectDialog = (mandate: Mandate) => {
        setRejectTarget(mandate);
        setRejectMotivo("");
        setRejectOpen(true);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <ModuleHelp content={MODULE_HELP_CONTENT.adminMandatos} />

            {/* Stats bar */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-xl">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-slate-300">
                        {loading ? "—" : mandates.length} pendientes
                    </span>
                </div>
                <p className="text-xs text-slate-500">Ordenados por fecha de envío — más antiguo primero.</p>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            ) : mandates.length === 0 ? (
                <div className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-16 text-center border-dashed">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Sin mandatos pendientes</h3>
                    <p className="text-sm text-slate-500">Todos los mandatos han sido procesados.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {mandates.map((mandate) => {
                        const isExpanded = expandedId === mandate.id;
                        return (
                            <div
                                key={mandate.id}
                                className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden transition-colors duration-300"
                            >
                                {/* Row header */}
                                <div className="flex items-center gap-4 p-5">
                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5 text-amber-400" />
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-white text-sm truncate">
                                                {mandate.proyecto.nombre}
                                            </span>
                                            <TipoMandatoBadge tipo={mandate.tipoRelacion} />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {mandate.user.nombre}
                                            <span className="opacity-40 mx-1">·</span>
                                            {mandate.user.email}
                                        </p>
                                    </div>

                                    {/* Vigencia */}
                                    <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <CalendarDays className="w-3.5 h-3.5" />
                                            {formatDate(mandate.mandatoVigenciaDesde)} — {formatDate(mandate.mandatoVigenciaHasta)}
                                        </div>
                                        <span className="text-xs text-slate-600">
                                            Enviado {formatDate(mandate.createdAt)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleApprove(mandate)}
                                            disabled={isPending}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => openRejectDialog(mandate)}
                                            disabled={isPending}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            Rechazar
                                        </button>
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : mandate.id)}
                                            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border border-white/[0.06] transition-all"
                                        >
                                            {isExpanded
                                                ? <ChevronUp className="w-4 h-4" />
                                                : <ChevronDown className="w-4 h-4" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Left column */}
                                            <div className="space-y-3">
                                                <DetailRow label="Comercializador" icon={<User className="w-3.5 h-3.5" />}>
                                                    {mandate.user.nombre} ({mandate.user.email})
                                                </DetailRow>
                                                <DetailRow label="Proyecto" icon={<Building2 className="w-3.5 h-3.5" />}>
                                                    {mandate.proyecto.nombre}
                                                </DetailRow>
                                                <DetailRow label="Propuesto por" icon={<User className="w-3.5 h-3.5" />}>
                                                    {mandate.asignadoPor?.nombre ?? "—"}
                                                </DetailRow>
                                                <DetailRow label="Tipo de mandato" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                                                    <TipoMandatoBadge tipo={mandate.tipoRelacion} />
                                                </DetailRow>
                                            </div>
                                            {/* Right column */}
                                            <div className="space-y-3">
                                                <DetailRow label="Vigencia desde" icon={<CalendarDays className="w-3.5 h-3.5" />}>
                                                    {formatDate(mandate.mandatoVigenciaDesde)}
                                                </DetailRow>
                                                <DetailRow label="Vigencia hasta" icon={<CalendarDays className="w-3.5 h-3.5" />}>
                                                    {formatDate(mandate.mandatoVigenciaHasta)}
                                                </DetailRow>
                                                <DetailRow label="Documento" icon={<FileText className="w-3.5 h-3.5" />}>
                                                    <DocLink url={mandate.documentoMandatoUrl} />
                                                </DetailRow>
                                            </div>
                                        </div>
                                        {mandate.notas && (
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Notas del owner</p>
                                                <p className="text-sm text-slate-300 leading-relaxed">{mandate.notas}</p>
                                            </div>
                                        )}
                                        {mandate.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" && (
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-300 leading-relaxed">
                                                    Este mandato es <strong>exclusivo</strong>. Si lo aprobás, se bloqueará la asignación de otros comercializadores exclusivos durante la vigencia.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Reject dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white font-bold">Rechazar mandato</DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">
                            Estás rechazando el mandato de <strong className="text-white">{rejectTarget?.user.nombre}</strong> para el proyecto <strong className="text-white">{rejectTarget?.proyecto.nombre}</strong>.
                            El comercializador recibirá una notificación.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                            Motivo del rechazo (opcional)
                        </label>
                        <textarea
                            value={rejectMotivo}
                            onChange={e => setRejectMotivo(e.target.value)}
                            placeholder="Documentación insuficiente, conflicto de exclusividad, datos incorrectos..."
                            rows={3}
                            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600 text-sm p-3 resize-none focus:outline-none focus:border-white/[0.12] transition-colors"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <button
                            onClick={() => setRejectOpen(false)}
                            disabled={isPending}
                            className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-300 text-sm font-semibold hover:bg-white/[0.06] transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleRejectConfirm}
                            disabled={isPending}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-all shadow-lg shadow-rose-500/20 disabled:opacity-60"
                        >
                            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Confirmar rechazo
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Helper component ──────────────────────────────────────────────────────────

function DetailRow({
    label,
    icon,
    children,
}: {
    label: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5 text-slate-500">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-0.5">{label}</p>
                <div className="text-sm text-slate-300">{children}</div>
            </div>
        </div>
    );
}
