import prisma from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    ArrowLeft, Building2, MapPin, Edit3, Save, X, Plus, Trash2, ChevronDown,
    ChevronRight, Upload, FileText, BarChart3, TrendingUp, Image, Layers, Home, Package, Globe, DollarSign, CalendarClock,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import InventarioServer from "@/components/dashboard/proyectos/inventario-server";
import { getReservasByProyecto } from "@/lib/actions/reservas";
const ReservasTab = dynamic(() => import("@/components/reservas/ReservasTab"), { ssr: false });

const ProjectDocsTab = dynamic(() => import("@/components/dashboard/proyectos/project-docs-tab"), { ssr: false });
const EtapasManager = dynamic(() => import("@/components/dashboard/proyectos/etapas-manager"), { ssr: false });
const InversionPanel = dynamic(() => import("@/components/dashboard/proyectos/inversion-panel"), { ssr: false });
const DocumentosManager = dynamic(() => import("@/components/dashboard/proyectos/documentos-manager"), { ssr: false });
const PagosManager = dynamic(() => import("@/components/dashboard/proyectos/pagos-manager"), { ssr: false });
const PlanosTab = dynamic(() => import("@/components/blueprint/PlanosTab"), { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-slate-400">Cargando Motor de Planos...</span></div> });
const Tour360Viewer = dynamic(() => import("@/components/tour360/Tour360Viewer"), { ssr: false, loading: () => <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl"><span className="text-slate-400">Cargando Tour 360°...</span></div> });
const PagosTab = dynamic(() => import("@/components/dashboard/proyectos/pagos-tab"), { ssr: false });

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

const BlueprintEngine = dynamic(
    () => import("@/components/masterplan/blueprint-engine"),
    {
        ssr: false,
        loading: () => (
            <div className="h-[600px] flex items-center justify-center bg-slate-900 rounded-2xl">
                <span className="text-slate-400">Cargando Procesador AI...</span>
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
    searchParams: { tab?: string; mode?: string };
}

export default async function ProyectoDetailPage({ params, searchParams }: PageProps) {
    const activeTab = searchParams.tab || "info";

    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "INVITADO";

    const [proyectoRaw, statsGrouped] = await Promise.all([
        prisma.proyecto.findUnique({
            where: { id: params.id },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: {
                                    select: {
                                        id: true, numero: true, tipo: true, superficie: true,
                                        frente: true, fondo: true, esEsquina: true, orientacion: true,
                                        precio: true, moneda: true, estado: true, polygon: true,
                                        bloqueadoHasta: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { orden: "asc" }
                },
                pagos: {
                    orderBy: { createdAt: "desc" },
                    include: { usuario: { select: { nombre: true } } }
                },
                _count: {
                    select: { leads: true }
                },
                tours: {
                    include: {
                        scenes: {
                            include: {
                                hotspots: true
                            }
                        }
                    }
                },
                documentacion: true,
                archivosTecnicos: true,
                inversiones: {
                    include: {
                        inversor: true
                    }
                },
                hitosEscrow: true
            }
        }),
        prisma.unidad.groupBy({
            by: ['estado'],
            where: { manzana: { etapa: { proyectoId: params.id } } },
            _count: true,
            _sum: { precio: true }
        })
    ]);

    if (!proyectoRaw) {
        return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Proyecto no encontrado</h1><Link href="/dashboard/proyectos" className="text-brand-500 mt-4 block">Volver</Link></div>;
    }

    const proyecto = proyectoRaw as any;

    // Process stats from DB aggregation
    let total = 0;
    let disponibles = 0;
    let reservadas = 0;
    let vendidas = 0;
    let valorTotal = 0;
    let valorVendido = 0;
    let valorReservado = 0;

    statsGrouped.forEach(group => {
        const count = group._count;
        const sum = Number(group._sum.precio || 0);

        total += count;
        valorTotal += sum;

        if (group.estado === "DISPONIBLE") disponibles += count;
        if (group.estado === "RESERVADA") {
            reservadas += count;
            valorReservado += sum;
        }
        if (group.estado === "VENDIDA") {
            vendidas += count;
            valorVendido += sum;
        }
    });

    const pctVendido = total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0;

    // Fetch reservas
    const reservasRes = await getReservasByProyecto(params.id);
    const reservasProyecto = reservasRes.success ? (reservasRes.data || []) : [];

    const tabs = [
        { id: "info", label: "Info General", icon: FileText },
        { id: "archivos", label: "Archivos Técnicos", icon: Package },
        { id: "docs", label: "Documentación", icon: FileText },
        { id: "pagos", label: "Pagos", icon: DollarSign },
        { id: "reservas", label: "Reservas", icon: CalendarClock },
        { id: "masterplan", label: "Masterplan", icon: Layers },
        { id: "planos", label: "Motor de Planos", icon: Layers },
        { id: "mapa", label: "Mapa Interactivo", icon: MapPin },
        { id: "tour360", label: "Tour 360°", icon: Globe },
        { id: "etapas", label: "Etapas y Manzanas", icon: Package },
        { id: "inventario", label: "Inventario", icon: Home },
        { id: "metricas", label: "Métricas", icon: BarChart3 },
        { id: "inversion", label: "Inversión & Escrow", icon: TrendingUp },
    ];

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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: "Total", value: total, color: "text-slate-700 dark:text-white" },
                    { label: "Disponibles", value: disponibles, color: "text-emerald-500" },
                    { label: "Reservadas", value: reservadas, color: "text-amber-500" },
                    { label: "Vendidas", value: vendidas, color: "text-rose-500" },
                    { label: "Valor Total", value: formatCurrency(valorTotal), color: "text-slate-700 dark:text-white" },
                    { label: "Vendido", value: formatCurrency(valorVendido), color: "text-brand-orange" },
                    { label: "Avance", value: `${pctVendido}%`, color: "text-brand-orangeDark" },
                ].map((s) => (
                    <div key={s.label} className="glass-card p-3 text-center">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-400">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs Navigation — compact horizontal bar */}
            <div className="flex flex-wrap gap-1 bg-slate-900/50 border border-white/5 rounded-xl p-1">
                {tabs.map((tab) => (
                    <Link
                        key={tab.id}
                        href={`?tab=${tab.id}`}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-brand-orange text-white shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5 shrink-0" />
                        {tab.label}
                    </Link>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
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
                    <DocumentosManager
                        proyectoId={proyecto.id}
                        documentos={proyecto.documentacion || []}
                        userRole={userRole}
                    />
                )}

                {activeTab === "etapas" && (
                    <EtapasManager
                        proyectoId={proyecto.id}
                        etapas={proyecto.etapas}
                    />
                )}

                {activeTab === "inventario" && (
                    <InventarioServer proyectoId={proyecto.id} />
                )}

                {activeTab === "mapa" && (
                    <MasterplanMap
                        proyectoId={proyecto.id}
                        modo="admin"
                        centerLat={proyecto.mapCenterLat || -33.0943}
                        centerLng={proyecto.mapCenterLng || -60.5475}
                        initialUnits={proyecto.etapas.flatMap((etapa: any) =>
                            etapa.manzanas.flatMap((manzana: any) =>
                                manzana.unidades.map((u: any) => ({
                                    id: u.id,
                                    numero: u.numero,
                                    tipo: u.tipo as any,
                                    superficie: u.superficie,
                                    frente: u.frente || 0,
                                    fondo: u.fondo || 0,
                                    esEsquina: u.esEsquina,
                                    orientacion: u.orientacion || "N",
                                    precio: u.precio,
                                    moneda: u.moneda,
                                    estado: u.estado as any,
                                    etapaId: etapa.id,
                                    etapaNombre: etapa.nombre,
                                    manzanaId: manzana.id,
                                    manzanaNombre: manzana.nombre,
                                    tour360Url: u.tour360Url,
                                    imagenes: [],
                                    responsable: null,
                                    polygon: u.polygon,
                                    cx: 0,
                                    cy: 0
                                }))
                            )
                        )}
                    />
                )}

                {activeTab === "masterplan" && (
                    <MasterplanViewer proyectoId={proyecto.id} modo="admin" />
                )}

                {activeTab === "tour360" && (
                    <Tour360Viewer
                        proyectoId={proyecto.id}
                        tourId={proyecto.tours?.[0]?.id}
                        unidades={proyecto.etapas.flatMap((e: any) => e.manzanas.flatMap((m: any) => m.unidades))}
                        isAdmin={userRole === "ADMIN" || userRole === "DESARROLLADOR"}
                    />
                )}

                {activeTab === "inversion" && (
                    <InversionPanel
                        proyectoId={proyecto.id}
                        proyectoNombre={proyecto.nombre}
                        invertible={proyecto.invertible}
                        m2Vendidos={Number(proyecto.m2VendidosInversores || 0)}
                        metaM2={Number(proyecto.metaM2Objetivo || 0)}
                        precioM2={Number(proyecto.precioM2Inversor || 0)}
                        fechaLimite={proyecto.fechaLimiteFondeo}
                        hitos={proyecto.hitosEscrow || []}
                        inversiones={proyecto.inversiones || []}
                        userRole={userRole}
                    />
                )}

                {activeTab === "reservas" && (
                    <ReservasTab
                        proyectoId={proyecto.id}
                        initialReservas={reservasProyecto as any}
                        userRole={userRole}
                    />
                )}

                {activeTab === "archivos" && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-4">Archivos Técnicos</h2>
                        <DocumentosManager
                            proyectoId={proyecto.id}
                            documentos={proyecto.archivosTecnicos || []}
                            userRole={userRole}
                        />
                    </div>
                )}

                {activeTab === "pagos" && (
                    <PagosTab
                        pagos={proyecto.pagos || []}
                        userRole={userRole}
                    />
                )}

                {activeTab === "planos" && (
                    <PlanosTab
                        unidades={proyecto.etapas.flatMap((e: any) => e.manzanas.flatMap((m: any) =>
                            m.unidades.map((u: any) => ({ ...u, manzanaNombre: m.nombre, manzanaId: m.id }))
                        ))}
                        proyectoId={proyecto.id}
                        tour360Url={(proyecto as any).tour360Url}
                        centerLat={proyecto.mapCenterLat || -31.4532}
                        centerLng={proyecto.mapCenterLng || -64.4823}
                    />
                )}

                {activeTab === "metricas" && (() => {
                    const roiPct = valorTotal > 0 ? ((valorVendido / valorTotal) * 100).toFixed(1) : "0.0";
                    // Velocity: vendidas / months since project created (min 1 month)
                    const createdMs = proyecto.createdAt ? new Date(proyecto.createdAt).getTime() : Date.now();
                    const monthsElapsed = Math.max(1, Math.round((Date.now() - createdMs) / (1000 * 60 * 60 * 24 * 30)));
                    const velocidad = (vendidas / monthsElapsed).toFixed(1);
                    const pctDisponible = total > 0 ? Math.round((disponibles / total) * 100) : 0;
                    const valorReservadoFmt = formatCurrency(valorReservado);
                    return (
                        <div className="glass-card p-6 space-y-6">
                            <h2 className="text-lg font-bold">Métricas del Proyecto</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
                                    <TrendingUp className="w-8 h-8 text-brand-orange shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">ROI Realizado</p>
                                        <p className="text-2xl font-black">{roiPct}%</p>
                                        <p className="text-xs text-slate-400">{formatCurrency(valorVendido)} vendido de {formatCurrency(valorTotal)}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
                                    <BarChart3 className="w-8 h-8 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">Velocidad de Venta</p>
                                        <p className="text-2xl font-black">{velocidad} u/mes</p>
                                        <p className="text-xs text-slate-400">{vendidas} vendidas en {monthsElapsed} mes{monthsElapsed !== 1 ? "es" : ""}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
                                    <Building2 className="w-8 h-8 text-blue-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">Stock Disponible</p>
                                        <p className="text-2xl font-black">{pctDisponible}%</p>
                                        <p className="text-xs text-slate-400">{disponibles} de {total} unidades</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
                                    <DollarSign className="w-8 h-8 text-amber-500 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">En Reserva</p>
                                        <p className="text-2xl font-black">{valorReservadoFmt}</p>
                                        <p className="text-xs text-slate-400">{reservadas} unidades reservadas</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
                                    <TrendingUp className="w-8 h-8 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">Avance General</p>
                                        <p className="text-2xl font-black">{pctVendido}%</p>
                                        <p className="text-xs text-slate-400">{vendidas + reservadas} de {total} comprometidas</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
                                    <BarChart3 className="w-8 h-8 text-rose-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-slate-500">Reservas Activas</p>
                                        <p className="text-2xl font-black">{reservasProyecto.length}</p>
                                        <p className="text-xs text-slate-400">contratos en curso</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
