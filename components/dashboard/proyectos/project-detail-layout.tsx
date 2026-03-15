"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
    ArrowLeft, Building2, MapPin, FileText, DollarSign, Layers, 
    Globe, Package, Home, BarChart3, TrendingUp, CalendarClock 
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamic imports for heavy components
const ProcessedStatsBar = ({ stats }: { stats: any }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
                { label: "Total", value: stats.total, color: "text-slate-700 dark:text-white" },
                { label: "Disponibles", value: stats.disponibles, color: "text-emerald-500" },
                { label: "Reservadas", value: stats.reservadas, color: "text-amber-500" },
                { label: "Vendidas", value: stats.vendidas, color: "text-rose-500" },
                { label: "Valor Total", value: formatCurrency(stats.valorTotal), color: "text-slate-700 dark:text-white" },
                { label: "Vendido", value: formatCurrency(stats.valorVendido), color: "text-brand-orange" },
                { label: "Avance", value: `${stats.pctVendido}%`, color: "text-brand-orangeDark" },
            ].map((s) => (
                <div key={s.label} className="glass-card p-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                </div>
            ))}
        </div>
    );
};

export default function ProjectDetailLayout({ 
    proyecto, 
    userRole, 
    activeTab,
    stats,
    children 
}: { 
    proyecto: any, 
    userRole: string, 
    activeTab: string,
    stats: any,
    children: React.ReactNode 
}) {
    const tabs = [
        { id: "info", label: "Info General", icon: FileText, roles: ["ADMIN", "DESARROLLADOR", "VENDEDOR", "INVERSOR", "CLIENTE"] },
        { id: "docs", label: "Documentación", icon: FileText, roles: ["ADMIN", "DESARROLLADOR"] },
        { id: "pagos", label: "Pagos", icon: DollarSign, roles: ["ADMIN", "DESARROLLADOR"] },
        { id: "reservas", label: "Reservas", icon: CalendarClock, roles: ["ADMIN", "DESARROLLADOR", "VENDEDOR"] },
        { id: "masterplan", label: "Masterplan", icon: Layers, roles: ["ADMIN", "DESARROLLADOR", "VENDEDOR"] },
        { id: "planos", label: "Motor de Planos", icon: Layers, roles: ["ADMIN", "DESARROLLADOR"] },
        { id: "mapa", label: "Mapa Interactivo", icon: MapPin, roles: ["ADMIN", "DESARROLLADOR", "VENDEDOR", "INVERSOR", "CLIENTE"] },
        { id: "tour360", label: "Tour 360°", icon: Globe, roles: ["ADMIN", "DESARROLLADOR", "VENDEDOR", "INVERSOR", "CLIENTE"] },
        { id: "etapas", label: "Etapas", icon: Package, roles: ["ADMIN", "DESARROLLADOR"] },
        { id: "inventario", label: "Inventario", icon: Home, roles: ["ADMIN", "DESARROLLADOR", "VENDEDOR"] },
        { id: "metricas", label: "Métricas", icon: BarChart3, roles: ["ADMIN", "DESARROLLADOR"] },
        { id: "inversion", label: "Inversión", icon: TrendingUp, roles: ["ADMIN", "INVERSOR"] },
    ].filter(t => t.roles.includes(userRole));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <Link href="/dashboard/proyectos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Proyectos
                </Link>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-orange/20 flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-brand-orange" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{proyecto.nombre}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />{proyecto.ubicacion || "Ubicación no definida"}
                                </span>
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20")}>
                                    {proyecto.estado}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <ProcessedStatsBar stats={stats} />

            {/* Tabs Navigation */}
            <div className="w-full mb-6 scrollbar-hide overflow-x-auto">
                <div className="flex w-fit min-w-full bg-slate-900/60 border border-white/8 rounded-xl p-1 gap-1">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`?tab=${tab.id}`}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-4 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-brand-orange text-white shadow-md"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {tab.icon && <tab.icon className="w-4 h-4 shrink-0" />}
                            <span className="leading-tight">{tab.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Content Slot */}
            <div className="animate-fade-in">
                {children}
            </div>
        </div>
    );
}
