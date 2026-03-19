import React from "react";
import { 
    AlertTriangle, CheckCircle, Clock, XCircle, 
    ShieldAlert, Calendar, History, ArrowRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectAccessContext } from "@/lib/project-access";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DeveloperStatusIndicatorsProps {
    context: ProjectAccessContext;
    latestLog?: {
        estadoNuevo: string;
        motivo: string | null;
        createdAt: Date;
    } | null;
}

export default function DeveloperStatusIndicators({ 
    context, 
    latestLog 
}: DeveloperStatusIndicatorsProps) {
    const { proyecto, relacion } = context;
    const projectStatus = proyecto.estadoValidacion;
    const relationStatus = relacion?.estadoRelacion;
    const isMandato = 
        relacion?.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" || 
        relacion?.tipoRelacion === "COMERCIALIZADOR_NO_EXCLUSIVO";

    // ─── 1. Badge Contextual ──────────────────────────────────────────────────
    // Se muestra en el header de la página (este componente renderiza banners + badges)
    
    // ─── 2. Lógica de Banners (Prioridad Global) ──────────────────────────────
    
    // A. Bloqueos de Proyecto (Prioridad Máxima)
    const showProjectBanner = ["OBSERVADO", "RECHAZADO", "SUSPENDIDO"].includes(projectStatus);
    
    // B. Bloqueos de Mandato (Solo si el proyecto no está bloqueado)
    const showMandateBanner = !showProjectBanner && isMandato && ["PENDIENTE", "VENCIDA", "RECHAZADA"].includes(relationStatus || "");

    return (
        <div className="space-y-4">
            {/* PROJECT BLOCKING BANNERS */}
            {showProjectBanner && (
                <StatusBanner
                    type={projectStatus === "OBSERVADO" ? "warning" : "error"}
                    icon={projectStatus === "OBSERVADO" ? AlertTriangle : XCircle}
                    title={
                        projectStatus === "OBSERVADO" ? "Proyecto con Observaciones" :
                        projectStatus === "RECHAZADO" ? "Proyecto Rechazado" :
                        "Proyecto Suspendido"
                    }
                    description={
                        projectStatus === "OBSERVADO" ? "Tu proyecto requiere correcciones antes de ser aprobado. Revisá los comentarios de administración." :
                        projectStatus === "RECHAZADO" ? "Este proyecto fue rechazado por la administración de SevenToop y no puede operar en la plataforma." :
                        "Este proyecto ha sido suspendido temporalmente. Todas las operaciones comerciales están pausadas."
                    }
                    footer={latestLog?.motivo && (
                        <div className="mt-3 p-3 bg-black/5 dark:bg-black/20 rounded-xl border border-black/5 dark:border-white/5 italic text-xs">
                            "{latestLog.motivo}"
                        </div>
                    )}
                />
            )}

            {/* MANDATE BANNERS (Only if no project block) */}
            {showMandateBanner && (
                <StatusBanner
                    type={relationStatus === "PENDIENTE" ? "info" : "error"}
                    icon={relationStatus === "PENDIENTE" ? Clock : ShieldAlert}
                    title={
                        relationStatus === "PENDIENTE" ? "Autorización en Revisión" :
                        relationStatus === "VENCIDA" ? "Mandato de Venta Expirado" :
                        "Autorización Rechazada"
                    }
                    description={
                        relationStatus === "PENDIENTE" ? "Enviamos tu solicitud de mandato a revisión. Te notificaremos cuando SevenToop la apruebe." :
                        relationStatus === "VENCIDA" ? `Tu autorización para comercializar este proyecto expiró${relacion?.mandatoVigenciaHasta ? ` el ${format(relacion.mandatoVigenciaHasta, "dd/MM/yyyy", { locale: es })}` : ""}.` :
                        "Tu solicitud para comercializar este proyecto fue rechazada por la administración."
                    }
                />
            )}
        </div>
    );
}

interface StatusBannerProps {
    type: "warning" | "error" | "info" | "success";
    icon: any;
    title: string;
    description: string;
    footer?: React.ReactNode;
}

function StatusBanner({ type, icon: Icon, title, description, footer }: StatusBannerProps) {
    const styles = {
        warning: "bg-amber-500/5 border-amber-500/20 text-amber-500",
        error: "bg-rose-500/5 border-rose-500/20 text-rose-500",
        info: "bg-sky-500/5 border-sky-500/20 text-sky-500",
        success: "bg-emerald-500/5 border-emerald-500/20 text-emerald-500",
    };

    return (
        <div className={cn(
            "p-5 rounded-2xl border flex items-start gap-4 animate-fade-in",
            styles[type] || styles.info
        )}>
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-white/[0.02]",
                styles[type].split(" ")[1] // border color
            )}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h3 className="text-sm font-bold mb-1">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                </p>
                {footer}
            </div>
        </div>
    );
}

/**
 * Separate component for the Header Badge to be used in the top area.
 */
export function StatusBadge({ context }: { context: ProjectAccessContext }) {
    const { proyecto, relacion } = context;
    const isOwner = relacion?.tipoRelacion === "OWNER" || context.isLegacy;
    const isMandato = 
        relacion?.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" || 
        relacion?.tipoRelacion === "COMERCIALIZADOR_NO_EXCLUSIVO";

    // Si es Owner, mostramos el estado de validación del proyecto
    if (isOwner) {
        return <Badge label={proyecto.estadoValidacion} variant={
            proyecto.estadoValidacion === "APROBADO" ? "success" :
            proyecto.estadoValidacion === "BORRADOR" ? "muted" :
            ["RECHAZADO", "SUSPENDIDO"].includes(proyecto.estadoValidacion) ? "error" : "warning"
        } />;
    }

    // Si es Comercializador, mostramos el estado de su mandato
    if (isMandato && relacion) {
        return (
            <div className="flex items-center gap-2">
                <Badge label={relacion.estadoRelacion} variant={
                    relacion.estadoRelacion === "ACTIVA" ? "success" :
                    relacion.estadoRelacion === "PENDIENTE" ? "warning" : "error"
                } />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-50">
                    Mandato {relacion.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" ? "Exclusivo" : "No Exclusivo"}
                </span>
            </div>
        );
    }

    // Fallback para otros roles (Vendedor asignado, etc)
    return <Badge label={relacion?.estadoRelacion || "DESCONOCIDO"} variant="muted" />;
}

function Badge({ label, variant }: { label: string, variant: "success" | "warning" | "error" | "muted" }) {
    const styles = {
        success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        muted: "bg-slate-500/10 text-slate-400 border-white/10",
    };

    return (
        <span className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shrink-0",
            styles[variant]
        )}>
            {label.replace("_", " ")}
        </span>
    );
}
