import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield, AlertTriangle, CheckCircle2, Search, Filter, Info, ChevronRight } from "lucide-react";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getUsersRiskData } from "@/lib/actions/admin-actions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function AdminRisksPage({
    searchParams
}: {
    searchParams: { level?: string }
}) {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

    const res = await getUsersRiskData({ level: searchParams.level });

    // Type-safe data extraction
    const users = res.success ? res.data.users : [];
    const stats = res.success ? res.data.stats : { low: 0, medium: 0, high: 0 };

    if (!res.success) {
        return <div className="p-8 text-rose-500 font-bold">Error al cargar datos de riesgo: {"error" in res ? res.error : "Error desconocido"}</div>;
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminRiesgos} />
                </div>
            </div>

            {/* Risk Distribution Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/admin/riesgos?level=low" className={cn(
                    "bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5 border-l-4 border-l-emerald-500 hover:border-r-white/[0.12] hover:border-y-white/[0.12] hover:bg-white/[0.02] transition-all text-left shadow-sm",
                    searchParams.level === "low" && "bg-white/[0.02] border-r-white/[0.12] border-y-white/[0.12]"
                )}>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Riesgo Bajo</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.low}</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Perfiles validados sin alertas</p>
                </Link>

                <Link href="/dashboard/admin/riesgos?level=medium" className={cn(
                    "bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5 border-l-4 border-l-amber-500 hover:border-r-white/[0.12] hover:border-y-white/[0.12] hover:bg-white/[0.02] transition-all text-left shadow-sm",
                    searchParams.level === "medium" && "bg-white/[0.02] border-r-white/[0.12] border-y-white/[0.12]"
                )}>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Riesgo Medio</p>
                        <Info className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.medium}</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Documentación incompleta / pendiente</p>
                </Link>

                <Link href="/dashboard/admin/riesgos?level=high" className={cn(
                    "bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5 border-l-4 border-l-rose-500 hover:border-r-white/[0.12] hover:border-y-white/[0.12] hover:bg-white/[0.02] transition-all text-left shadow-sm",
                    searchParams.level === "high" && "bg-white/[0.02] border-r-white/[0.12] border-y-white/[0.12]"
                )}>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Riesgo Alto</p>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.high}</p>
                    <p className="text-[9px] text-rose-500 font-black mt-1">Inconsistencias críticas detectadas</p>
                </Link>
            </div>

            {/* Users List */}
            <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <h2 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-500" />
                            Listado de Perfiles Analizados
                        </h2>
                        {searchParams.level && (
                            <Link href="/dashboard/admin/riesgos" className="text-[9px] font-black text-brand-500 uppercase hover:underline">
                                Limpiar filtro
                            </Link>
                        )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {users.length} usuarios encontrados
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] uppercase text-slate-500 font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Estado KYC</th>
                                <th className="px-6 py-4">Nivel de Riesgo</th>
                                <th className="px-6 py-4">Motivo / Alerta</th>
                                <th className="px-6 py-4 text-right">Registrado</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {users.map((user: any) => (
                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.nombre}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black text-slate-500 border border-white/[0.06] px-2.5 py-1 rounded-md uppercase tracking-widest">
                                            {user.rol}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest",
                                            user.kycStatus === "VERIFICADO" ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"
                                        )}>
                                            {user.kycStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <RiskBadge level={user.riskLevel} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium max-w-xs truncate uppercase tracking-widest">
                                            {user.riskReason || "Sin reportes adicionales"}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <p className="text-[10px] text-slate-900 dark:text-slate-500 font-black tracking-widest uppercase">
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: es })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link href={`/dashboard/admin/kyc/${user.id}`} className="p-2 border border-white/[0.06] hover:bg-white/[0.06] rounded-xl flex items-center justify-center transition-colors">
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
