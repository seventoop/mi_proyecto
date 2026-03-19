"use client";

import {
    Activity,
    ShieldAlert,
    FileSignature,
    TrendingUp,
    Globe,
    CreditCard,
    Clock,
    CheckCircle2,
    ChevronRight,
    Users,
    Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AdminManagementPanelProps {
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
}

export default function AdminManagementPanel({ financials, queues, recentUsers }: AdminManagementPanelProps) {
    return (
        <div className="space-y-6">
            {/* Global Control KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0A0A0C] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volumen Global</p>
                        <Globe className="w-4 h-4 text-brand-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        ${financials.globalVolume.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Transaccionado en plataforma</p>
                </div>

                <div className="bg-white dark:bg-[#0A0A0C] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recaudación Fee</p>
                        <CreditCard className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        ${financials.platformRevenue.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-emerald-500 font-black mt-1 uppercase tracking-widest">Ingresos operativos netos</p>
                </div>

                <div className="bg-white dark:bg-[#0A0A0C] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monto en Escrow</p>
                        <ShieldAlert className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                        ${financials.totalEscrow.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Capital bajo custodia</p>
                </div>

                <div className="bg-white dark:bg-[#0A0A0C] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Salud del Sistema</p>
                        <Server className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">100%</p>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Todos los servicios activos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Approval Queues */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-none">
                        <div className="p-5 border-b border-slate-100 dark:border-white/[0.06]">
                            <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                Cola de Verificación KYC
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                            {queues.kyc.length > 0 ? (
                                queues.kyc.map((item) => (
                                    <Link key={item.id} href={`/dashboard/admin/kyc/${item.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-black text-xs">
                                                {item.nombre.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {item.nombre}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-widest">
                                                {item.kycStatus === "EN_REVISION" ? "En revisión" : "Pendiente"}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-500 transition-colors" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">No hay verificaciones pendientes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-none">
                        <div className="p-5 border-b border-slate-100 dark:border-white/[0.06]">
                            <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <FileSignature className="w-4 h-4 text-rose-500" />
                                Aprobación Técnica de Proyectos
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                            {queues.projects.length > 0 ? (
                                queues.projects.map((project) => (
                                    <Link key={project.id} href={`/dashboard/admin/proyectos/${project.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center text-slate-500">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                                    {project.nombre}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Documentación pendiente</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-right">
                                            <div className="hidden sm:block">
                                                <p className="text-[9px] text-slate-500 font-black uppercase">Registrado</p>
                                                <p className="text-[10px] text-slate-900 dark:text-slate-400 font-bold whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: es })}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-500 transition-colors" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Todos los proyectos están al día</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Recent Registrations & Quick Monitor */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0A0A0C] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5">
                        <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Nuevos Registros
                        </h2>
                        <div className="space-y-4">
                            {recentUsers.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/[0.06]">
                                    <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500 font-black text-[10px]">
                                        {user.nombre.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{user.nombre}</p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{user.rol}</span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">hace {formatDistanceToNow(new Date(user.createdAt), { locale: es })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-[10px] font-black text-brand-500 uppercase tracking-widest hover:text-brand-400 transition-colors">
                            Ver todos los usuarios
                        </button>
                    </div>

                    <div className="bg-[#0A0A0C] border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-brand-500/5 mix-blend-overlay group-hover:bg-brand-500/10 transition-colors" />
                        <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] text-brand-500 group-hover:scale-110 group-hover:opacity-[0.06] transition-all duration-500" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 relative z-10">Plusvalía Estimada</h3>
                        <p className="text-3xl font-black text-white relative z-10">$24.8M</p>
                        <p className="text-[9px] font-bold text-slate-500 mt-2 leading-tight uppercase tracking-widest relative z-10">
                            Proyección de crecimiento basada en M²
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
