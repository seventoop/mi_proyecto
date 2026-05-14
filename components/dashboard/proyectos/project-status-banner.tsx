"use client";

import { useTransition } from "react";
import { 
    AlertTriangle, CheckCircle, Search, Clock, 
    XCircle, ShieldAlert, Loader2, ArrowRight 
} from "lucide-react";
import { adminTransitionProyectoState } from "@/lib/actions/project-state-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProjectStatusBannerProps {
    proyectoId: string;
    proyectoNombre: string;
    estadoValidacion: string;
}

export default function ProjectStatusBanner({ 
    proyectoId, 
    proyectoNombre, 
    estadoValidacion 
}: ProjectStatusBannerProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    if (estadoValidacion === "APROBADO") return null;

    const config: Record<string, { 
        bg: string, 
        border: string, 
        text: string, 
        icon: any, 
        title: string, 
        desc: string,
        btnText?: string,
        nextState?: any
    }> = {
        BORRADOR: {
            bg: "bg-slate-500/5",
            border: "border-slate-500/20",
            text: "text-slate-400",
            icon: Clock,
            title: "Proyecto en Borrador",
            desc: "Este proyecto aún no ha sido enviado para validación por el desarrollador."
        },
        PENDIENTE_VALIDACION: {
            bg: "bg-amber-500/5",
            border: "border-amber-500/20",
            text: "text-amber-400",
            icon: Clock,
            title: "Pendiente de Validación",
            desc: "El desarrollador envió este proyecto para su revisión.",
            btnText: "Empezar Revisión",
            nextState: "EN_REVISION"
        },
        EN_REVISION: {
            bg: "bg-sky-500/5",
            border: "border-sky-500/20",
            text: "text-sky-400",
            icon: Search,
            title: "En Revisión",
            desc: "Usted (u otro administrador) está revisando este proyecto actualmente."
        },
        OBSERVADO: {
            bg: "bg-amber-600/5",
            border: "border-amber-600/20",
            text: "text-amber-500",
            icon: AlertTriangle,
            title: "Con Observaciones",
            desc: "El proyecto fue observado y está a la espera de correcciones por parte del desarrollador."
        },
        RECHAZADO: {
            bg: "bg-rose-500/5",
            border: "border-rose-500/20",
            text: "text-rose-400",
            icon: XCircle,
            title: "Proyecto Rechazado",
            desc: "Este proyecto fue rechazado y no puede operar comercialmente."
        },
        SUSPENDIDO: {
            bg: "bg-rose-900/10",
            border: "border-rose-900/30",
            text: "text-rose-500",
            icon: ShieldAlert,
            title: "Proyecto Suspendido",
            desc: "Operaciones pausadas por administración. Bloqueo operativo total activo."
        }
    };

    const current = config[estadoValidacion] || config.BORRADOR;
    const Icon = current.icon;

    const handleAction = (toEstado: any) => {
        startTransition(async () => {
            const res = await adminTransitionProyectoState({
                proyectoId,
                toEstado,
                nota: `Acción rápida desde vista de detalle.`
            });

            if (res.success) {
                toast.success(`Estado actualizado a ${toEstado}`);
                router.refresh();
            } else {
                toast.error(res.error || "Error al actualizar estado");
            }
        });
    };

    return (
        <div className={cn(
            "p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 mb-6 animate-fade-in",
            current.bg,
            current.border
        )}>
            <div className="flex items-center gap-4 text-center md:text-left">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    current.border,
                    "bg-white/[0.02]"
                )}>
                    <Icon className={cn("w-5 h-5", current.text)} />
                </div>
                <div>
                    <h3 className={cn("text-sm font-bold", current.text)}>{current.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{current.desc}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {current.btnText && (
                    <button
                        onClick={() => handleAction(current.nextState)}
                        disabled={isPending}
                        className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2"
                    >
                        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        {current.btnText}
                    </button>
                )}
                
                <button
                    onClick={() => router.push('/dashboard/admin/validaciones')}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                >
                    Ir a la Cola de Validación
                </button>
            </div>
        </div>
    );
}
