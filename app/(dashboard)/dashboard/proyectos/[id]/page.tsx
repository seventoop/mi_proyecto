import prisma from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BlueprintEngine from "@/components/masterplan/blueprint-engine";
import { MasterplanUnit, useMasterplanStore } from "@/lib/masterplan-store";
import {
    ArrowLeft, Building2, MapPin, Edit3, Save, X, Plus, Trash2, ChevronDown,
    ChevronRight, Upload, FileText, BarChart3, Image, Layers, Home, Package, Globe, DollarSign, Archive, AlertCircle, LayoutDashboard
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import InventarioServer from "@/components/dashboard/proyectos/inventario-server";

const ProjectDocsTab = dynamic(() => import("@/components/dashboard/proyectos/project-docs-tab"), { ssr: false });
const ProjectPaymentsTab = dynamic(() => import("@/components/dashboard/proyectos/project-payments-tab"), { ssr: false });
const ProjectTechnicalFiles = dynamic(() => import("@/components/dashboard/proyectos/project-technical-files"), { ssr: false });

const MasterplanMap = dynamic(
    () => import("@/components/masterplan/masterplan-map"),
    {
        ssr: false,
        loading: () => (
            <div className="h-[500px] flex items-center justify-center bg-slate-900 rounded-2xl">
                <span className="text-slate-400">Cargando mapa...</span>
            </div>
        )
    }
);

const MasterplanViewer = dynamic(
    () => import("@/components/masterplan/masterplan-viewer"),
    {
        ssr: false,
        loading: () => (
            <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
                <span className="text-slate-400">Cargando Masterplan...</span>
            </div>
        )
    }
);

const Tour360TabWrapper = dynamic(
    () => import("@/components/dashboard/proyectos/tour360-tab-wrapper"),
    { ssr: false }
);


interface PageProps {
    params: { id: string };
    searchParams: { tab?: string };
}

export default async function ProyectoDetailPage({ params, searchParams }: PageProps) {
    const activeTab = searchParams.tab || "info";

    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "INVITADO";

    // Fetch real project data
    const proyecto = await prisma.proyecto.findUnique({
        where: { id: params.id },
        include: {
            etapas: {
                include: {
                    manzanas: {
                        include: {
                            unidades: true
                        }
                    }
                },
                orderBy: { orden: "asc" }
            },
            pagos: true,
            documentacion: true,
            tours: true, // Fetch tours for 360 tab
            _count: {
                select: { leads: true }
            }
        }
    });

    if (!proyecto) {
        return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Proyecto no encontrado</h1><Link href="/dashboard/proyectos" className="text-brand-500 mt-4 block">Volver</Link></div>;
    }

    // SECURITY CHECK: Only Admin or Owner can see the detail dashboard
    const userId = session?.user?.id;
    if (userRole !== "ADMIN" && proyecto.creadoPorId !== userId) {
        return (
            <div className="p-20 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Acceso no autorizado</h1>
                <p className="text-slate-500 mt-2">No tienes permisos para ver los detalles de este proyecto.</p>
                <Link href="/dashboard/proyectos" className="text-brand-500 mt-6 inline-block font-medium">
                    Volver a mis proyectos
                </Link>
            </div>
        );
    }

    // Process stats
    let total = 0;
    let disponibles = 0;
    let reservadas = 0;
    let vendidas = 0;
    let valorTotal = 0;
    let valorVendido = 0;
    let valorReservado = 0;

    proyecto.etapas.forEach(etapa => {
        etapa.manzanas.forEach(manzana => {
            manzana.unidades.forEach(u => {
                total++;
                if (u.estado === "DISPONIBLE") disponibles++;
                if (u.estado === "RESERVADA") reservadas++;
                if (u.estado === "VENDIDA") vendidas++;

                valorTotal += u.precio || 0;
                if (u.estado === "VENDIDA") valorVendido += u.precio || 0;
                if (u.estado === "RESERVADA") valorReservado += u.precio || 0;
            });
        });
    });

    const pctVendido = total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0;

    const tabs = [
        { id: "info", label: "Info General", icon: FileText },
        { id: "archivos", label: "Archivos Técnicos", icon: Archive },
        { id: "docs", label: "Documentación", icon: FileText },
        { id: "pagos", label: "Pagos", icon: DollarSign },
        { id: "masterplan", label: "Masterplan", icon: Layers },
        { id: "blueprint", label: "Motor de Planos", icon: LayoutDashboard },
        { id: "mapa", label: "Mapa Interactivo", icon: MapPin },
        { id: "tour360", label: "Tour 360°", icon: Globe },
        { id: "etapas", label: "Etapas y Manzanas", icon: Package },
        { id: "inventario", label: "Inventario", icon: Home },
        { id: "metricas", label: "Métricas", icon: BarChart3 },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <Link href="/dashboard/proyectos" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-500 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Proyectos
                </Link>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/30 flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{proyecto.nombre}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />{proyecto.ubicacion || "Ubicación no definida"}
                                </span>
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20")}>
                                    {proyecto.estado}
                                </span>
                                {proyecto.isDemo && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-500/20">
                                            DEMO 48h
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium italic">
                                            Expira: {proyecto.demoExpiresAt ? new Date(proyecto.demoExpiresAt).toLocaleString() : "N/A"}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {proyecto.isDemo && (
                                <p className="text-xs text-amber-500 font-bold mt-2 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Este proyecto es temporal. <Link href="/dashboard/developer/mi-perfil/kyc" className="underline hover:text-amber-600 transition-colors">Completa tu KYC</Link> para que sea oficial.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats bar - Moved out of header for correct layout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: "Total", value: total, color: "text-slate-700 dark:text-white" },
                    { label: "Disponibles", value: disponibles, color: "text-emerald-500" },
                    { label: "Reservadas", value: reservadas, color: "text-amber-500" },
                    { label: "Vendidas", value: vendidas, color: "text-rose-500" },
                    { label: "Valor Total", value: formatCurrency(valorTotal), color: "text-slate-700 dark:text-white" },
                    { label: "Vendido", value: formatCurrency(valorVendido), color: "text-emerald-500" },
                    { label: "Avance", value: `${pctVendido}%`, color: "text-brand-400" },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-3 text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>
            {/* Tabs Navigation - Double Row Grid Layout */}
            <div className="bg-slate-100/50 dark:bg-slate-800/40 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`?tab=${tab.id}`}
                            className={cn(
                                "flex items-center justify-center gap-2.5 px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200",
                                activeTab === tab.id
                                    ? "bg-brand-500 text-white shadow-xl shadow-brand-500/25 ring-1 ring-brand-400/50"
                                    : "text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="truncate">{tab.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in mb-10 mt-2">
                {activeTab === "info" && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Información General</h2>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                            {proyecto.descripcion || "Sin descripción disponible."}
                        </p>
                        {/* More info sections... */}
                    </div>
                )}

                {activeTab === "docs" && (
                    <ProjectDocsTab
                        proyectoId={proyecto.id}
                        docs={proyecto.documentacion || []}
                        docStatus={proyecto.documentacionEstado || "PENDIENTE"}
                        userRole={userRole}
                    />
                )}

                {activeTab === "archivos" && (
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-brand-500/10 text-brand-500 rounded-xl">
                                    <Archive className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Archivos Técnicos</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Gestión de planos, memorias y documentación técnica pública.</p>
                                </div>
                            </div>
                        </div>
                        <ProjectTechnicalFiles proyectoId={proyecto.id} />
                    </div>
                )}

                {activeTab === "etapas" && (
                    <div className="space-y-4">
                        {proyecto.etapas.map(etapa => (
                            <div key={etapa.id} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white">{etapa.nombre}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-black">Orden: {etapa.orden}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {etapa.manzanas.map(manzana => (
                                        <div key={manzana.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-sm font-medium">{manzana.nombre}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{manzana.unidades.length} unidades</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === "inventario" && (
                    <InventarioServer proyectoId={proyecto.id} />
                )}

                {activeTab === "blueprint" && (
                    <div className="animate-fade-in h-[calc(100vh-330px)] min-h-[500px]">
                        <BlueprintEngine proyectoId={proyecto.id} />
                    </div>
                )}

                {activeTab === "mapa" && (
                    <MasterplanMap proyectoId={proyecto.id} modo="admin" />
                )}

                {activeTab === "masterplan" && (
                    <MasterplanViewer proyectoId={proyecto.id} modo="admin" />
                )}

                {activeTab === "tour360" && (
                    <Tour360TabWrapper
                        proyectoId={proyecto.id}
                        tours={proyecto.tours || []}
                        userRole={userRole}
                    />
                )}
            </div>
        </div>
    );
}
