import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { Target } from "lucide-react";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import EmptyOrgState from "@/components/dashboard/empty-org-state";

export const dynamic = "force-dynamic";

const ETAPA_CONFIG: Record<string, { nombre: string; color: string }> = {
    NUEVO: { nombre: "Nuevo", color: "border-slate-500" },
    CONTACTADO: { nombre: "Contactado", color: "border-brand-500" },
    CALIFICADO: { nombre: "Calificado", color: "border-violet-500" },
    VISITA: { nombre: "Visita", color: "border-amber-500" },
    NEGOCIACION: { nombre: "Negociación", color: "border-orange-500" },
    RESERVA: { nombre: "Reserva", color: "border-emerald-500" },
    PERDIDO: { nombre: "Perdido", color: "border-slate-600" },
};

export default async function OportunidadesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const userId = session.user.id;
    const orgId = session.user.orgId;

    if (!orgId) {
        return (
            <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
                <ModuleHelp content={MODULE_HELP_CONTENT.crmPipeline} />
                <EmptyOrgState moduleName="Pipeline de Oportunidades" />
            </div>
        );
    }

    const where: any = { lead: { orgId } };

    const oportunidades = await prisma.oportunidad.findMany({
        where,
        include: {
            lead: { select: { nombre: true } },
            proyecto: { select: { nombre: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Group by etapa
    const grouped: Record<string, typeof oportunidades> = {};
    for (const op of oportunidades) {
        const key = op.etapa || "NUEVO";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(op);
    }

    const etapas = Object.entries(ETAPA_CONFIG);
    const totalOps = oportunidades.length;

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.crmPipeline} />
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-widest text-[11px]">
                        {totalOps === 0
                            ? "Convierte leads en oportunidades desde el módulo de Leads."
                            : `${totalOps} oportunidad${totalOps !== 1 ? "es" : ""} activa${totalOps !== 1 ? "s" : ""}`}
                    </p>
                </div>
            </div>

            {totalOps === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200 dark:border-white/[0.04]">
                    <Target className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        No hay oportunidades aún
                    </h3>
                    <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-sm mx-auto">
                        Ve a <strong>Leads</strong>, abre un lead y usa &quot;Convertir en Oportunidad&quot;.
                    </p>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {etapas.map(([etapaKey, etapaConf]) => {
                        const items = grouped[etapaKey] || [];
                        return (
                            <div
                                key={etapaKey}
                                className={`flex-shrink-0 w-80 border-t-[3px] border-x border-b border-x-white/[0.04] border-b-white/[0.04] ${etapaConf.color} rounded-2xl bg-white/[0.01] shadow-sm dark:shadow-none`}
                            >
                                <div className="p-4 flex items-center justify-between border-b border-white/[0.04] bg-white/50 dark:bg-zinc-950/50 rounded-t-2xl">
                                    <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                        {etapaConf.nombre}
                                    </h3>
                                    <span className="text-[10px] font-black text-slate-500 dark:text-white/30 bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-md">
                                        {items.length}
                                    </span>
                                </div>
                                <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                    {items.map((op) => (
                                        <div
                                            key={op.id}
                                            className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] hover:bg-slate-50 dark:hover:bg-white/[0.03] p-4 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group"
                                        >
                                            <p className="text-[13px] font-black text-slate-900 dark:text-zinc-100 group-hover:text-brand-500 transition-colors uppercase tracking-tight truncate">
                                                {op.lead.nombre}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-500 dark:text-white/20 uppercase tracking-tighter mt-1">
                                                {op.proyecto.nombre}
                                            </p>
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-[11px] font-black text-brand-500 px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20">
                                                    {op.valorEstimado
                                                        ? `$${Number(op.valorEstimado).toLocaleString("es-AR")}`
                                                        : "—"}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">
                                                    {op.probabilidad}% prob.
                                                </span>
                                            </div>
                                            <div className="mt-3 h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-brand-500"
                                                    style={{ width: `${op.probabilidad}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
