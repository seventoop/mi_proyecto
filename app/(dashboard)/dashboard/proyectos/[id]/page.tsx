import prisma from "@/lib/db";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import BlueprintEngine from "@/components/masterplan/blueprint-engine";
import {
    ArrowLeft, Building2, MapPin, FileText, BarChart3, Layers, Home,
    Globe, DollarSign, Archive, AlertCircle, LayoutDashboard,
    CheckCircle2, Info, ChevronRight, Camera, Edit3, Users,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";
import InventarioServer from "@/components/dashboard/proyectos/inventario-server";

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

    const proyecto = await prisma.proyecto.findUnique({
        where: { id: params.id },
        include: {
            etapas: {
                include: {
                    manzanas: {
                        include: { unidades: true },
                    },
                },
                orderBy: { orden: "asc" },
            },
            pagos: true,
            documentacion: true,
            tours: true,
            _count: { select: { leads: true } },
        },
    });

    if (!proyecto) {
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold">Proyecto no encontrado</h1>
                <Link href="/dashboard/proyectos" className="text-brand-500 mt-4 block">
                    Volver
                </Link>
            </div>
        );
    }

    const userId = session?.user?.id;
    if (userRole !== "ADMIN" && proyecto.creadoPorId !== userId) {
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
                    href="/dashboard/proyectos"
                    className="text-brand-500 mt-6 inline-block font-medium"
                >
                    Volver a mis proyectos
                </Link>
            </div>
        );
    }

    // Compute stats
    let total = 0, disponibles = 0, reservadas = 0, vendidas = 0;
    let valorTotal = 0, valorVendido = 0, valorReservado = 0;

    proyecto.etapas.forEach((etapa) => {
        etapa.manzanas.forEach((manzana) => {
            manzana.unidades.forEach((u) => {
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

    const pctVendido =
        total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0;

    // Step completion
    const step1Done = !!(proyecto.nombre && proyecto.ubicacion && proyecto.descripcion);
    const step2Done = !!proyecto.masterplanSVG;
    const step3Done = total > 0;
    const step4Done = !!proyecto.overlayBounds;
    const step5Done = proyecto.tours.length > 0;
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
            label: "Información General",
            desc: "Datos básicos del proyecto",
            required: true,
            icon: FileText,
            done: step1Done,
            guidance:
                "Completá los datos del proyecto: nombre, ubicación y descripción. Estos campos son obligatorios para avanzar.",
        },
        {
            id: "blueprint",
            num: 2,
            label: "Plano del Proyecto",
            desc: "Cargá el DXF o SVG del loteo",
            required: false,
            icon: LayoutDashboard,
            done: step2Done,
            guidance:
                "Subí el plano del loteo en formato DXF o SVG. Podés saltearlo por ahora y volver más adelante cuando tengas el archivo.",
        },
        {
            id: "masterplan",
            num: 3,
            label: "Masterplan",
            desc: "Gestión del inventario y lotes",
            required: false,
            icon: Layers,
            done: step3Done,
            guidance:
                "Visualizá el plano del loteo, gestioná etapas, manzanas y lotes. Este paso centraliza todo el inventario del proyecto.",
        },
        {
            id: "mapa",
            num: 4,
            label: "Mapa Interactivo",
            desc: "Posicioná el plano sobre el terreno",
            required: false,
            icon: Globe,
            done: step4Done,
            guidance:
                "Georreferenciá el proyecto en el mapa real. Calibrá el overlay del plano sobre el terreno para que los lotes queden ubicados correctamente.",
        },
        {
            id: "tour360",
            num: 5,
            label: "Tour 360°",
            desc: "Recorrido virtual del loteo",
            required: false,
            icon: Camera,
            done: step5Done,
            guidance:
                "Subí las imágenes panorámicas 360° para el recorrido virtual. Podés continuar sin este paso y cargarlo más adelante.",
        },
        {
            id: "comercial",
            num: 6,
            label: "Comercial",
            desc: "Pagos, documentación y métricas",
            required: false,
            icon: DollarSign,
            done: step6Done,
            guidance:
                "Gestioná los pagos, archivos técnicos, documentación legal y revisá las métricas de ventas del proyecto.",
        },
        {
            id: "crm",
            num: 7,
            label: "CRM / Gestión",
            desc: "Leads, reservas y oportunidades",
            required: false,
            icon: Users,
            done: step7Done,
            guidance:
                "Seguí los leads y reservas asociados a este proyecto. Gestioná el embudo comercial y las oportunidades de venta.",
        },
    ];

    const currentStepIdx = steps.findIndex((s) => s.id === activeTab);
    const activeStep = steps[currentStepIdx] ?? steps[0];
    const prevStep = currentStepIdx > 0 ? steps[currentStepIdx - 1] : null;
    const nextStep =
        currentStepIdx < steps.length - 1 ? steps[currentStepIdx + 1] : null;

    return (
        <div className="animate-fade-in pb-16">
            {/* Back */}
            <Link
                href="/dashboard/proyectos"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-brand-500 transition-colors mb-5"
            >
                <ArrowLeft className="w-4 h-4" />
                Volver a Proyectos
            </Link>

            {/* Project header */}
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/30 flex items-center justify-center shrink-0">
                        <Building2 className="w-7 h-7 text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            {proyecto.nombre}
                        </h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {proyecto.ubicacion && (
                                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {proyecto.ubicacion}
                                </span>
                            )}
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                                {proyecto.estado}
                            </span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {proyecto.tipo}
                            </span>
                            {proyecto.isDemo && (
                                <span className="text-xs font-black uppercase tracking-widest text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-500/20">
                                    DEMO 48h
                                </span>
                            )}
                        </div>
                        {proyecto.isDemo && (
                            <p className="text-xs text-amber-500 font-bold mt-1.5 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Proyecto temporal.{" "}
                                <Link
                                    href="/dashboard/developer/mi-perfil/kyc"
                                    className="underline"
                                >
                                    Completá tu KYC
                                </Link>{" "}
                                para hacerlo oficial.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress bar — 7 segmentos discretos */}
            <div className="glass-card p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Configuración del proyecto
                    </span>
                    <span className={cn(
                        "text-sm font-bold",
                        completedCount === 7 ? "text-emerald-500" : "text-brand-500"
                    )}>
                        {completedCount} / 7 pasos completados
                    </span>
                </div>

                {/* Segmented bar */}
                <div className="flex gap-1.5">
                    {stepsCompletion.map((done, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "flex-1 h-3 rounded-full transition-all duration-300",
                                done
                                    ? "bg-brand-500 shadow-sm shadow-brand-500/40"
                                    : "bg-slate-200 dark:bg-slate-700"
                            )}
                        />
                    ))}
                </div>

                <p className="text-xs text-slate-500 mt-2">
                    {completedCount === 7
                        ? "✅ Proyecto completamente configurado y listo para publicar."
                        : completedCount === 0
                        ? "Completá los pasos para tener el proyecto publicado y visible."
                        : `${7 - completedCount} paso${7 - completedCount !== 1 ? "s" : ""} restante${7 - completedCount !== 1 ? "s" : ""} para completar la configuración.`}
                </p>
            </div>

            {/* Mobile step tabs */}
            <div className="lg:hidden overflow-x-auto mb-5 -mx-4 px-4">
                <div className="flex gap-2 pb-1 min-w-max">
                    {steps.map((step) => {
                        const isActive = activeTab === step.id;
                        return (
                            <Link
                                key={step.id}
                                href={`?tab=${step.id}`}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                                    isActive
                                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                )}
                            >
                                <span
                                    className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                        isActive
                                            ? "bg-white/20"
                                            : step.done
                                            ? "bg-emerald-500/20 text-emerald-500"
                                            : "bg-slate-200 dark:bg-slate-700"
                                    )}
                                >
                                    {step.done && !isActive ? "✓" : step.num}
                                </span>
                                {step.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Main layout */}
            <div className="flex gap-6 items-start">
                {/* Desktop stepper sidebar */}
                <nav className="hidden lg:flex flex-col gap-1 w-64 shrink-0 sticky top-6">
                    {steps.map((step, idx) => {
                        const isActive = activeTab === step.id;
                        const Icon = step.icon;
                        return (
                            <div key={step.id} className="relative">
                                <Link
                                    href={`?tab=${step.id}`}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200",
                                        isActive
                                            ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    )}
                                >
                                    {/* Status indicator */}
                                    <div
                                        className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                            isActive
                                                ? "bg-white/20 text-white"
                                                : step.done
                                                ? "bg-emerald-500/15 text-emerald-500"
                                                : "bg-slate-100 dark:bg-slate-700/60 text-slate-500"
                                        )}
                                    >
                                        {step.done && !isActive ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            step.num
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={cn(
                                                "text-xs font-bold truncate",
                                                isActive ? "text-white" : ""
                                            )}
                                        >
                                            {step.label}
                                        </p>
                                        <p
                                            className={cn(
                                                "text-[10px] truncate mt-0.5",
                                                isActive
                                                    ? "text-white/65"
                                                    : "text-slate-400"
                                            )}
                                        >
                                            {step.desc}
                                        </p>
                                    </div>

                                    {step.required && !step.done && (
                                        <span
                                            className={cn(
                                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0",
                                                isActive
                                                    ? "bg-white/20 text-white"
                                                    : "bg-rose-500/10 text-rose-500"
                                            )}
                                        >
                                            REQ
                                        </span>
                                    )}
                                    {step.done && (
                                        <span
                                            className={cn(
                                                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0",
                                                isActive
                                                    ? "bg-white/20 text-white"
                                                    : "bg-emerald-500/10 text-emerald-500"
                                            )}
                                        >
                                            LISTO
                                        </span>
                                    )}
                                </Link>

                                {/* Connector */}
                                {idx < steps.length - 1 && (
                                    <div className="absolute bottom-0 left-[1.625rem] w-px h-1 bg-slate-200 dark:bg-slate-700/60" />
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                    {/* Active step guidance banner — hidden on blueprint tab to maximise viewer space */}
                    <div className={cn("flex items-start gap-3 p-4 bg-brand-500/5 border border-brand-500/15 rounded-2xl mb-5", activeTab === "blueprint" && "hidden")}>
                        <div className="p-2 bg-brand-500/10 rounded-xl shrink-0">
                            {(() => {
                                const Icon = activeStep.icon;
                                return <Icon className="w-5 h-5 text-brand-500" />;
                            })()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="text-xs font-black text-brand-500 uppercase tracking-widest">
                                    Paso {activeStep.num} de 7
                                </span>
                                {!activeStep.required && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                        Opcional
                                    </span>
                                )}
                                {activeStep.done && (
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Completado
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                {activeStep.label}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                {activeStep.guidance}
                            </p>
                        </div>
                    </div>

                    {/* Step content */}
                    <div className="animate-fade-in space-y-4">

                        {/* ── PASO 1: INFORMACIÓN GENERAL ── */}
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
                                                    Ubicación
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
                                                    {proyecto.mapCenterLng?.toFixed(5)} · zoom{" "}
                                                    {proyecto.mapZoom}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                    Descripción
                                                </p>
                                                {proyecto.descripcion ? (
                                                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                        {proyecto.descripcion}
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-400 italic text-sm">
                                                        Sin descripción. Editá el proyecto para agregar una.
                                                    </p>
                                                )}
                                            </div>
                                            {proyecto.invertible && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Configuración de inversión
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
                                                Información incompleta
                                            </p>
                                            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                                                {!proyecto.ubicacion && "Falta la ubicación del proyecto. "}
                                                {!proyecto.descripcion && "Falta la descripción. "}
                                                <span className="underline underline-offset-2 group-hover:text-amber-400 transition-colors">
                                                    Tocá acá para completar estos campos →
                                                </span>
                                            </p>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* ── PASO 2: PLANO ── */}
                        {activeTab === "blueprint" && (
                            <div className="animate-fade-in h-[calc(100vh-220px)] min-h-[600px]">
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
                                                Subí el plano DXF en el{" "}
                                                <Link
                                                    href="?tab=blueprint"
                                                    className="underline font-bold"
                                                >
                                                    Paso 2 — Plano del Proyecto
                                                </Link>{" "}
                                                para verlo en el masterplan.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <ResizableContainer defaultHeight={620} minHeight={420}>
                                    <MasterplanViewer proyectoId={proyecto.id} modo="admin" />
                                </ResizableContainer>

                                <EtapasManager
                                    proyectoId={proyecto.id}
                                    etapas={proyecto.etapas as any}
                                />

                                {total > 0 && (
                                    <div className="glass-card p-6">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                                            <Home className="w-5 h-5 text-brand-500" />
                                            Inventario completo
                                        </h3>
                                        <InventarioServer proyectoId={proyecto.id} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PASO 5: TOUR 360 ── */}
                        {activeTab === "tour360" && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                                    <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                                        <p>
                                            <strong className="text-slate-800 dark:text-slate-200">
                                                Formatos:
                                            </strong>{" "}
                                            JPG, PNG, WebP — imágenes equirectangulares 360°.
                                        </p>
                                        <p>
                                            <strong className="text-slate-800 dark:text-slate-200">
                                                Resolución recomendada:
                                            </strong>{" "}
                                            8000×4000 px o superior.{" "}
                                            <strong className="text-slate-800 dark:text-slate-200">
                                                Peso máximo:
                                            </strong>{" "}
                                            50 MB por imagen.
                                        </p>
                                        <p>
                                            <strong className="text-slate-800 dark:text-slate-200">
                                                Cantidad recomendada:
                                            </strong>{" "}
                                            entre 5 y 20 escenas para un recorrido completo.
                                        </p>
                                        <p className="text-slate-400">
                                            Podés continuar sin el Tour 360° y cargarlo más adelante.
                                        </p>
                                    </div>
                                </div>
                                <Tour360TabWrapper
                                    proyectoId={proyecto.id}
                                    tours={proyecto.tours || []}
                                    userRole={userRole}
                                />
                            </div>
                        )}

                        {/* ── PASO 4: MAPA INTERACTIVO ── */}
                        {activeTab === "mapa" && (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm">
                                    <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                                        <p>
                                            <strong className="text-slate-800 dark:text-slate-200">
                                                Mapa interactivo:
                                            </strong>{" "}
                                            Georreferenciá el proyecto en el mapa real. Calibrá el
                                            overlay del plano sobre el terreno para que los lotes
                                            queden ubicados correctamente.
                                        </p>
                                        {!step3Done && (
                                            <p className="text-amber-500 font-medium">
                                                ⚠ Primero creá los lotes en el{" "}
                                                <Link
                                                    href="?tab=masterplan"
                                                    className="underline font-bold"
                                                >
                                                    Paso 3 — Masterplan
                                                </Link>{" "}
                                                para verlos en el mapa.
                                            </p>
                                        )}
                                        {!step5Done && (
                                            <p className="text-amber-500 font-medium">
                                                ⚠ Cargá el Tour 360° en el{" "}
                                                <Link
                                                    href="?tab=tour360"
                                                    className="underline font-bold"
                                                >
                                                    Paso 5
                                                </Link>{" "}
                                                para conectarlo al mapa.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <ResizableContainer defaultHeight={580} minHeight={400}>
                                    <MasterplanMap proyectoId={proyecto.id} modo="admin" />
                                </ResizableContainer>
                            </div>
                        )}

                        {/* ── PASO 6: COMERCIAL ── */}
                        {activeTab === "comercial" && (
                            <div className="space-y-6">
                                {/* Métricas */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <BarChart3 className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Métricas del Proyecto
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

                                {/* Archivos técnicos */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <Archive className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Archivos Técnicos
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Planos, memorias y documentación técnica pública.
                                            </p>
                                        </div>
                                    </div>
                                    <ProjectTechnicalFiles proyectoId={proyecto.id} />
                                </div>

                                {/* Documentación */}
                                <div className="glass-card p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2.5 bg-brand-500/10 rounded-xl">
                                            <FileText className="w-5 h-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white">
                                                Documentación
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Permisos, contratos y documentación legal del proyecto.
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

                        {/* ── PASO 7: CRM / GESTIÓN ── */}
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
                                                Los leads aparecerán aquí cuando los compradores
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
                                                    Gestioná los leads desde el CRM global
                                                </p>
                                                <Link
                                                    href="/dashboard/crm"
                                                    className="text-xs text-brand-500 font-bold underline underline-offset-2 mt-1 inline-block"
                                                >
                                                    Ir al CRM →
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step navigation footer */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                        {prevStep ? (
                            <Link
                                href={`?tab=${prevStep.id}`}
                                className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-500 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Paso {prevStep.num}: {prevStep.label}
                            </Link>
                        ) : (
                            <div />
                        )}
                        {nextStep ? (
                            <Link
                                href={`?tab=${nextStep.id}`}
                                className="flex items-center gap-2 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-brand-500/20"
                            >
                                Paso {nextStep.num}: {nextStep.label}
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <span className="text-sm text-emerald-500 font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                Todos los pasos revisados
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats summary — bottom */}
            <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Resumen del inventario
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                        {
                            label: "Total",
                            value: total,
                            color: "text-slate-700 dark:text-white",
                        },
                        { label: "Disponibles", value: disponibles, color: "text-emerald-500" },
                        { label: "Reservados", value: reservadas, color: "text-amber-500" },
                        { label: "Vendidos", value: vendidas, color: "text-rose-500" },
                        {
                            label: "Valor Total",
                            value: formatCurrency(valorTotal),
                            color: "text-slate-700 dark:text-white",
                        },
                        {
                            label: "Vendido",
                            value: formatCurrency(valorVendido),
                            color: "text-emerald-500",
                        },
                        { label: "Avance", value: `${pctVendido}%`, color: "text-brand-400" },
                    ].map((s) => (
                        <div key={s.label} className="glass-card p-3 text-center">
                            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
