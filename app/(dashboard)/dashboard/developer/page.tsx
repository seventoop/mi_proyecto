import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, FileText, DollarSign, TrendingUp, AlertCircle, Clock } from "lucide-react";
import prisma from "@/lib/db";
import { KycDemoStatusCard } from "@/components/dashboard/kyc-demo-status-card";

export default async function DeveloperDashboard() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (userRole !== "VENDEDOR" && userRole !== "DESARROLLADOR") {
        redirect("/dashboard");
    }

    // Fetch developer's user info for KYC and Risk level using raw query
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, nombre: true, riskLevel: true, demoEndsAt: true, demoUsed: true }
    });

    // Fetch developer metrics (we'll assume they're respons for units or have a relation)
    const [totalUnits, availableUnits, reservedUnits, soldUnits] = await Promise.all([
        prisma.unidad.count({ where: { responsableId: userId } }),
        prisma.unidad.count({ where: { responsableId: userId, estado: "DISPONIBLE" } }),
        prisma.unidad.count({ where: { responsableId: userId, estado: "RESERVADA" } }),
        prisma.unidad.count({ where: { responsableId: userId, estado: "VENDIDA" } }),
    ]);

    const stats = [
        { label: "Total Unidades", value: totalUnits, icon: Building2, color: "text-slate-400", href: "/dashboard/developer/inventario" },
        { label: "Disponibles", value: availableUnits, icon: TrendingUp, color: "text-emerald-500", href: "/dashboard/developer/inventario?estado=DISPONIBLE" },
        { label: "Reservadas", value: reservedUnits, icon: AlertCircle, color: "text-amber-500", href: "/dashboard/developer/reservas" },
        { label: "Vendidas", value: soldUnits, icon: DollarSign, color: "text-brand-500", href: "/dashboard/developer/inventario?estado=VENDIDO" },
    ];

    // Fetch Enriched Developer Dashboard Data
    const dashboardRes = await getDeveloperDashboardData(userId);
    const dashboardData = dashboardRes.success && dashboardRes.data ? dashboardRes.data : {
        global: { totalRecaudado: 0, montoEnEscrow: 0, soldPercentage: 0, flujoProyectado: 0 },
        projectStats: [],
        nextMilestones: [],
    };
    const { global, projectStats, nextMilestones } = dashboardData;

    const orgId = (session?.user as any).orgId;
    const planRes = await getOrgPlanWithUsage(orgId);
    const planData = planRes.success ? planRes.data : null;

    const leadsPerc = planData ? (planData.usage.leads.current / planData.usage.leads.limit) * 100 : 0;
    const projectsPerc = planData ? (planData.usage.proyectos.current / planData.usage.proyectos.limit) * 100 : 0;
    const showUpgrade = leadsPerc >= 90 || projectsPerc >= 90;

    const isDemo = user?.demoEndsAt && new Date(user.demoEndsAt) > new Date();
    const demoEndsAtValue = user?.demoEndsAt;

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            <KycDemoStatusCard
                kycStatus={(user?.kycStatus as any) || "PENDIENTE"}
                demoEndsAt={user?.demoEndsAt || null}
                demoUsed={user?.demoUsed || false}
            />

            {showUpgrade && planData && (
                <div className="mb-8">
                    <UpgradePrompt
                        resource={leadsPerc >= 90 ? "leads" : "proyectos"}
                        percentage={Math.max(leadsPerc, projectsPerc)}
                    />
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
                        Terminal <span className="text-brand-500 underline decoration-4">Desarrollador</span>
                    </h1>
                    <div className="text-slate-900 dark:text-slate-400 mt-2 font-bold flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Sincronizado con Central de Operaciones
                        </div>
                        <RiskBadge level={user?.riskLevel || "medium"} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Operativo</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white tracking-widest">{userId.slice(0, 8)}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid & Financial Panel */}
            <div className="space-y-8">
                {/* Visual Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat) => (
                        <Link key={stat.label} href={stat.href} className="block group">
                            <div className="glass-card p-4 transition-all duration-200 group-hover:bg-white/5 group-hover:border-brand-500/30">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-white/5 ${stat.color} group-hover:bg-white/10 transition-colors`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                                                <p className="text-xs text-slate-900 dark:text-slate-400 font-bold group-hover:text-brand-400 transition-colors uppercase tracking-tight">{stat.label}</p>
                                            </div>
                                        </div>
                                        {planData && (stat.label === "Total Unidades" || stat.label === "Total Proyectos") && (
                                            <div className="mt-3">
                                                <UsageMeter
                                                    label="Cupo Plan"
                                                    resource={stat.label === "Total Unidades" ? "leads" : "proyectos"}
                                                    current={stat.value as number}
                                                    limit={stat.label === "Total Unidades" ? planData.usage.leads.limit : planData.usage.proyectos.limit}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Professional Financial Module */}
                <DeveloperFinancialPanel
                    global={global}
                    projectStats={projectStats}
                    kycStatus={user?.kycStatus || "PENDIENTE"}
                />
            </div>

            {/* Middle Section: Activity & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ActivityCenter
                        userRole="VENDEDOR"
                        activities={[
                            { id: "1", type: "LEAD", title: "Nuevo Lead", description: "Juan Perez interesado en Vista Mar.", date: new Date(), status: "success" },
                            { id: "2", type: "UNIT", title: "Unidad Reservada", description: "Unidad 305 reservada con éxito.", date: new Date(Date.now() - 3600000), status: "info" }
                        ]}
                    />
                </div>

                {/* Quick Actions Specialized */}
                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Terminal de Acceso</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <Link href="/dashboard/developer/proyectos" className="group glass-card p-4 hover:border-brand-500/40 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 group-hover:bg-brand-500 transition-colors group-hover:text-white">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Mis Proyectos</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">Gestión técnica y comercial</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>

                        <Link href="/dashboard/developer/leads" className="group glass-card p-4 hover:border-emerald-500/40 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500 transition-colors group-hover:text-white">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Conversiones</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">Monitor de leads calificados</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>

                        <Link href="/dashboard/developer/mi-perfil/kyc" className="group glass-card p-4 hover:border-amber-500/40 transition-all flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 group-hover:bg-amber-500 transition-colors group-hover:text-white">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Perfil KYC</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">Cumplimiento regulatorio</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">{user?.kycStatus}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

import ActivityCenter from "@/components/dashboard/activity-center";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getDeveloperDashboardData } from "@/lib/actions/developer-actions";
import DeveloperFinancialPanel from "@/components/dashboard/developer-financial-panel";
import { ChevronRight } from "lucide-react";
import { getOrgPlanWithUsage } from "@/lib/actions/plan-actions";
import UpgradePrompt from "@/components/saas/UpgradePrompt";
import UsageMeter from "@/components/saas/UsageMeter";

