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
import ReservasList from "@/components/dashboard/reservas/reservas-list";
import { getReservasProyecto } from "@/lib/actions/reservas";

const ProjectDocsTab = dynamic(() => import("@/components/dashboard/proyectos/project-docs-tab"), { ssr: false });
const EtapasManager = dynamic(() => import("@/components/dashboard/proyectos/etapas-manager"), { ssr: false });
const InversionPanel = dynamic(() => import("@/components/dashboard/proyectos/inversion-panel"), { ssr: false });
const DocumentosManager = dynamic(() => import("@/components/dashboard/proyectos/documentos-manager"), { ssr: false });
const PagosManager = dynamic(() => import("@/components/dashboard/proyectos/pagos-manager"), { ssr: false });

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
const ResizableContainer = dynamic(
    () => import("@/components/ui/resizable-container"),
    { ssr: false }
);
const ResetProjectModal = dynamic(
    () => import("@/components/dashboard/proyectos/reset-project-modal"),
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
                                        precio: true, moneda: true, estado: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { orden: "asc" }
                },
                pagos: {
                    orderBy: { createdAt: "desc" }
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
                }
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
        const sum = group._sum.precio || 0;

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



    // ... previous code ...

    // Fetch reservas if tab is active (or always if lightweight)
    const reservasRes = await getReservasProyecto(params.id);
    const reservasProyecto = reservasRes.success ? (reservasRes.data || []) : [];

    const tabs = [
        { id: "info", label: "Info General", icon: FileText },
        { id: "docs", label: "Documentación", icon: FileText },
        { id: "pagos", label: "Pagos", icon: DollarSign },
        { id: "reservas", label: "Reservas", icon: CalendarClock }, // ADDED
        { id: "masterplan", label: "Masterplan", icon: Layers },
        { id: "mapa", label: "Mapa Interactivo", icon: MapPin },
        { id: "tour360", label: "Tour 360°", icon: Globe },
        { id: "etapas", label: "Etapas y Manzanas", icon: Package },
        { id: "inventario", label: "Inventario", icon: Home },
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
                    {userRole === "ADMIN" && (
                        <div className="flex-shrink-0">
                            <ResetProjectModal proyectoId={proyecto.id} />
                        </div>
                    )}
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

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-1 overflow-x-auto pb-px">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`?tab=${tab.id}`}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "border-brand-orange text-brand-orange"
                                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </Link>
                    ))}
                </div>
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
                        documentos={proyecto.documentos || []}
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
                    <ResizableContainer defaultHeight={580} minHeight={400}>
                        <MasterplanMap
                            proyectoId={proyecto.id}
                            modo="admin"
                            centerLat={proyecto.mapCenterLat || -33.0943}
                            centerLng={proyecto.mapCenterLng || -60.5475}
                        />
                    </ResizableContainer>
                )}

                {activeTab === "masterplan" && (
                    <ResizableContainer defaultHeight={620} minHeight={420}>
                        <MasterplanViewer proyectoId={proyecto.id} modo="admin" />
                    </ResizableContainer>
                )}

                {activeTab === "tour360" && (
                    <Tour360TabWrapper
                        proyectoId={proyecto.id}
                        tours={proyecto.tours || []}
                        userRole={userRole}
                    />
                )}

                {activeTab === "inversion" && (
                    <InversionPanel
                        proyectoId={proyecto.id}
                        proyectoNombre={proyecto.nombre}
                        invertible={proyecto.invertible}
                        m2Vendidos={proyecto.m2VendidosInversores || 0}
                        metaM2={proyecto.metaM2Objetivo || 0}
                        precioM2={proyecto.precioM2Inversor || 0}
                        fechaLimite={proyecto.fechaLimiteFondeo}
                        hitos={proyecto.hitosEscrow || []}
                        inversiones={proyecto.inversiones || []}
                        userRole={userRole}
                    />
                )}

                {activeTab === "reservas" && (
                    <ReservasList
                        reservas={reservasProyecto}
                        userRole={userRole}
                    />
                )}
            </div>
        </div>
    );
}
