import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, FileText, DollarSign, TrendingUp, AlertCircle, Clock, CheckCircle, ChevronRight } from "lucide-react";
import prisma from "@/lib/db";
import { KycDemoStatusCard } from "@/components/dashboard/kyc-demo-status-card";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import SellerDashboardView from "@/components/dashboard/developer/seller-dashboard-view";
import ActivityCenter from "@/components/dashboard/activity-center";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getDeveloperDashboardData } from "@/lib/actions/developer-actions";
import DeveloperFinancialPanel from "@/components/dashboard/developer-financial-panel";
import { getOrgPlanWithUsage } from "@/lib/actions/plan-actions";
import UpgradePrompt from "@/components/saas/UpgradePrompt";
import UsageMeter from "@/components/saas/UsageMeter";

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

    const orgId = (session?.user as any).orgId;

    // Round 1: all independent — user info, dashboard metrics, plan, and activity-scoping
    // queries share no dependencies and run concurrently.
    const [user, dashboardRes, planRes, userRelaciones, legacyActivityProjects] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true, nombre: true, riskLevel: true, demoEndsAt: true, demoUsed: true, developerVerified: true }
        }),
        getDeveloperDashboardData(userId),
        getOrgPlanWithUsage(orgId),
        prisma.proyectoUsuario.findMany({
            where: { userId, estadoRelacion: "ACTIVA" },
            select: { proyectoId: true },
        }),
        prisma.proyecto.findMany({
            where: {
                creadoPorId: userId,
                deletedAt: null,
                NOT: { usuariosRelaciones: { some: { userId } } },
            },
            select: { id: true },
        }),
    ]);

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

    const stats = [
        { label: "Leads este mes", value: global.leadsThisMonth, icon: TrendingUp, color: "text-emerald-500", href: "/dashboard/developer/leads" },
        { label: "Reservas activas", value: global.reservasActivas, icon: AlertCircle, color: "text-amber-500", href: "/dashboard/developer/reservas" },
        { label: "Conversión", value: `${global.conversionRate}%`, icon: FileText, color: "text-violet-500", href: "/dashboard/crm/metricas" },
        { label: "Ingreso mes", value: `$${global.revenueThisMonth.toLocaleString()}`, icon: DollarSign, color: "text-brand-500", href: "/dashboard/developer/reservas" },
    ];

    // Round 2: historialUnidad needs allActivityProjectIds from round 1
    const allActivityProjectIds = [
        ...userRelaciones.map(r => r.proyectoId),
        ...legacyActivityProjects.map(p => p.id),
    ].filter((id, i, arr) => arr.indexOf(id) === i);

    const recentHistorial = await prisma.historialUnidad.findMany({
        where: allActivityProjectIds.length > 0
            ? { unidad: { manzana: { etapa: { proyectoId: { in: allActivityProjectIds } } } } }
            : { id: "___NONE___" },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { unidad: { select: { numero: true } } }
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

    // --- SELLER SPECIFIC DATA ---
    let sellerData = null;
    if (userRole === "VENDEDOR") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const [urgentLeads, todaysTasks, closingOpps] = await Promise.all([
            prisma.lead.findMany({
                where: { asignadoAId: userId, ultimoContacto: null },
                orderBy: { createdAt: "desc" },
                take: 5
            }),
            prisma.tarea.findMany({
                where: { usuarioId: userId, fechaVencimiento: { gte: startOfToday, lte: endOfToday } },
                orderBy: { prioridad: "desc" },
                take: 5
            }),
            prisma.oportunidad.findMany({
                where: { lead: { asignadoAId: userId }, etapa: { in: ["NEGOCIACION", "CIERRE"] } },
                include: { lead: { select: { nombre: true } }, proyecto: { select: { nombre: true } } },
                orderBy: { updatedAt: "desc" },
                take: 3
            })
        ]);
        sellerData = { urgentLeads, todaysTasks, closingOpps };
    }

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.developerMain} />
            
            {userRole === "VENDEDOR" && sellerData ? (
                <SellerDashboardView 
                    user={user}
                    stats={stats}
                    sellerData={sellerData}
                    activities={activities}
                    global={global}
                />
            ) : (
                <>
                    <KycDemoStatusCard
                        kycStatus={(user?.kycStatus as any) || "PENDIENTE"}
                        demoEndsAt={user?.demoEndsAt || null}
                        demoUsed={user?.demoUsed || false}
                    />

                    {showUpgrade && planData && (
                        <UpgradePrompt
                            resource={leadsPerc >= 90 ? "leads" : "proyectos"}
                            percentage={Math.max(leadsPerc, projectsPerc)}
                        />
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">Dashboard</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-white/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sincronizado
                                </span>
                                <RiskBadge level={user?.riskLevel || "medium"} />
                                {user?.developerVerified && (
                                    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold border border-emerald-500/20">
                                        <CheckCircle className="w-3 h-3" /> Verificado
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/[0.04] rounded-lg border border-slate-200 dark:border-white/[0.06] shadow-sm tracking-widest font-mono">
                            <span className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">ID</span>
                            <span className="text-[12px] font-black text-slate-900 dark:text-white/80">{userId?.slice(0, 8) ?? "—"}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat) => (
                            <Link key={stat.label} href={stat.href} className="block group">
                                <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.05]">
                                    <div className="flex items-start justify-between mb-3">
                                        <p className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{stat.label}</p>
                                        <div className={`p-1.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] ${stat.color}`}>
                                            <stat.icon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                    <p className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter leading-none">{stat.value}</p>
                                    {planData && stat.label === "Leads este mes" && (
                                        <div className="mt-3">
                                            <UsageMeter label="Cupo Plan" resource="leads" current={planData.usage.leads.current} limit={planData.usage.leads.limit} />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    <DeveloperFinancialPanel global={global} projectStats={projectStats} kycStatus={user?.kycStatus || "PENDIENTE"} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <ActivityCenter userRole="DESARROLLADOR" activities={activities} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1 mb-3">Acceso Rápido</p>
                            <QuickLink href="/dashboard/developer/proyectos" icon={Building2} color="bg-brand-500" title="Mis Proyectos" sub="Gestión técnica y comercial" />
                            <QuickLink href="/dashboard/developer/leads" icon={TrendingUp} color="bg-emerald-500" title="Leads" sub="Monitor de contactos calificados" />
                            <QuickLink href="/dashboard/developer/reservas" icon={FileText} color="bg-amber-500" title="Reservas" sub="Control de unidades reservadas" />
                            <QuickLink href="/dashboard/developer/mi-perfil/kyc" icon={AlertCircle} color="bg-violet-500" title="KYC" sub={`Estado: ${user?.kycStatus || "PENDIENTE"}`} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function QuickLink({ href, icon: Icon, color, title, sub }: any) {
    return (
        <Link href={href} className="group flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all">
            <div className={`p-2 rounded-lg ${color}/10 text-${color.replace('bg-', '')} group-hover:${color} group-hover:text-white transition-all`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 leading-none mb-0.5">{title}</p>
                <p className="text-[11px] text-slate-500 dark:text-white/40 font-medium">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </Link>
    );
}

