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
        { label: "Leads Hoy", value: counts.leadsToday, icon: TrendingUp, color: "text-emerald-500" },
        { label: "Leads Semana", value: counts.leadsWeek, icon: TrendingUp, color: "text-emerald-600" },
        { label: "KYC Pendientes", value: counts.pendingKYC, icon: Shield, color: "text-amber-500" },
        { label: "Blogs Pendientes", value: counts.pendingBlogs, icon: MessageSquare, color: "text-purple-500" },
        { label: "Banners Activos", value: counts.activeBanners, icon: Activity, color: "text-blue-500" },
    ];

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header / Central Control */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
                        Matriz <span className="text-brand-500 underline decoration-4">Admin Fundacional</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 mt-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Monitoreo Global de Activos y Usuarios
                    </p>
                </div>

                {/* Health Indicators */}
                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                    <HealthBadge label="DB" status={health.db} icon={Database} />
                    <HealthBadge label="Storage" status={health.storage} icon={Cloud} />
                    <HealthBadge label="Pusher" status={health.pusher} icon={Activity} />
                    <HealthBadge label="WhatsApp" status={health.whatsapp} icon={MessageSquare} />
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {statsCards.map((stat) => (
                    <div key={stat.label} className="glass-card p-4 hover:border-brand-500/30 transition-all group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-tight">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Management Module (Financials & Queues) */}
            <AdminManagementPanel
                financials={financials}
                queues={queues as any}
                recentUsers={recentUsers}
            />

            {/* Audit Logs & Terminal Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Audit Logs - Table Section */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Registro de Auditoría</h2>
                        <span className="text-[10px] font-black bg-brand-500/10 text-brand-500 px-2 py-1 rounded">ÚLTIMOS 20 EVENTOS</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] uppercase font-black text-slate-400">
                                <tr>
                                    <th className="px-3 py-2">Usuario</th>
                                    <th className="px-3 py-2">Acción</th>
                                    <th className="px-3 py-2">Entidad</th>
                                    <th className="px-3 py-2">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-white/5 text-xs hover:bg-white/5 transition-colors">
                                        <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{log.user?.nombre || "System"}</td>
                                        <td className="px-3 py-2">
                                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] font-bold">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 font-mono">{log.entity}</td>
                                        <td className="px-3 py-2 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {auditLogs.length === 0 && (
                                    <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500 italic">No hay registros recientes</td></tr>
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
            <span className="text-[10px] font-black text-slate-400 uppercase">{label}</span>
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
            "group flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 transition-all w-full",
            colorClasses[color]
        )}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase">{label}</h3>
                <p className="text-[10px] text-slate-500">{subText}</p>
            </div>
        </Link>
    );
}
