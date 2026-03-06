import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { Target } from "lucide-react";

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

    // Filter by org if available, otherwise by project ownership
    const where: any = orgId
        ? { lead: { orgId } }
        : { proyecto: { creadoPorId: userId } };

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
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Pipeline de Oportunidades
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {totalOps === 0
                            ? "Convierte leads en oportunidades desde el módulo de Leads."
                            : `${totalOps} oportunidad${totalOps !== 1 ? "es" : ""} activa${totalOps !== 1 ? "s" : ""}`}
                    </p>
                </div>
            </div>

            {totalOps === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                        No hay oportunidades aún
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
                        Ve a <strong>Leads</strong>, abre un lead y usa &quot;Convertir en Oportunidad&quot; para añadirlo a este pipeline.
                    </p>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {etapas.map(([etapaKey, etapaConf]) => {
                        const items = grouped[etapaKey] || [];
                        return (
                            <div
                                key={etapaKey}
                                className={`flex-shrink-0 w-72 border-t-2 ${etapaConf.color} rounded-xl bg-slate-100/50 dark:bg-slate-800/30`}
                            >
                                <div className="p-4 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {etapaConf.nombre}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-lg">
                                        {items.length}
                                    </span>
                                </div>
                                <div className="px-3 pb-3 space-y-2">
                                    {items.map((op) => (
                                        <div
                                            key={op.id}
                                            className="glass-card p-4 hover:border-brand-500/30"
                                        >
                                            <p className="text-sm font-semibold text-slate-700 dark:text-white">
                                                {op.lead.nombre}
                                            </p>
                                            <p className="text-xs text-slate-700 dark:text-slate-400 mt-1">
                                                {op.proyecto.nombre}
                                            </p>
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-sm font-bold text-brand-400">
                                                    {op.valorEstimado
                                                        ? `$${Number(op.valorEstimado).toLocaleString("es-AR")}`
                                                        : "—"}
                                                </span>
                                                <span className="text-xs text-slate-700 dark:text-slate-400">
                                                    {op.probabilidad}% prob.
                                                </span>
                                            </div>
                                            <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400"
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
