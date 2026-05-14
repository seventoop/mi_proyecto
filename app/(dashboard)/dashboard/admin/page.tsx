import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Building2, Users, TrendingUp, Shield, CreditCard,
    Settings, Activity, Database, Cloud, MessageSquare
} from "lucide-react";
import { getAdminDashboardData, getHealthStatus } from "@/lib/actions/admin-actions";
import AdminManagementPanel from "@/components/dashboard/admin/admin-management-panel";
import { cn } from "@/lib/utils";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
import RoleCapabilitiesCard from "@/components/dashboard/role-capabilities-card";

interface DashboardData {
    financials: {
        globalVolume: number;
        totalEscrow: number;
        platformRevenue: number;
        totalInvested: number;
    };
    queues: {
        kyc: any[];
        projects: any[];
    };
    recentUsers: any[];
    counts: {
        totalOrgs: number;
        leadsToday: number;
        leadsWeek: number;
        pendingTestimonios: number;
        activeBanners: number;
        pendingBlogs: number;
        pendingKYC: number;
        reservasActivas: number;
        conversionRate: number;
        proyectosActivos: number;
    };
    auditLogs: any[];
}

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
        redirect("/dashboard");
    }

    // Fetch dashboard data + real health status in parallel
    const [adminRes, health] = await Promise.all([
        getAdminDashboardData(),
        getHealthStatus(),
    ]);
    if (!adminRes.success || !("data" in adminRes)) {
        const errorMsg = ("error" in adminRes) ? adminRes.error : "Failed to load data";
        return <div className="p-8 text-rose-500 font-bold">Error: {errorMsg}</div>;
    }
    const { financials, queues, recentUsers, counts, auditLogs } = adminRes.data as DashboardData;

    const statsCards = [
        { label: "Organizaciones", value: counts.totalOrgs, icon: Building2, color: "text-brand-500" },
        { label: "Proyectos Activos", value: counts.proyectosActivos, icon: Activity, color: "text-blue-500" },
        { label: "Leads Hoy", value: counts.leadsToday, icon: TrendingUp, color: "text-emerald-500" },
        { label: "Reservas Activas", value: counts.reservasActivas, icon: Shield, color: "text-amber-500" },
        { label: "Conversión", value: `${counts.conversionRate}%`, icon: TrendingUp, color: "text-purple-500" },
        { label: "KYC Pendientes", value: counts.pendingKYC, icon: Shield, color: "text-rose-500" },
    ];

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header / Central Control */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <ModuleHelp content={MODULE_HELP_CONTENT.adminGlobal} />

                {/* Health Indicators */}
                <div className="flex items-center gap-3 bg-white dark:bg-[#0A0A0C] p-2 rounded-2xl border border-slate-200 dark:border-white/[0.06]">
                    <HealthBadge label="DB" status={health.db} icon={Database} />
                    <HealthBadge label="Storage" status={health.storage} icon={Cloud} />
                    <HealthBadge label="Pusher" status={health.pusher} icon={Activity} />
                    <HealthBadge label="WhatsApp" status={health.whatsapp} icon={MessageSquare} />
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {statsCards.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] p-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.02] hover:dark:border-white/[0.12] transition-colors group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-lg bg-slate-50 dark:bg-white/[0.04]", stat.color)}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        </div>
                        <p className="text-xs text-slate-500 font-extrabold uppercase tracking-tight">{stat.label}</p>
                    </div>
                ))}
            </div>

            <RoleCapabilitiesCard role={userRole} />

            {/* Management Module (Financials & Queues) */}
            <AdminManagementPanel
                financials={financials}
                queues={queues as any}
                recentUsers={recentUsers}
            />

            {/* Audit Logs & Terminal Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Audit Logs - Table Section */}
                <div className="lg:col-span-2 bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Registro de Auditoría</h2>
                        <span className="text-xs font-black bg-brand-500/10 text-brand-500 px-2 py-1 rounded">ÚLTIMOS 20 EVENTOS</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-white/[0.02] text-xs uppercase font-black text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-3 py-3 border-b border-slate-100 dark:border-white/[0.06]">Usuario</th>
                                    <th className="px-3 py-3 border-b border-slate-100 dark:border-white/[0.06]">Acción</th>
                                    <th className="px-3 py-3 border-b border-slate-100 dark:border-white/[0.06]">Entidad</th>
                                    <th className="px-3 py-3 border-b border-slate-100 dark:border-white/[0.06]">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-slate-100 dark:border-white/[0.04] text-sm hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-3 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{log.user?.nombre || "System"}</td>
                                        <td className="px-3 py-3">
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.06] text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-slate-500 font-bold uppercase tracking-widest text-xs">{log.entity}</td>
                                        <td className="px-3 py-3 text-slate-500 font-bold uppercase tracking-widest text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {auditLogs.length === 0 && (
                                    <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">No hay registros recientes</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Access Terminals */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Terminales</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <TerminalLink
                            href="/dashboard/admin/crm/leads"
                            label="CRM Leads"
                            subText={`${counts.leadsWeek} esta semana`}
                            icon={Users}
                            color="brand"
                        />
                        <TerminalLink
                            href="/dashboard/admin/blog"
                            label="Moderación Blog"
                            subText={`${counts.pendingBlogs} pendientes`}
                            icon={MessageSquare}
                            color="purple"
                        />
                        <TerminalLink
                            href="/dashboard/admin/planes"
                            label="Gestión SaaS"
                            subText={`${counts.totalOrgs} organizaciones`}
                            icon={CreditCard}
                            color="emerald"
                        />
                        <TerminalLink
                            href="/dashboard/admin/configuracion"
                            label="System Matrix"
                            subText="Configuración global"
                            icon={Settings}
                            color="slate"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function HealthBadge({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
    const isHealthy = status === "HEALTHY" || status === "UP" || status === "OK";
    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg">
            <Icon className={cn("w-3 h-3", isHealthy ? "text-emerald-500" : "text-rose-500")} />
            <span className="text-xs font-black text-slate-400 uppercase">{label}</span>
            <div className={cn("w-1.5 h-1.5 rounded-full", isHealthy ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500")} />
        </div>
    );
}

function TerminalLink({ href, label, subText, icon: Icon, color }: { href: string, label: string, subText: string, icon: any, color: string }) {
    const colorClasses: any = {
        brand: "hover:bg-brand-500/10 hover:border-brand-500/30 text-brand-500",
        emerald: "hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-500",
        purple: "hover:bg-purple-500/10 hover:border-purple-500/30 text-purple-500",
        slate: "hover:bg-slate-500/10 hover:border-slate-500/30 text-slate-500",
    };

    return (
        <Link href={href} className={cn(
            "group flex items-center gap-3 p-4 bg-white dark:bg-[#0A0A0C] rounded-2xl border border-slate-200 dark:border-white/[0.06] transition-colors w-full",
            colorClasses[color]
        )}>
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center">
                <Icon className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="text-left">
                <h3 className="font-black text-[12px] uppercase tracking-tighter text-slate-900 dark:text-white transition-colors">{label}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{subText}</p>
            </div>
        </Link>
    );
}
