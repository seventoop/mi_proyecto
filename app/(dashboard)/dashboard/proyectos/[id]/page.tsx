import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectAccess, ProjectPermission } from "@/lib/project-access";
import ProjectPublicWorkspace from "@/components/dashboard/proyectos/project-public-workspace";
import { getProjectShowcasePayload } from "@/lib/project-showcase";

interface PageProps {
    params: { id: string };
}

function getManagementPath(projectId: string, role: string) {
    if (role === "ADMIN" || role === "SUPERADMIN") {
        return `/dashboard/admin/proyectos/${projectId}`;
    }

    if (role === "DESARROLLADOR" || role === "VENDEDOR") {
        return `/dashboard/developer/proyectos/${projectId}`;
    }

    return null;
}

export default async function ProyectoWorkspacePage({ params }: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return <div className="p-20 text-center text-white">No autorizado</div>;
    }

    let context;
    try {
        context = await getProjectAccess(session.user as any, params.id);
    } catch {
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Proyecto no encontrado</h1>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-brand-500">
                    Volver a proyectos
                </Link>
            </div>
        );
    }

<<<<<<< HEAD
    const userId = session?.user?.id;
    const canAccess = userRole === "ADMIN" || userRole === "DESARROLLADOR" || proyecto.creadoPorId === userId;

    if (!canAccess) {
=======
    const payload = await getProjectShowcasePayload({
        slugOrId: params.id,
        includeUnpublished: true,
    });

    if (!payload) {
>>>>>>> 61aeba5 (feat: separate project viewing from editing workspace)
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Proyecto no encontrado</h1>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-brand-500">
                    Volver a proyectos
                </Link>
            </div>
        );
    }

