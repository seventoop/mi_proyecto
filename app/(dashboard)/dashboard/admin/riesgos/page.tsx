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

export default async function AdminRisksPage({
    searchParams
}: {
    searchParams: { level?: string }
}) {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

    const { users, stats } = await getUsersRiskData({ level: searchParams.level });

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                    Control de <span className="text-rose-500 underline decoration-4">Riesgos de Usuarios</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-bold lowercase italic">
                    monitoreo proactivo de integridad de perfiles y documentación.
                </p>
            </div>

            {/* Risk Distribution Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/admin/riesgos?level=low" className={cn(
                    "glass-card p-5 border-l-4 border-emerald-500 hover:bg-emerald-500/5 transition-all text-left",
                    searchParams.level === "low" && "bg-emerald-500/5 border-emerald-500/50"
                )}>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Riesgo Bajo</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.low}</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Perfiles validados sin alertas</p>
                </Link>

                <Link href="/dashboard/admin/riesgos?level=medium" className={cn(
                    "glass-card p-5 border-l-4 border-amber-500 hover:bg-amber-500/5 transition-all text-left",
                    searchParams.level === "medium" && "bg-amber-500/5 border-amber-500/50"
                )}>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Riesgo Medio</p>
                        <Info className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{stats.medium}</p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1">Documentación incompleta / pendiente</p>
                </Link>

                <Link href="/dashboard/admin/riesgos?level=high" className={cn(
                    "glass-card p-5 border-l-4 border-rose-500 hover:bg-rose-500/5 transition-all text-left",
                    searchParams.level === "high" && "bg-rose-500/5 border-rose-500/50"
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
            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-500" />
                            Listado de Perfiles Analizados
                        </h2>
                        {searchParams.level && (
                            <Link href="/dashboard/admin/riesgos" className="text-[9px] font-black text-brand-500 uppercase hover:underline">
                                Limpiar filtro
                            </Link>
                        )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold italic">
                        {users.length} usuarios encontrados
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Rol</th>
                                <th className="px-6 py-4">Estado KYC</th>
                                <th className="px-6 py-4">Nivel de Riesgo</th>
                                <th className="px-6 py-4">Motivo / Alerta</th>
                                <th className="px-6 py-4 text-right">Registrado</th>
                                <th className="px-6 py-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.nombre}</span>
                                            <span className="text-[10px] text-slate-500 font-bold italic">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black text-slate-500 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                            {user.rol}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                            user.kycStatus === "VERIFICADO" ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"
                                        )}>
                                            {user.kycStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <RiskBadge level={user.riskLevel} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold italic max-w-xs truncate">
                                            {user.riskReason || "Sin reportes adicionales"}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <p className="text-[10px] text-slate-900 dark:text-slate-400 font-bold">
                                            {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: es })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Link href={`/dashboard/admin/kyc/${user.id}`} className="p-1.5 hover:bg-white/10 rounded-lg inline-block transition-colors">
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400" />
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
