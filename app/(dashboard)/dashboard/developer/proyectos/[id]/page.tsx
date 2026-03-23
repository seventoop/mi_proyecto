import prisma from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
    ArrowLeft, Building2, MapPin, Edit3, Save, X, Plus, Trash2, ChevronDown,
    ChevronRight, Upload, FileText, BarChart3, Image, Layers, Home, Package, Globe, DollarSign,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import InventarioServer from "@/components/dashboard/proyectos/inventario-server";
import ProjectPaymentsTab from "@/components/dashboard/proyectos/project-payments-tab";
import { getProjectAccess } from "@/lib/project-access";
import { getProyectoEstadoLogs } from "@/lib/actions/validation-actions";
import DeveloperStatusIndicators, { StatusBadge } from "@/components/dashboard/proyectos/developer-status-indicators";
import ProjectValidationHistory from "@/components/dashboard/proyectos/project-validation-history";
import { resolveProjectIdentifier } from "@/lib/project-slug";

const ProjectDocsTab = dynamic(() => import("@/components/dashboard/proyectos/project-docs-tab"), { ssr: false });
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


interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ tab?: string }>;
}

export default async function ProyectoDetailPage({ params, searchParams }: PageProps) {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const activeTab = resolvedSearchParams.tab || "info";

    const session = await getServerSession(authOptions);
    if (!session?.user) return <div className="p-20 text-center">No autorizado</div>;

    const resolvedProject = await resolveProjectIdentifier(id);
    if (!resolvedProject) {
        return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Proyecto no encontrado</h1><Link href="/dashboard/proyectos" className="text-brand-500 mt-4 block">Volver</Link></div>;
    }

    // Use centralized access helper
    let context;
    try {
        context = await getProjectAccess(session.user as any, resolvedProject.id);
    } catch (e) {
        return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Proyecto no encontrado</h1><Link href="/dashboard/proyectos" className="text-brand-500 mt-4 block">Volver</Link></div>;
    }

    const { proyecto: snapshot, relacion } = context;

    // Fetch full project data for UI (etapas, pagos, etc)
    const proyecto = await prisma.proyecto.findUnique({
        where: { id: resolvedProject.id },
        include: {
            etapas: {
                include: { manzanas: { include: { unidades: true } } },
                orderBy: { orden: "asc" }
            },
            pagos: true,
            documentacion: true,
            tours: true,
            _count: { select: { leads: true } }
        }
    }) as any;

    if (!proyecto) {
        return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Proyecto no encontrado</h1><Link href="/dashboard/proyectos" className="text-brand-500 mt-4 block">Volver</Link></div>;
    }

    // Admin/Owner-only: fetch full history
    const isOwner = relacion?.tipoRelacion === "OWNER" || context.isLegacy;
    const isProjectAdmin = context.user.role === "ADMIN" || context.user.role === "SUPERADMIN";
    const canSeeHistory = isOwner || isProjectAdmin;
    const userRole = context.user.role;

    const validationLogsRes = canSeeHistory 
        ? await getProyectoEstadoLogs(resolvedProject.id) 
        : { success: false, data: [] };
    const validationLogs = (validationLogsRes.success ? validationLogsRes.data : []) as any[];

    // Latest log for reasons (Only if blocked)
    const latestLog = (proyecto.estadoValidacion === "OBSERVADO" || proyecto.estadoValidacion === "RECHAZADO" || proyecto.estadoValidacion === "SUSPENDIDO")
        ? (validationLogs[0] || null)
        : null;


    // Process stats
    let total = 0;
    let disponibles = 0;
    let reservadas = 0;
    let vendidas = 0;
    let valorTotal = 0;
    let valorVendido = 0;
    let valorReservado = 0;

    proyecto.etapas.forEach((etapa: any) => {
        etapa.manzanas.forEach((manzana: any) => {
            manzana.unidades.forEach((u: any) => {
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
        { id: "docs", label: "Documentación", icon: FileText }, // New tab
        { id: "pagos", label: "Pagos", icon: DollarSign }, // New tab
        { id: "masterplan", label: "Masterplan", icon: Layers },
        { id: "mapa", label: "Mapa Interactivo", icon: MapPin },
        { id: "tour360", label: "Tour 360°", icon: Globe },
        { id: "etapas", label: "Etapas y Manzanas", icon: Package },
        { id: "inventario", label: "Inventario", icon: Home },
        { id: "metricas", label: "Métricas", icon: BarChart3 },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Contextual Status Banners */}
            <DeveloperStatusIndicators context={context} latestLog={latestLog} />

            {/* Header */}
            <div>
                <Link href="/dashboard/proyectos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Volver a Proyectos
                </Link>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/30 flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-brand-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{proyecto.nombre}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />{proyecto.ubicacion || "Ubicación no definida"}
                                </span>
                                
                                <StatusBadge context={context} />
                                
                                <span className="opacity-20">|</span>
                                <span className="text-xs font-semibold text-slate-500">
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
                    { label: "Vendido", value: formatCurrency(valorVendido), color: "text-emerald-500" },
                    { label: "Avance", value: `${pctVendido}%`, color: "text-brand-400" },
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
                                    ? "border-brand-500 text-brand-400"
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
                        
                        {canSeeHistory && validationLogs.length > 0 && (
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <ProjectValidationHistory logs={validationLogs} />
                            </div>
                        )}
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

                {activeTab === "etapas" && (
                    <div className="space-y-4">
                        {proyecto.etapas.map((etapa: any) => (
                            <div key={etapa.id} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white">{etapa.nombre}</h3>
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-black">Orden: {etapa.orden}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {etapa.manzanas.map((manzana: any) => (
                                        <div key={manzana.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-sm font-medium">{manzana.nombre}</span>
                                            <span className="text-xs text-slate-400">{manzana.unidades.length} unidades</span>
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

                {activeTab === "mapa" && (
                    <ResizableContainer defaultHeight={580} minHeight={400}>
                        <MasterplanMap proyectoId={proyecto.id} modo="admin" />
                    </ResizableContainer>
                )}

                {activeTab === "masterplan" && (
                    <ResizableContainer defaultHeight={620} minHeight={420}>
                        <MasterplanViewer proyectoId={proyecto.id} modo="admin" canEdit={["ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"].includes(userRole)} />
                    </ResizableContainer>
                )}

                {activeTab === "tour360" && (
                    <Tour360TabWrapper
                        proyectoId={proyecto.id}
                        tours={proyecto.tours}
                        userRole={userRole}
                    />
                )}
            </div>
        </div>
    );
}
