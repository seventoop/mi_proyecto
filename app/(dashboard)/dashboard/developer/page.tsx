import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, FileText, DollarSign, TrendingUp, AlertCircle, Clock, CheckCircle } from "lucide-react";
import prisma from "@/lib/db";
import { KycDemoStatusCard } from "@/components/dashboard/kyc-demo-status-card";

export const dynamic = "force-dynamic";

export default async function DeveloperDashboard() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id as string | undefined;

    if (!session || (userRole !== "VENDEDOR" && userRole !== "DESARROLLADOR")) {
        redirect("/login");
    }

    if (!userId) {
        redirect("/login");
    }

    // Fetch developer's user info for KYC and Risk level using raw query
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, nombre: true, riskLevel: true, demoEndsAt: true, demoUsed: true, developerVerified: true }
    });

    // Fetch Enriched Developer Dashboard Data (contains all real metrics)
    const dashboardRes = await getDeveloperDashboardData(userId);
    const dashboardData = dashboardRes.success && dashboardRes.data ? dashboardRes.data : {
        global: {
            totalRecaudado: 0, montoEnEscrow: 0, soldPercentage: 0, flujoProyectado: 0,
            leadsThisMonth: 0, conversionRate: 0, reservasActivas: 0, revenueThisMonth: 0,
        },
        projectStats: [],
        topProjects: [],
        nextMilestones: [],
    };
    const { global, projectStats, topProjects, nextMilestones } = dashboardData;

    // Real stats grid using data from the action
    const stats = [
        { label: "Leads este mes", value: global.leadsThisMonth, icon: TrendingUp, color: "text-emerald-500", href: "/dashboard/developer/leads" },
        { label: "Reservas activas", value: global.reservasActivas, icon: AlertCircle, color: "text-amber-500", href: "/dashboard/developer/reservas" },
        { label: "Conversión", value: `${global.conversionRate}%`, icon: FileText, color: "text-violet-500", href: "/dashboard/crm/metricas" },
        { label: "Ingreso mes", value: `$${global.revenueThisMonth.toLocaleString()}`, icon: DollarSign, color: "text-brand-500", href: "/dashboard/developer/reservas" },
    ];

    const orgId = (session?.user as any).orgId;
    const planRes = await getOrgPlanWithUsage(orgId);

    // Real activity feed from unit history
    const recentHistorial = await prisma.historialUnidad.findMany({
        where: {
            unidad: {
                manzana: { etapa: { proyecto: { creadoPorId: userId } } }
            }
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
            unidad: { select: { numero: true } }
        }
    });
    const activities = recentHistorial.map(h => ({
        id: h.id,
        type: "UNIT" as const,
        title: h.estadoNuevo === "VENDIDA" ? "Unidad Vendida" :
               h.estadoNuevo === "RESERVADA" ? "Unidad Reservada" :
               h.estadoNuevo === "DISPONIBLE" ? "Unidad Liberada" : "Cambio de Estado",
        description: h.motivo || `Unidad ${h.unidad.numero}: ${h.estadoAnterior} → ${h.estadoNuevo}`,
        date: h.createdAt,
        status: (h.estadoNuevo === "VENDIDA" ? "success" :
                 h.estadoNuevo === "RESERVADA" ? "info" : "warning") as "success" | "info" | "warning" | "error"
    }));
    const planData = planRes.success ? planRes.data : null;

    const leadsPerc = planData ? (planData.usage.leads.current / planData.usage.leads.limit) * 100 : 0;
    const projectsPerc = planData ? (planData.usage.proyectos.current / planData.usage.proyectos.limit) * 100 : 0;
    const showUpgrade = leadsPerc >= 90 || projectsPerc >= 90;

    const isDemo = user?.demoEndsAt && new Date(user.demoEndsAt) > new Date();
    const demoEndsAtValue = user?.demoEndsAt;

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* KYC / Demo Status Banner */}
            <KycDemoStatusCard
                kycStatus={(user?.kycStatus as any) || "PENDIENTE"}
                demoEndsAt={user?.demoEndsAt || null}
                demoUsed={user?.demoUsed || false}
            />

            {/* Upgrade Banner (usage limit alert) */}
            {showUpgrade && planData && (
                <UpgradePrompt
                    resource={leadsPerc >= 90 ? "leads" : "proyectos"}
                    percentage={Math.max(leadsPerc, projectsPerc)}
                />
            )}

            {/* Hero Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                        Dashboard
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-white/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Sincronizado
                        </span>
                        <RiskBadge level={user?.riskLevel || "medium"} />
                        {user?.developerVerified && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3" />
                                Verificado
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/[0.06] shadow-sm dark:shadow-none">
                    <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">ID</span>
                    <span className="text-[12px] font-black text-slate-900 dark:text-white/80 tracking-widest font-mono">{userId?.slice(0, 8) ?? "—"}</span>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href} className="block group">
                        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] hover:shadow-md dark:hover:shadow-none">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{stat.label}</p>
                                <div className={`p-1.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] ${stat.color}`}>
                                    <stat.icon className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <p className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter leading-none">
                                {stat.value}
                            </p>
                            {planData && stat.label === "Leads este mes" && (
                                <div className="mt-3">
                                    <UsageMeter
                                        label="Cupo Plan"
                                        resource="leads"
                                        current={planData.usage.leads.current}
                                        limit={planData.usage.leads.limit}
                                    />
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Financial Panel */}
            <DeveloperFinancialPanel
                global={global}
                projectStats={projectStats}
                kycStatus={user?.kycStatus || "PENDIENTE"}
            />

            {/* Bottom Row: Activity Feed + Quick Access */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <ActivityCenter
                        userRole="VENDEDOR"
                        activities={activities}
                    />
                </div>

                {/* Quick Access Panel */}
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1 mb-3">Acceso Rápido</p>
                    <Link href="/dashboard/developer/proyectos" className="group flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all duration-200">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-none mb-0.5">Mis Proyectos</p>
                            <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Gestión técnica y comercial</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
                    </Link>

                    <Link href="/dashboard/developer/leads" className="group flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-none mb-0.5">Leads</p>
                            <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Monitor de contactos calificados</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </Link>

                    <Link href="/dashboard/developer/reservas" className="group flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-none mb-0.5">Reservas</p>
                            <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Control de unidades reservadas</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </Link>

                    <Link href="/dashboard/developer/mi-perfil/kyc" className="group flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.1] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all duration-200">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-none mb-0.5">KYC</p>
                            <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">Estado: <span className="font-bold text-amber-500">{user?.kycStatus || "PENDIENTE"}</span></p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    </Link>
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

