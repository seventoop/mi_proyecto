"use client";

import React, { useState } from "react";
import { 
    History, ChevronDown, ChevronUp, User, 
    Calendar, MessageSquare, Workflow 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectLog {
    id: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    motivo: string | null;
    createdAt: Date | string;
    realizadoPor: {
        id: string;
        nombre: string;
        email: string;
    } | null;
}

interface ProjectValidationHistoryProps {
    logs: ProjectLog[];
    initialExpanded?: boolean;
}

const ESTADO_LABELS: Record<string, string> = {
    BORRADOR: "Borrador",
    PENDIENTE_VALIDACION: "Enviado a Validación",
    EN_REVISION: "En Revisión Técnica",
    APROBADO: "Habilitado para Operar",
    OBSERVADO: "Observaciones de Administración",
    RECHAZADO: "Proyecto Rechazado",
    SUSPENDIDO: "Operación Suspendida",
};

export default function ProjectValidationHistory({ 
    logs, 
    initialExpanded = false 
}: ProjectValidationHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);

    if (!logs || logs.length === 0) return null;

    return (
        <div className="glass-card overflow-hidden border-white/[0.06] bg-[#0A0A0C]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
                        <History className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Historial de Validación</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Cronología de transiciones y aprobaciones</p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {isExpanded && (
                <div className="p-6 pt-2 border-t border-white/[0.04] animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-white/5">
                        {logs.map((log, idx) => (
                            <div key={log.id} className="relative pl-8">
                                {/* Dot Indicator */}
                                <div className={cn(
                                    "absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-[#0A0A0C] flex items-center justify-center",
                                    idx === 0 ? "bg-brand-500" : "bg-slate-800"
                                )}>
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        idx === 0 ? "bg-white" : "bg-slate-500"
                                    )} />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border",
                                                log.estadoNuevo === "APROBADO" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                log.estadoNuevo === "RECHAZADO" || log.estadoNuevo === "SUSPENDIDO" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                log.estadoNuevo === "OBSERVADO" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                "bg-white/5 text-slate-300 border-white/10"
                                            )}>
                                                {ESTADO_LABELS[log.estadoNuevo] || log.estadoNuevo.replace("_", " ")}
                                            </span>
                                            {idx === 0 && (
                                                <span className="text-[9px] font-black text-brand-500 uppercase tracking-tighter">Estado Actual</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </div>
                                    </div>

                                    {log.motivo && (
                                        <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.04]">
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                                                <p className="text-xs text-slate-400 italic leading-relaxed">
                                                    "{log.motivo}"
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <User className="w-3 h-3" />
                                        <span className="font-bold text-slate-400">{log.realizadoPor?.nombre || "Sistema"}</span>
                                        <span className="opacity-30">•</span>
                                        <span className="uppercase tracking-tight opacity-70">Transición</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
