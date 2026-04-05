import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepLink {
    id: string;
    num: number;
    label: string;
}

interface ProjectStepsDockProps {
    prevStep: StepLink | null;
    nextStep: StepLink | null;
    className?: string;
}

export default function ProjectStepsDock({
    prevStep,
    nextStep,
    className,
}: ProjectStepsDockProps) {
    return (
        <div className={cn("shrink-0", className)}>
            <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <div className="min-w-0">
                        {prevStep ? (
                            <Link
                                href={`?tab=${prevStep.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-brand-500 dark:text-slate-400"
                                title={`Ir al Paso ${prevStep.num}: ${prevStep.label}`}
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span className="truncate">Paso {prevStep.num}: {prevStep.label}</span>
                            </Link>
                        ) : (
                            <div />
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-3 text-[11px]">
                        <a
                            href="mailto:soporte@seventoop.com"
                            title="Soporte técnico"
                            className="text-slate-400 transition-colors hover:text-brand-500"
                        >
                            Soporte
                        </a>
                        <span className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
                        <a
                            href="mailto:feedback@seventoop.com?subject=Feedback del sistema"
                            title="Envianos tu opinión"
                            className="font-semibold text-brand-500 transition-colors hover:text-brand-400"
                        >
                            Feedback
                        </a>
                    </div>

                    <div className="flex min-w-0 items-center justify-end">
                        {nextStep ? (
                            <Link
                                href={`?tab=${nextStep.id}`}
                                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-600"
                                title={`Ir al Paso ${nextStep.num}: ${nextStep.label}`}
                            >
                                <span className="truncate">Paso {nextStep.num}: {nextStep.label}</span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Todos los pasos revisados
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