<<<<<<< HEAD
    const canEdit = canAccess;

    if (viewMode === "editar" && !canEdit) {
        viewMode = "vista";
    }

    if (viewMode === "vista") {
        const fallbackImage = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop";

        const toNumber = (v: unknown): number | null => {
            if (v == null) return null;
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };
        const getMinPositive = (vals: Array<number | null | undefined>): number | null => {
            const f = vals.filter((v): v is number => typeof v === "number" && v > 0);
            return f.length ? Math.min(...f) : null;
        };
        const getMaxPositive = (vals: Array<number | null | undefined>): number | null => {
            const f = vals.filter((v): v is number => typeof v === "number" && v > 0);
            return f.length ? Math.max(...f) : null;
        };

        const principalImage =
            proyecto.imagenes?.find((i: any) => i.esPrincipal)?.url ||
            (proyecto as any).imagenPortada ||
            fallbackImage;

        const units = proyecto.etapas.flatMap((stage: any) =>
            stage.manzanas.flatMap((block: any) =>
                block.unidades.map((unit: any) => ({
                    ...unit,
                    superficie: toNumber(unit.superficie),
                    precio: toNumber(unit.precio),
                }))
            )
        );

        const totalUnits = units.length;
        const availableUnits = units.filter((u: any) => u.estado === "DISPONIBLE").length;
        const reservedUnits = units.filter((u: any) => u.estado === "RESERVADA").length;
        const soldUnits = units.filter((u: any) => u.estado === "VENDIDA").length;
        const soldPct = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : 0;

        const positivePrices = units.map((u: any) => u.precio);
        const positiveSurfaces = units.map((u: any) => u.superficie);
        const validPrices = positivePrices.filter((v: any): v is number => typeof v === "number" && v > 0);
        const avgTicket = validPrices.length > 0
            ? Math.round(validPrices.reduce((s: number, v: number) => s + v, 0) / validPrices.length)
            : null;

        const inventoryPreview = [...units]
            .sort((a: any, b: any) => {
                const aA = a.estado === "DISPONIBLE" ? 0 : 1;
                const bA = b.estado === "DISPONIBLE" ? 0 : 1;
                if (aA !== bA) return aA - bA;
                return (a.precio || 0) - (b.precio || 0);
            })
            .slice(0, 4)
            .map((u: any) => ({
                id: u.id,
                numero: u.numero,
                estado: u.estado,
                superficie: u.superficie,
                precio: u.precio,
                moneda: u.moneda,
                frente: toNumber(u.frente),
                fondo: toNumber(u.fondo),
                esEsquina: u.esEsquina,
                orientacion: u.orientacion,
            }));

        const showcaseData = {
            id: proyecto.id,
            slug: (proyecto as any).slug || proyecto.id,
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            ubicacion: proyecto.ubicacion,
            tipo: proyecto.tipo,
            estado: proyecto.estado,
            imageUrl: principalImage,
            imageAlt: proyecto.nombre,
            imageCount: proyecto.imagenes?.length || 0,
            mapCenterLat: proyecto.mapCenterLat,
            mapCenterLng: proyecto.mapCenterLng,
            mapZoom: proyecto.mapZoom,
            masterplanAvailable: Boolean((proyecto as any).masterplanSVG) || totalUnits > 0,
            leadCaptureEnabled: (proyecto as any).puedeCaptarLeads ?? false,
            reservationEnabled: (proyecto as any).puedeReservarse ?? false,
            documentationStatus: (proyecto as any).documentacionEstado || "PENDIENTE",
            organizationName: (proyecto as any).organization?.nombre || null,
            stats: {
                totalUnits,
                availableUnits,
                reservedUnits,
                soldUnits,
                soldPct,
                avgTicket,
                minPrice: getMinPositive(positivePrices) ?? toNumber((proyecto as any).precioM2Mercado),
                maxPrice: getMaxPositive(positivePrices),
                minSurface: getMinPositive(positiveSurfaces),
                maxSurface: getMaxPositive(positiveSurfaces),
            },
            inventoryPreview,
            images: proyecto.imagenes || [],
            tours: (proyecto.tours || []).map((tour: any) => ({
                id: tour.id,
                nombre: tour.nombre,
                sceneCount: tour.scenes?.length || 0,
                previewImages: (tour.scenes || [])
                    .map((s: any) => s.thumbnailUrl || s.imageUrl)
                    .filter(Boolean)
                    .slice(0, 4),
            })),
            infrastructures: proyecto.infraestructuras || [],
            stages: proyecto.etapas.map((stage: any) => ({
                id: stage.id,
                nombre: stage.nombre,
                estado: stage.estado,
                orden: stage.orden,
                unitCount: stage.manzanas.reduce((s: number, b: any) => s + b.unidades.length, 0),
                availableCount: stage.manzanas.reduce(
                    (s: number, b: any) => s + b.unidades.filter((u: any) => u.estado === "DISPONIBLE").length, 0
                ),
            })),
            documents: [
                ...(proyecto.documentacion || []).map((d: any) => ({
                    id: d.id,
                    title: d.tipo,
                    url: d.archivoUrl,
                    type: d.tipo,
                    source: "documentacion",
                })),
                ...(proyecto.proyecto_archivos || []).map((f: any) => ({
                    id: f.id,
                    title: f.nombre,
                    url: f.url,
                    type: f.tipo,
                    source: "archivo",
                })),
            ],
            testimonials: (proyecto.testimonios || []).map((t: any) => ({
                id: t.id,
                author: t.autorNombre,
                role: t.autorTipo,
                text: t.texto,
                rating: t.rating || 5,
                mediaUrl: t.mediaUrl,
            })),
            relatedProjects: [],
        };

        return (
            <ProjectDetailShowcase
                project={showcaseData}
                mode="dashboard"
                dashboardContext={{
                    projectId: proyecto.id,
                    userRole,
                    visibilityStatus: (proyecto as any).visibilityStatus || "BORRADOR",
                    canEdit,
                    backUrl: "/dashboard/proyectos",
                }}
            />
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
    const step5Done = (proyecto._count as any).imagenesMapa > 0;
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
            label: "Tour 360",
            desc: "Fotos y 360° geoposicionados",
            required: false,
            icon: Camera,
            done: step5Done,
            guidance:
                "Subí fotos, panorámicas o imágenes 360° y posicionálas en el mapa. Podés vincular cada imagen a un lote específico.",
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

    // Prepare Tour 360° markers for Paso 4 map (only lot-linked tours)
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
=======
    const role = (session.user as any).role as string;
    const canEditContextually = context.can(ProjectPermission.EDITAR_PROYECTO);
    const canConfigure = canEditContextually;
    const managementPath = getManagementPath(payload.editorSnapshot.id, role);
    const publicPath = `/proyectos/${payload.project.slug}`;
>>>>>>> 61aeba5 (feat: separate project viewing from editing workspace)

    return (
        <ProjectPublicWorkspace
            project={payload.project}
            editorSnapshot={payload.editorSnapshot}
            publicPath={publicPath}
            managementPath={managementPath}
            canEditContextually={canEditContextually}
            canConfigure={canConfigure}
            roleLabel={role}
        />
    );
}
