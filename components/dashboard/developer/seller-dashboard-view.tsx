import React from "react";
import Link from "next/link";
import { 
    AlertCircle, 
    Clock, 
    CheckCircle, 
    TrendingUp, 
    Calendar, 
    Phone, 
    Mail, 
    ChevronRight,
    ArrowUpRight,
    Search,
    MessageSquare,
    UserPlus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SellerDashboardViewProps {
    user: any;
    stats: any[];
    sellerData: {
        urgentLeads: any[];
        todaysTasks: any[];
        closingOpps: any[];
    };
    activities: any[];
    global: any;
}

export default function SellerDashboardView({ user, stats, sellerData, activities, global }: SellerDashboardViewProps) {
    const { urgentLeads, todaysTasks, closingOpps } = sellerData;

    return (
        <div className="space-y-6">
            {/* Header Vendedor */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                        ¡Hola, {user.nombre}! 👋
                    </h2>
                    <p className="text-[13px] text-slate-500 dark:text-white/40 font-medium">
                        Aquí tienes el resumen de tu actividad comercial para hoy.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06] text-[12px] font-bold">
                        <Search className="w-3.5 h-3.5 mr-2" />
                        Buscar Lead
                    </Button>
                    <Link href="/dashboard/developer/leads">
                        <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-bold shadow-lg shadow-brand-500/20">
                            <UserPlus className="w-3.5 h-3.5 mr-2" />
                            Nuevo Lead
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Grid de Stats Simplificado */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href} className="block group">
                        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-white/[0.05]">
                            <div className="flex items-start justify-between mb-2">
                                <p className="text-[10px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{stat.label}</p>
                                <div className={`p-1.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] ${stat.color}`}>
                                    <stat.icon className="w-3.5 h-3.5" />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tighter leading-none">
                                {stat.value}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda: Agenda y Urgencias */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Urgency Widget: Leads sin contacto */}
                    <Card className="border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                                    Acción Inmediata
                                </CardTitle>
                                <p className="text-[12px] font-medium text-slate-500 dark:text-white/40">Leads asignados sin contacto inicial</p>
                            </div>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold">
                                {urgentLeads.length} PENDIENTES
                            </Badge>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {urgentLeads.length > 0 ? (
                                <div className="space-y-3">
                                    {urgentLeads.map((lead) => (
                                        <div key={lead.id} className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] hover:border-amber-500/30 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-black text-sm">
                                                    {lead.nombre.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100">{lead.nombre}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[11px] text-slate-500 dark:text-white/40 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            Recibido hace {Math.floor((new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60))}h
                                                        </span>
                                                        {lead.aiQualificationScore && (
                                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-0 h-4 text-[9px] font-black">
                                                                AI: {lead.aiQualificationScore}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-500">
                                                    <Phone className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-brand-500/10 hover:text-brand-500">
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </Button>
                                                <Link href={`/dashboard/developer/leads?id=${lead.id}`}>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-white/[0.1]">
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-3">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 italic">¡Todo al día!</p>
                                    <p className="text-[11px] text-slate-500 dark:text-white/40">No tienes leads sin contacto inicial.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Agenda */}
                    <Card className="border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                                    Agenda para Hoy
                                </CardTitle>
                                <p className="text-[12px] font-medium text-slate-500 dark:text-white/40">
                                    {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-[11px] font-bold text-brand-500 hover:bg-brand-500/5">
                                Ver Calendario
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {todaysTasks.length > 0 ? (
                                <div className="space-y-4">
                                    {todaysTasks.map((task) => (
                                        <div key={task.id} className="flex items-start gap-4">
                                            <div className="w-2 h-2 rounded-full bg-brand-500 mt-2" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-zinc-100">{task.titulo}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-white/40 line-clamp-1">{task.descripcion || "Sin descripción"}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-slate-50 dark:bg-white/[0.04] text-[10px] uppercase font-black tracking-widest">
                                                {format(new Date(task.fechaVencimiento), "HH:mm")}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Calendar className="w-10 h-10 text-slate-200 dark:text-white/[0.03] mx-auto mb-3" />
                                    <p className="text-[12px] text-slate-500 dark:text-white/40 font-medium italic">Sin tareas programadas para hoy.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha: Oportunidades y Actividad */}
                <div className="space-y-6">
                    {/* Closing Opportunities */}
                    <Card className="border-slate-200 dark:border-white/[0.06] bg-brand-500/5 dark:bg-brand-500/[0.03] border-brand-500/10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                            <TrendingUp className="w-12 h-12 text-brand-500/5 rotate-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-brand-500/70">
                                Próximos Cierres
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            {closingOpps.length > 0 ? (
                                <div className="space-y-4">
                                    {closingOpps.map((opp) => (
                                        <div key={opp.id} className="p-3 rounded-lg bg-white dark:bg-zinc-900/50 border border-brand-500/20 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[13px] font-black text-slate-900 dark:text-zinc-100">{opp.lead.nombre}</p>
                                                <p className="text-[11px] font-bold text-brand-500">{opp.etapa}</p>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-white/40 mb-3">{opp.proyecto.nombre}</p>
                                            <Link href={`/dashboard/developer/crm-pipeline`}>
                                                <Button className="w-full h-8 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest">
                                                    Ir al Pipeline
                                                    <ArrowUpRight className="w-3 h-3 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[12px] text-slate-500 dark:text-white/40 font-medium italic text-center py-4">
                                    Sin cierres inminentes.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actividad Reciente */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest px-1">
                            Actividad de Proyectos
                        </h3>
                        <div className="space-y-2">
                            {activities.slice(0, 4).map((activity) => (
                                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        activity.status === "success" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                        activity.status === "info" ? "bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" :
                                        "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">{activity.title}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-white/40">{format(new Date(activity.date), "HH:mm")} • {(activity.description || "").split(":")[0]}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link href="/dashboard/developer/inventario" className="block text-center mt-4">
                            <span className="text-[11px] font-bold text-slate-400 hover:text-brand-500 transition-colors cursor-pointer">
                                Ver Inventario Completo
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
