import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, FileCheck, Users, TrendingUp, Shield, DollarSign } from "lucide-react";
import prisma from "@/lib/db";

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "ADMIN") {
        redirect("/dashboard");
    }

    // Fetch admin metrics
    const [totalProjects, pendingKYC, pendingDocs, pendingPayments, totalUsers] = await Promise.all([
        prisma.proyecto.count(),
        prisma.user.count({ where: { kycStatus: "PENDIENTE" } }),
        prisma.proyecto.count({ where: { documentacionEstado: "PENDIENTE" } }),
        prisma.pago.count({ where: { estado: "PENDIENTE" } }),
        prisma.user.count(),
    ]);

    // Unified stats for global oversight
    const statsCards = [
        { label: "Proyectos Totales", value: totalProjects, icon: Building2, color: "text-brand-500" },
        { label: "KYC Pendientes", value: pendingKYC, icon: Shield, color: "text-amber-500" },
        { label: "Docs Pendientes", value: pendingDocs, icon: FileCheck, color: "text-rose-500" },
        { label: "Pagos Pendientes", value: pendingPayments, icon: DollarSign, color: "text-emerald-500" },
        { label: "Usuarios", value: totalUsers, icon: Users, color: "text-brand-400" },
    ];

    // Fetch Enriched Admin Dashboard Data
    const { financials, queues, recentUsers } = await getAdminDashboardData();

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header / Central Control */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
                        Control <span className="text-brand-500 underline decoration-4">Central de Plataforma</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-slate-900 dark:text-slate-400 font-bold flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Monitoreo Global de Activos y Usuarios
                        </p>
                        <RiskBadge level="low" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-white/5 flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel de Acceso</span>
                        <span className="text-xs font-black text-brand-500 tracking-widest">TIER-1 ADMIN</span>
                    </div>
                </div>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {statsCards.map((stat) => (
                    <div key={stat.label} className="glass-card p-4 hover:border-brand-500/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-lg bg-white/5 transition-colors group-hover:bg-brand-500/10",
                                stat.color
                            )}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">{stat.value}</p>
                                <p className="text-[10px] text-slate-900 dark:text-slate-400 font-extrabold uppercase tracking-tight">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Management Module (Financials & Queues) */}
            <AdminManagementPanel
                financials={financials}
                queues={queues as any}
                recentUsers={recentUsers}
            />

            {/* Activity Center */}
            <ActivityCenter
                userRole="ADMIN"
                activities={[
                    { id: "1", type: "USER", title: "Nuevo inversor", description: "Registro completado por Carlos Gomez.", date: new Date(), status: "info" },
                    { id: "2", type: "KYC", title: "KYC Pendiente", description: "Revisar documentos de 'Inversiones SR'.", date: new Date(Date.now() - 3600000), status: "warning" },
                    { id: "3", type: "PAYMENT", title: "Pago Recibido", description: "Confirmado reserva unidad 201.", date: new Date(Date.now() - 7200000), status: "success" }
                ]}
            />

            {/* Administrative Terminals */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Terminales Administrativas</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">V 2.0.4</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <Link href="/dashboard/admin/kyc" className="group p-5 bg-white/5 rounded-2xl hover:bg-amber-500/10 transition-all border border-white/5 hover:border-amber-500/30">
                        <Shield className="w-8 h-8 text-amber-500 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-widest">Gestión KYC</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-2 lowercase italic">{pendingKYC} validaciones pendientes</p>
                    </Link>

                    <Link href="/dashboard/admin/proyectos" className="group p-5 bg-white/5 rounded-2xl hover:bg-rose-500/10 transition-all border border-white/5 hover:border-rose-500/30">
                        <FileCheck className="w-8 h-8 text-rose-500 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-widest">Técnica Proyectos</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-2 lowercase italic">{pendingDocs} revisiones críticas</p>
                    </Link>

                    <Link href="/dashboard/admin/banners" className="group p-5 bg-white/5 rounded-2xl hover:bg-emerald-500/10 transition-all border border-white/5 hover:border-emerald-500/30">
                        <TrendingUp className="w-8 h-8 text-emerald-500 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-widest">Comunicación</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-2 lowercase italic">gestión de banners y mkt</p>
                    </Link>

                    <Link href="/dashboard/admin/testimonios" className="group p-5 bg-white/5 rounded-2xl hover:bg-brand-500/10 transition-all border border-white/5 hover:border-brand-500/30">
                        <Users className="w-8 h-8 text-brand-400 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-widest">Comunidad</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-2 lowercase italic">moderación y testimonios</p>
                    </Link>

                    <Link href="/dashboard/admin/riesgos" className="group p-5 bg-white/10 rounded-2xl hover:bg-rose-500/10 transition-all border border-rose-500/30 hover:border-rose-500/50">
                        <AlertTriangle className="w-8 h-8 text-rose-500 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                        <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-widest">Gestión de Riesgos</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-2 lowercase italic">perfiles y cumplimiento</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}

import ActivityCenter from "@/components/dashboard/activity-center";
import { getAdminDashboardData } from "@/lib/actions/admin-actions";
import AdminManagementPanel from "@/components/dashboard/admin/admin-management-panel";
import { cn } from "@/lib/utils";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { AlertTriangle } from "lucide-react";

