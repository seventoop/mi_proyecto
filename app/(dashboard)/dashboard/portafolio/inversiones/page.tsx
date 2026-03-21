import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInversorDashboardData } from "@/lib/actions/investor-actions";
import prisma from "@/lib/db";
import Link from "next/link";
import { TrendingUp, ChevronRight, DollarSign, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function PortafolioInversionesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const role = (session.user as any).role as string;
    const userId = session.user.id as string;

    // This page is INVERSOR-only
    if (!["INVERSOR", "ADMIN", "SUPERADMIN"].includes(role)) redirect("/dashboard/portafolio");

    const data = await getInversorDashboardData(userId) as any;
    const { inversiones = [], stats = {} } = data?.data ?? data ?? {};

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.investorInversiones} />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "M² Total", value: `${(stats.totalM2 || 0).toLocaleString()} m²` },
                    { label: "Invertido", value: formatCurrency(stats.totalInvertido || 0) },
                    { label: "Valor Actual", value: formatCurrency(stats.valorActual || 0) },
                    { label: "ROI Promedio", value: `${(stats.roiPromedio || 0).toFixed(1)}%` },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5">
                        <p className="text-2xl font-semibold text-brand-500 truncate">{value}</p>
                        <p className="text-sm text-slate-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {inversiones.length === 0 ? (
                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-16 text-center border-dashed">
                    <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">Sin inversiones activas</h3>
                    <p className="text-slate-500 mb-4">Explorá las oportunidades disponibles en el marketplace.</p>
                    <Link href="/dashboard/portafolio/marketplace" className="inline-flex px-6 py-3 rounded-xl gradient-brand text-white font-bold text-sm">
                        Ver Marketplace
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {inversiones.map((inv: any) => (
                        <div key={inv.id} className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors ease-[cubic-bezier(0.16,1,0.3,1)] duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-brand-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{inv.proyecto?.nombre ?? "Proyecto"}</h3>
                                    <p className="text-xs text-slate-500">{inv.m2} m² · {new Date(inv.createdAt).toLocaleDateString("es-ES")}</p>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(Number(inv.monto))}</p>
                                <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    inv.estado === "ACTIVA" ? "bg-emerald-500/10 text-emerald-500" :
                                        inv.estado === "COMPLETADA" ? "bg-blue-500/10 text-blue-500" :
                                            "bg-slate-500/10 text-slate-500"
                                )}>{inv.estado}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
