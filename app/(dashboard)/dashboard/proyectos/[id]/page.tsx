import fs from "fs";
import path from "path";
function forensicLog(msg: string) { try { const logPath = path.join(process.cwd(), "forensic_logs.txt"); const timestamp = new Date().toISOString(); fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`); } catch (e) {} }
import prisma from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BlueprintEngine from "@/components/masterplan/blueprint-engine";
import ProjectStepsDock from "@/components/dashboard/proyectos/project-steps-dock";
import {
    ArrowLeft, MapPin, FileText, BarChart3, Layers, Home,
    Globe, DollarSign, Archive, AlertCircle, LayoutDashboard,
    CheckCircle2, Info, Camera, Edit3, Users,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
const InventarioClient = dynamic(
    () => import("@/components/dashboard/proyectos/inventario-client"),
    { ssr: false }
);

const ProjectDocsTab = dynamic(
    () => import("@/components/dashboard/proyectos/project-docs-tab"),
    { ssr: false }
);
const ProjectPaymentsTab = dynamic(
    () => import("@/components/dashboard/proyectos/project-payments-tab"),
    { ssr: false }
);
const ProjectTechnicalFiles = dynamic(
    () => import("@/components/dashboard/proyectos/project-technical-files"),
    { ssr: false }
);
const EtapasManager = dynamic(
    () => import("@/components/dashboard/proyectos/etapas-manager"),
    { ssr: false }
);
const MasterplanMap = dynamic(
    () => import("@/components/masterplan/masterplan-map"),
    {
        ssr: false,
        loading: () => (
            <div className="h-[500px] flex items-center justify-center bg-slate-900 rounded-2xl">
                <span className="text-slate-400">Cargando mapa...</span>
            </div>
        ),
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
        ),
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
    params: { id: string };
    searchParams: { tab?: string };
}

export default async function ProyectoDetailPage({ params, searchParams }: PageProps) {
    // Map legacy tab IDs to new step IDs
    const tabMap: Record<string, string> = {
        etapas: "masterplan",
        inventario: "masterplan",
        lotes: "masterplan",
        archivos: "comercial",
        docs: "comercial",
        pagos: "comercial",
        metricas: "comercial",
    };
    const rawTab = searchParams.tab || "info";
    const activeTab = tabMap[rawTab] || rawTab;

    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "INVITADO";
    const isAuthorizedAdmin = userRole === "ADMIN" || userRole === "SUPERADMIN";
    const backHref =
        isAuthorizedAdmin ? "/dashboard/admin/proyectos" :
        userRole === "DESARROLLADOR" ? "/dashboard/developer/proyectos" :
        "/dashboard/proyectos";

    forensicLog(`PAGE-FETCH: Cargando proyecto ${params.id}`);
    const proyecto = await prisma.proyecto.findUnique({
        where: { id: params.id },
        include: {
            etapas: {
                include: {
                    manzanas: {
                        include: activeTab === "masterplan"
                            ? { unidades: true }
                            : { _count: { select: { unidades: true } } },
                    },
                },
                orderBy: { orden: "asc" },
            },
            pagos: true,
            documentacion: true,
            tours: {
                orderBy: { updatedAt: "desc" },
                include: {
                    scenes: {
                        include: {
                            hotspots: {
                                include: {
                                    unidad: {
                                        select: {
                                            id: true,
                                            numero: true,
                                            estado: true,
                                            precio: true,
                                            moneda: true,
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { order: "asc" },
                    },
                },
            },
            _count: { select: { leads: true, imagenesMapa: true } },
        },
    });

    // Stats via aggregation � avoids loading all unidades into memory
    const statsRaw = await prisma.unidad.groupBy({
        by: ["estado"],
        where: { manzana: { etapa: { proyectoId: params.id } } },
        _count: { _all: true },
        _sum: { precio: true },
    });

    console.log("[Tour360][ServerRender][Page]", { proyectoId: params.id, tours: proyecto?.tours?.map((t: any) => t.id) || [] });

    if (!proyecto) {
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold">Proyecto no encontrado</h1>
                <Link href={backHref} className="text-brand-500 mt-4 block">
                    Volver
                </Link>
            </div>
        );
    }

    const userId = session?.user?.id;
    if (!isAuthorizedAdmin && proyecto.creadoPorId !== userId) {
        return (
            <div className="p-20 text-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Acceso no autorizado
                </h1>
                <p className="text-slate-500 mt-2">
                    No tienes permisos para ver los detalles de este proyecto.
                </p>
                <Link
                    href={backHref}
                    className="text-brand-500 mt-6 inline-block font-medium"
                >
                    Volver a mis proyectos
                </Link>
            </div>
        );
    }

    // Compute stats from aggregation query
    let total = 0, disponibles = 0, reservadas = 0, vendidas = 0;
    let valorTotal = 0, valorVendido = 0, valorReservado = 0;

    for (const row of statsRaw) {
        const count = row._count._all;
        const sum = Number(row._sum.precio ?? 0);
        total += count;
        valorTotal += sum;
        if (row.estado === "DISPONIBLE") disponibles += count;
        if (row.estado === "RESERVADA") { reservadas += count; valorReservado += sum; }
        if (row.estado === "VENDIDA") { vendidas += count; valorVendido += sum; }
    }

    const pctVendido =
        total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0;

    // Step completion
    const step1Done = !!(proyecto.nombre && proyecto.ubicacion && proyecto.descripcion);
    const step2Done = !!proyecto.masterplanSVG;
    const step3Done = total > 0;
    const step4Done = !!proyecto.overlayBounds;
    const step5Done = proyecto.tours.length > 0 || (proyecto._count as any).imagenesMapa > 0;
    const step6Done =
        proyecto.pagos.length > 0 || proyecto.documentacion.length > 0;
    const step7Done = proyecto._count.leads > 0;

    const stepsCompletion = [
        step1Done, step2Done, step3Done, step4Done,
        step5Done, step6Done, step7Done,
    ];
    const completedCount = stepsCompletion.filter(Boolean).length;
    const progressPct = Math.round((completedCount / 7) * 100);

    const steps = [
        {
            id: "info",
            num: 1,
            label: "Informaci�n General",
            desc: "Datos b�sicos del proyecto",
            required: true,
            icon: FileText,
            done: step1Done,
            guidance:
                "Complet� los datos del proyecto: nombre, ubicaci�n y descripci�n. Estos campos son obligatorios para avanzar.",
        },
        {
            id: "blueprint",
            num: 2,
            label: "Plano del Proyecto",
            desc: "Carg� el plano del loteo",
            required: false,
            icon: LayoutDashboard,
            done: step2Done,
            guidance:
                "Sub� el plano del loteo en DXF, DWG, SVG, PDF o imagen. El sistema intenta detectar lotes y, si no puede, guarda una base visual usable.",
        },
        {
            id: "masterplan",
            num: 3,
            label: "Masterplan",
            desc: "Gesti�n del inventario y lotes",
            required: false,
            icon: Layers,
            done: step3Done,
            guidance:
                "Visualiz� el plano del loteo, gestion� etapas, manzanas y lotes. Este paso centraliza todo el inventario del proyecto.",
        },
        {
            id: "mapa",
            num: 4,
            label: "Mapa Interactivo",
            desc: "Posicion� el plano sobre el terreno",
            required: false,
            icon: Globe,
            done: step4Done,
            guidance:
                "Georreferenci� el proyecto en el mapa real. Calibr� el overlay del plano sobre el terreno para que los lotes queden ubicados correctamente.",
        },
        {
            id: "tour360",
            num: 5,
            label: "Galer�a de Im�genes",
            desc: "Tour 360, reales, render y avance",
            required: false,
            icon: Camera,
            done: step5Done,
            guidance:
                "Sub� im�genes 360, fotos reales, renders o avance de obra. El Tour 360 sigue funcionando igual y el resto del material se organiza por categor�as.",
        },
        {
            id: "comercial",
            num: 6,
            label: "Comercial",
            desc: "Pagos, documentaci�n y m�tricas",
            required: false,
            icon: DollarSign,
            done: step6Done,
            guidance:
                "Gestion� los pagos, archivos t�cnicos, documentaci�n legal y revis� las m�tricas de ventas del proyecto.",
        },
        {
            id: "crm",
            num: 7,
            label: "CRM / Gesti�n",
            desc: "Leads, reservas y oportunidades",
            required: false,
            icon: Users,
            done: step7Done,
            guidance:
                "Segu� los leads y reservas asociados a este proyecto. Gestion� el embudo comercial y las oportunidades de venta.",
        },
    ];

    const currentStepIdx = steps.findIndex((s) => s.id === activeTab);
    const activeStep = steps[currentStepIdx] ?? steps[0];
    const prevStep = currentStepIdx > 0 ? steps[currentStepIdx - 1] : null;
    const nextStep =
        currentStepIdx < steps.length - 1 ? steps[currentStepIdx + 1] : null;
    const isWorkspaceTab = activeTab === "mapa" || activeTab === "tour360";

    // Prepare Tour 360� markers for Paso 4 map (only lot-linked tours)
    const tours360ForMap = proyecto.tours
        .filter((t) => t.unidadId && (t.scenes as any[]).length > 0)
        .map((t) => ({
            tourId: t.id,
            nombre: t.nombre,
            unidadId: t.unidadId!,
            thumbnail: (t.scenes as any[])[0]?.imageUrl ?? undefined,
            sceneCount: (t.scenes as any[]).length,
            defaultSceneUrl: (t.scenes as any[])[0]?.imageUrl ?? undefined,
            defaultSceneId: (t.scenes as any[])[0]?.id ?? undefined,
            defaultSceneOverlay: (t.scenes as any[])[0]?.masterplanOverlay ?? null,
        }));

    return (
        <div className="animate-fade-in flex h-[calc(100dvh-6.5rem)] flex-col overflow-hidden lg:h-[calc(100dvh-7rem)]">

            {/* ── Project header: 3-column layout ── */}
            <div className="mb-4">
                {/* Row: Back � Title+Location � Progress */}
                <div className="flex items-center gap-3 mb-3">
                    {/* LEFT � back button, more prominent */}
                    <Link
                        href={backHref}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 bg-slate-100 dark:bg-slate-800 hover:bg-brand-500/10 dark:hover:bg-brand-500/15 px-3 py-1.5 rounded-lg transition-all shrink-0 border border-slate-200 dark:border-slate-700 hover:border-brand-500/30"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver a proyectos
                    </Link>

                    {/* CENTER � project name + location */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <h1 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[240px]">
                                {proyecto.nombre}
                            </h1>
                            {proyecto.isDemo && (
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 shrink-0">
                                    DEMO
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {proyecto.ubicacion && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {proyecto.ubicacion}
                                </span>
                            )}
                            {activeTab === "tour360" && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                                    � Sub� fotos 360� y posicionalas en el mapa desde "Im�genes"
                                </span>
                            )}
                        </div>
                    </div>

                    {/* RIGHT � progress indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-black text-slate-800 dark:text-white tabular-nums leading-tight">
                                {completedCount}<span className="text-slate-400 dark:text-slate-500 font-semibold text-xs">/7</span>
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight">completados</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="w-24 sm:w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${Math.round((completedCount / 7) * 100)}%`,
                                        background: "linear-gradient(90deg, #f97316 0%, #fb923c 100%)",
                                    }}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-brand-500 sm:hidden tabular-nums">
                                {completedCount}/7
                            </span>
                        </div>
                    </div>
                </div>

                {proyecto.isDemo && (
                    <p className="text-xs text-amber-500 font-medium mb-3 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        Proyecto temporal.{" "}
                        <Link href="/dashboard/developer/mi-perfil/kyc" className="underline font-bold ml-0.5">
                            Complet� tu KYC
                        </Link>{" "}
                        para hacerlo oficial.
                    </p>
                )}

                {/* ── Step bar with animated progress strip ── */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                    {/* Top progress strip */}
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-800">
                        <div
                            className="h-full transition-all duration-700 ease-out"
                            style={{
                                width: `${Math.round((completedCount / 7) * 100)}%`,
                                background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
                            }}
                        />
                    </div>
                    {/* Tab buttons */}
                    <div className="overflow-x-auto">
                        <div className="flex min-w-max divide-x divide-slate-200 dark:divide-slate-800">
                            {steps.map((step) => {
                                const isActive = activeTab === step.id;
                                return (
                                    <Link
                                        key={step.id}
                                        href={`?tab=${step.id}`}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 flex-1 justify-center",
                                            isActive
                                                ? "bg-brand-500 text-white shadow-inner"
                                                : step.done
                                                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                                : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0",
                                                isActive
                                                    ? "bg-white/25 text-white"
                                                    : step.done
                                                    ? "bg-emerald-500/20 text-emerald-500"
                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                            )}
                                        >
                                            {step.done && !isActive ? "✓" : step.num}
                                        </span>
                                        {step.label}
                                        {step.required && !step.done && !isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

                {/* Content area � full width */}
                <div className="w-full flex min-h-0 flex-1 flex-col overflow-hidden">
                    {/* Active step guidance banner � only on non-visual steps */}
                    {(activeTab === "info" || activeTab === "comercial" || activeTab === "crm") && (
                    <div className="flex items-center gap-3 p-3 bg-brand-500/5 border border-brand-500/15 rounded-xl mb-4">
                        <div className="p-1.5 bg-brand-500/10 rounded-lg shrink-0">
                            {(() => {
                                const Icon = activeStep.icon;
                                return <Icon className="w-4 h-4 text-brand-500" />;
                            })()}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-black text-brand-500 uppercase tracking-widest shrink-0">
                                Paso {activeStep.num} de 7
                            </span>
                            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                                {activeStep.label}
                            </h2>
                            {activeStep.done && (
                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Completado
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {activeStep.guidance}
                            </p>
                        </div>
                    </div>
                    )}

                    {/* Step content */}
                    <div
                        className={cn(
                            "animate-fade-in space-y-4 min-h-0 flex-1",
                            isWorkspaceTab
                                ? "flex flex-col overflow-hidden"
                                : "overflow-y-auto overscroll-contain pr-1"
                        )}
                    >

                        {/* ── PASO 1: INFORMACI�N GENERAL ── */}
                        {activeTab === "info" && (
                            <div className="space-y-4">
                                <div className="glass-card p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-slate-800 dark:text-white">
                                            Datos del Proyecto
                                        </h3>
                                        <Link
                                            href={`/dashboard/proyectos/${proyecto.id}/editar`}
                                            className="flex items-center gap-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-xl transition-all shadow-md shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Editar proyecto
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-5">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    Nombre
                                                </p>
                                                <p className="text-slate-800 dark:text-white font-semibold text-lg">
                                                    {proyecto.nombre}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    Ubicaci�n
                                                </p>
                                                <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                                    {proyecto.ubicacion || (
                                                        <span className="text-slate-400 italic">
                                                            No definida
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Tipo
                                                    </p>
                                                    <p className="text-slate-700 dark:text-slate-300 text-sm">
                                                        {proyecto.tipo}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Estado
                                                    </p>
                                                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                        {proyecto.estado}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    Coordenadas del mapa
                                                </p>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm font-mono">
                                                    {proyecto.mapCenterLat?.toFixed(5)},{" "}
                                                    {proyecto.mapCenterLng?.toFixed(5)} � zoom{" "}
                                                    {proyecto.mapZoom}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    Descripci�n
                                                </p>
                                                {proyecto.descripcion ? (
                                                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                        {proyecto.descripcion}
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-400 italic text-sm">
                                                        Sin descripci�n. Edit� el proyecto para agregar una.
                                                    </p>
                                                )}
                                            </div>
                                            {proyecto.invertible && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Configuraci�n de inversi�n
                                                    </p>
                                                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                                        <p>
                                                            Precio inversor:{" "}
                                                            <strong>
                                                                {proyecto.precioM2Inversor
                                                                    ? `${formatCurrency(Number(proyecto.precioM2Inversor))}/m²`
                                                                    : "No definido"}
                                                            </strong>
                                                        </p>
                                                        <p>
                                                            Precio mercado:{" "}
                                                            <strong>
                                                                {proyecto.precioM2Mercado
                                                                    ? `${formatCurrency(Number(proyecto.precioM2Mercado))}/m²`
                                                                    : "No definido"}
                                                            </strong>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    Leads registrados
                                                </p>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm">
                                                    {proyecto._count.leads} leads asociados
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {(!proyecto.descripcion || !proyecto.ubicacion) && (
                                    <Link
                                        href={`/dashboard/proyectos/${proyecto.id}/editar`}
                                        className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 hover:border-amber-500/40 transition-all group"
                                    >
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                Informaci�n incompleta
                                            </p>
                                            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                                                {!proyecto.ubicacion && "Falta la ubicaci�n del proyecto. "}
                                                {!proyecto.descripcion && "Falta la descripci�n. "}
                                                <span className="underline underline-offset-2 group-hover:text-amber-400 transition-colors">
                                                    Toc� ac� para completar estos campos ?
                                                </span>
                                            </p>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* ── PASO 2: PLANO ── */}
                        {activeTab === "blueprint" && (
                            <div className="animate-fade-in h-[calc(100vh-180px)] min-h-[640px]">
                                <BlueprintEngine proyectoId={proyecto.id} />
                            </div>
                        )}

                        {/* ── PASO 3: MASTERPLAN ── */}
                        {activeTab === "masterplan" && (
                            <div className="space-y-6">
                                {!step2Done && (
                                    <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                                Plano no cargado
                                            </p>
                                            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                                                Sub� el plano del proyecto en el{" "}
                                                <Link
                                                    href="?tab=blueprint"
                                                    className="underline font-bold"
                                                >
                                                    Paso 2 � Plano del Proyecto
                                                </Link>{" "}
                                                para verlo en el masterplan.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <ResizableContainer defaultHeight={720} minHeight={520} showFullscreenBtn={false}>
                                    <MasterplanViewer proyectoId={proyecto.id} modo="admin" />
                                </ResizableContainer>

                                {/* Inventario siempre accesible � no depende de etapas */}
                                <div className="glass-card p-6">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                        <Home className="w-5 h-5 text-brand-500" />
                                        Inventario
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                                        Edit� estados, precios y datos de cada lote. No necesit�s configurar etapas primero.
                                    </p>
                                    {total === 0 ? (
                                        <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Todav�a no hay unidades registradas. Carg� el plano del proyecto en el{" "}
                                                <Link href="?tab=blueprint" className="text-brand-500 font-semibold underline underline-offset-2">
                                                    Paso 2
                                                </Link>{" "}
                                                y sincroniz� para generar el inventario autom�ticamente.
                                            </p>
                                        </div>
                                    ) : (
                                        <InventarioClient proyectoId={proyecto.id} />
                                    )}
                                </div>

                                {/* Etapas despu�s del inventario */}
                                <EtapasManager
                                    proyectoId={proyecto.id}
                                    etapas={proyecto.etapas as any}
                                />
                            </div>
                        )}

                        {/* ── PASO 5: IM�GENES DEL PROYECTO ── */}
                        {activeTab === "tour360" && (
                            <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    <Tour360TabWrapper
                                        proyectoId={proyecto.id}
                                        tours={proyecto.tours || []}
                                        userRole={userRole}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── PASO 4: MAPA INTERACTIVO ── */}
                        {activeTab === "mapa" && (
                            <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden">
                                {!step3Done && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        Primero cre� los lotes en el{" "}
                                        <Link href="?tab=masterplan" className="underline font-bold">
                                            Paso 3 � Masterplan
                                        </Link>{" "}
                                        para verlos en el mapa.
                                    </div>
                                )}
                                <div className="min-h-0 flex-1 overflow-hidden">
                                    <div className="h-full min-h-0 w-full overflow-hidden">
                                        <MasterplanMap
                                            proyectoId={proyecto.id}
                                            modo="admin"
                                            centerLat={proyecto.mapCenterLat ?? undefined}
                                            centerLng={proyecto.mapCenterLng ?? undefined}
                                            mapZoom={proyecto.mapZoom ?? undefined}
                                            tours360={tours360ForMap}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 6: COMERCIAL ── */}
                        {activeTab === "comercial" && (
                            <div className="space-y-6">
                                {/* M�tricas */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <BarChart3 className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                M�tricas del Proyecto
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Resumen comercial del inventario.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        {[
                                            {
                                                label: "Total Lotes",
                                                value: total,
                                                color: "text-slate-800 dark:text-white",
                                                bg: "bg-slate-100 dark:bg-slate-800",
                                            },
                                            {
                                                label: "Disponibles",
                                                value: disponibles,
                                                color: "text-emerald-500",
                                                bg: "bg-emerald-500/10",
                                            },
                                            {
                                                label: "Reservados",
                                                value: reservadas,
                                                color: "text-amber-500",
                                                bg: "bg-amber-500/10",
                                            },
                                            {
                                                label: "Vendidos",
                                                value: vendidas,
                                                color: "text-rose-500",
                                                bg: "bg-rose-500/10",
                                            },
                                        ].map((m) => (
                                            <div
                                                key={m.label}
                                                className={cn(
                                                    "p-4 rounded-xl text-center",
                                                    m.bg
                                                )}
                                            >
                                                <p
                                                    className={cn(
                                                        "text-3xl font-black",
                                                        m.color
                                                    )}
                                                >
                                                    {m.value}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1 font-medium">
                                                    {m.label}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        {[
                                            {
                                                label: "Valor Total del Inventario",
                                                value: formatCurrency(valorTotal),
                                            },
                                            {
                                                label: "Monto Vendido",
                                                value: formatCurrency(valorVendido),
                                            },
                                            {
                                                label: "Monto Reservado",
                                                value: formatCurrency(valorReservado),
                                            },
                                        ].map((m) => (
                                            <div
                                                key={m.label}
                                                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                                            >
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    {m.label}
                                                </p>
                                                <p className="text-xl font-black text-slate-800 dark:text-white">
                                                    {m.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {total > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs text-slate-500">
                                                    Avance de ventas
                                                </span>
                                                <span className="text-xs font-bold text-brand-500">
                                                    {pctVendido}%
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all"
                                                    style={{ width: `${pctVendido}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                                                    Vendidos
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                                    Reservados
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                                    Disponibles
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Pagos */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <DollarSign className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Pagos
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Pagos y comprobantes asociados al proyecto.
                                            </p>
                                        </div>
                                    </div>
                                    <ProjectPaymentsTab
                                        proyectoId={proyecto.id}
                                        pagos={proyecto.pagos as any}
                                        userRole={userRole}
                                    />
                                </div>

                                {/* Archivos t�cnicos */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <Archive className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Archivos T�cnicos
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Planos, memorias y documentaci�n t�cnica p�blica.
                                            </p>
                                        </div>
                                    </div>
                                    <ProjectTechnicalFiles proyectoId={proyecto.id} />
                                </div>

                                {/* Documentaci�n */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <FileText className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Documentaci�n
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Permisos, contratos y documentaci�n legal del proyecto.
                                            </p>
                                        </div>
                                    </div>
                                    <ProjectDocsTab
                                        proyectoId={proyecto.id}
                                        docs={proyecto.documentacion || []}
                                        docStatus={proyecto.documentacionEstado || "PENDIENTE"}
                                        userRole={userRole}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── PASO 7: CRM / GESTI�N ── */}
                        {activeTab === "crm" && (
                            <div className="space-y-6">
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <Users className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Leads del Proyecto
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Oportunidades y consultas asociadas a este proyecto.
                                            </p>
                                        </div>
                                    </div>

                                    {proyecto._count.leads === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                                <Users className="w-7 h-7 text-slate-400" />
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                                Sin leads registrados
                                            </p>
                                            <p className="text-sm text-slate-400 mt-1 max-w-xs">
                                                Los leads aparecer�n aqu� cuando los compradores
                                                consulten por este proyecto.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 p-4 bg-brand-500/5 border border-brand-500/15 rounded-xl">
                                            <div className="text-center">
                                                <p className="text-3xl font-black text-brand-500">
                                                    {proyecto._count.leads}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    leads totales
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                    Gestion� los leads desde el CRM global
                                                </p>
                                                <Link
                                                    href="/dashboard/crm"
                                                    className="text-xs text-brand-500 font-bold underline underline-offset-2 mt-1 inline-block"
                                                >
                                                    Ir al CRM ?
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
                <ProjectStepsDock
                    prevStep={prevStep ? { id: prevStep.id, num: prevStep.num, label: prevStep.label } : null}
                    nextStep={nextStep ? { id: nextStep.id, num: nextStep.num, label: nextStep.label } : null}
                    className="mt-3 pb-1"
                />
        </div>
    );
}
