import { config as loadEnv } from "dotenv";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

loadEnv({ path: ".env.local", override: true });
loadEnv();
process.env.STORAGE_TYPE = "local";
(process.env as any).NODE_ENV = process.env.NODE_ENV || "development";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

import {
    parseBlueprintDXF,
    withBlueprintMeta,
    type BlueprintEmbeddedMeta,
} from "../lib/blueprint-utils";
import { uploadFile } from "../lib/storage";
const prisma = require("../lib/db").default as typeof import("../lib/db").default;

type ViewBox = { minX: number; minY: number; width: number; height: number };
type ManualLot = {
    numero: string;
    path: string;
    center: { x: number; y: number };
    area: number;
    frente: number;
    fondo: number;
    precio: number;
    internalId: number;
};

const ADMIN_EMAIL = "dany76162@gmail.com";
const DXF_PATH = "C:\\Users\\Usuario\\Downloads\\CAÑUELAS.dxf";
const PROJECT_ID = "canuelas-proj-20260402031334";
const PROJECT_SLUG = "barrio-canuelas-20260402031334";
const SCENE_IMAGE_URL = "/demo-360.jpg";

function parseViewBox(svg: string): ViewBox {
    const match = svg.match(/viewBox="([^"]+)"/i);
    if (!match?.[1]) {
        return { minX: 0, minY: 0, width: 1200, height: 800 };
    }

    const parts = match[1].trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        return { minX: 0, minY: 0, width: 1200, height: 800 };
    }

    return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
}

function buildRectPath(x: number, y: number, w: number, h: number) {
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

function createManualLots(viewBox: ViewBox): ManualLot[] {
    const cols = 4;
    const rows = 3;
    const marginX = viewBox.width * 0.18;
    const marginY = viewBox.height * 0.22;
    const usableW = viewBox.width * 0.56;
    const usableH = viewBox.height * 0.38;
    const gapX = usableW * 0.03;
    const gapY = usableH * 0.06;
    const lotW = (usableW - gapX * (cols - 1)) / cols;
    const lotH = (usableH - gapY * (rows - 1)) / rows;

    const lots: ManualLot[] = [];
    let n = 1;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = viewBox.minX + marginX + col * (lotW + gapX);
            const y = viewBox.minY + marginY + row * (lotH + gapY);
            lots.push({
                numero: `L${n}`,
                path: buildRectPath(x, y, lotW, lotH),
                center: { x: x + lotW / 2, y: y + lotH / 2 },
                area: Math.round((lotW * lotH) * 100) / 100,
                frente: Math.round(lotW * 100) / 100,
                fondo: Math.round(lotH * 100) / 100,
                precio: 18500 + row * 1200 + col * 900,
                internalId: n,
            });
            n++;
        }
    }

    return lots;
}

function buildManualMasterplanSvg(viewBox: ViewBox, lots: ManualLot[]) {
    const paths = lots
        .map(
            (lot) =>
                `<path d="${lot.path}" fill="rgba(16,185,129,0.18)" stroke="#10b981" stroke-width="${Math.max(
                    viewBox.width * 0.0012,
                    0.18
                )}" vector-effect="non-scaling-stroke" />`
        )
        .join("\n");

    const labels = lots
        .map((lot) => {
            const fontSize = Math.max(viewBox.width * 0.009, 0.42);
            const badgeW = Math.max(lot.numero.length * fontSize * 0.7, fontSize * 1.8);
            const badgeH = fontSize * 1.2;
            const rectX = lot.center.x - badgeW / 2;
            const rectY = lot.center.y - badgeH / 2;
            return `<g class="lot-label" pointer-events="none">
  <rect x="${rectX}" y="${rectY}" width="${badgeW}" height="${badgeH}" rx="${badgeH * 0.28}" fill="rgba(0,0,0,0.72)" />
  <text x="${lot.center.x}" y="${lot.center.y}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" fill="#ecfeff" font-family="Inter, sans-serif" font-weight="700">${lot.numero}</text>
</g>`;
        })
        .join("\n");

    return `<svg viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" xmlns="http://www.w3.org/2000/svg">
<rect x="${viewBox.minX}" y="${viewBox.minY}" width="${viewBox.width}" height="${viewBox.height}" fill="#0b1220" />
<g class="manual-lots">
${paths}
</g>
<g class="manual-labels">
${labels}
</g>
</svg>`;
}

async function cleanupProject(projectId: string) {
    const tours = await prisma.tour360.findMany({
        where: { proyectoId: projectId },
        select: { id: true },
    });
    const tourIds = tours.map((tour) => tour.id);

    const scenes = tourIds.length
        ? await prisma.tourScene.findMany({
              where: { tourId: { in: tourIds } },
              select: { id: true },
          })
        : [];
    const sceneIds = scenes.map((scene) => scene.id);

    const manzanas = await prisma.manzana.findMany({
        where: { etapa: { proyectoId: projectId } },
        select: { id: true },
    });
    const manzanaIds = manzanas.map((manzana) => manzana.id);

    const unidades = manzanaIds.length
        ? await prisma.unidad.findMany({
              where: { manzanaId: { in: manzanaIds } },
              select: { id: true },
          })
        : [];
    const unidadIds = unidades.map((unidad) => unidad.id);

    await prisma.$transaction([
        sceneIds.length
            ? prisma.hotspot.deleteMany({ where: { sceneId: { in: sceneIds } } })
            : prisma.hotspot.deleteMany({ where: { id: "__none__" } }),
        tourIds.length
            ? prisma.tourScene.deleteMany({ where: { tourId: { in: tourIds } } })
            : prisma.tourScene.deleteMany({ where: { id: "__none__" } }),
        prisma.tour360.deleteMany({ where: { proyectoId: projectId } }),
        prisma.imagenMapa.deleteMany({ where: { proyectoId: projectId } }),
        prisma.proyectoImagen.deleteMany({ where: { proyectoId: projectId } }),
        prisma.infraestructura.deleteMany({ where: { proyectoId: projectId } }),
        prisma.documentacion.deleteMany({ where: { proyectoId: projectId } }),
        prisma.inversion.deleteMany({ where: { proyectoId: projectId } }),
        prisma.pago.deleteMany({ where: { proyectoId: projectId } }),
        prisma.lead.deleteMany({ where: { proyectoId: projectId } }),
        prisma.proyectoUsuario.deleteMany({ where: { proyectoId: projectId } }),
        prisma.proyectoEstadoLog.deleteMany({ where: { proyectoId: projectId } }),
        prisma.projectFeatureFlags.deleteMany({ where: { projectId: projectId } }),
        unidadIds.length
            ? prisma.reserva.deleteMany({ where: { unidadId: { in: unidadIds } } })
            : prisma.reserva.deleteMany({ where: { id: "__none__" } }),
        unidadIds.length
            ? prisma.oportunidad.deleteMany({ where: { unidadId: { in: unidadIds } } })
            : prisma.oportunidad.deleteMany({ where: { id: "__none__" } }),
        unidadIds.length
            ? prisma.historialUnidad.deleteMany({ where: { unidadId: { in: unidadIds } } })
            : prisma.historialUnidad.deleteMany({ where: { id: "__none__" } }),
        manzanaIds.length
            ? prisma.unidad.deleteMany({ where: { manzanaId: { in: manzanaIds } } })
            : prisma.unidad.deleteMany({ where: { id: "__none__" } }),
        prisma.manzana.deleteMany({ where: { etapa: { proyectoId: projectId } } }),
        prisma.etapa.deleteMany({ where: { proyectoId: projectId } }),
        prisma.proyecto.deleteMany({ where: { id: projectId } }),
    ]);
}

async function main() {
    const admin = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
        select: { id: true, email: true, orgId: true },
    });

    if (!admin) {
        throw new Error(`No se encontró el admin ${ADMIN_EMAIL}`);
    }

    const existing = await prisma.proyecto.findUnique({
        where: { id: PROJECT_ID },
        select: { id: true },
    });

    if (existing) {
        await cleanupProject(PROJECT_ID);
    }

    const dxfBuffer = await readFile(DXF_PATH);
    const dxfString = dxfBuffer.toString("utf-8");
    const parsed = parseBlueprintDXF(dxfString);
    const viewBox = parseViewBox(parsed.svg);
    const manualLots = createManualLots(viewBox);
    const manualMasterplanSvg = buildManualMasterplanSvg(viewBox, manualLots);

    const originalUpload = await uploadFile({
        folder: `proyectos/${PROJECT_ID}/plans`,
        filename: "CAÑUELAS.dxf",
        contentType: "application/dxf",
        buffer: dxfBuffer,
    });

    const now = new Date();
    const blueprintMeta: BlueprintEmbeddedMeta = {
        sourceKind: "dxf",
        sourceName: "CAÑUELAS.dxf",
        sourceMime: "application/dxf",
        sourceUrl: originalUpload.url,
        processingMode: "source-only",
        warnings: [
            "DXF complejo: se guarda como base visual y fuente original.",
            "El inventario operativo se generó manualmente para este proyecto de prueba.",
        ],
        detectedPaths: parsed.paths.length,
        detectedLots: manualLots.length,
        savedAt: now.toISOString(),
    };

    const masterplanSVG = withBlueprintMeta(manualMasterplanSvg, blueprintMeta);

    const previewUpload = await uploadFile({
        folder: `proyectos/${PROJECT_ID}/plans`,
        filename: "canuelas-masterplan.svg",
        contentType: "image/svg+xml",
        buffer: Buffer.from(masterplanSVG, "utf-8"),
    });

    const overlayBounds: [[number, number], [number, number]] = [
        [-35.0555, -58.7695],
        [-35.0487, -58.7535],
    ];

    const galleryItemId = randomUUID();

    const proyecto = await prisma.proyecto.create({
        data: {
            id: PROJECT_ID,
            nombre: "Barrio Cañuelas",
            slug: PROJECT_SLUG,
            descripcion:
                "Desarrollo residencial en Cañuelas cargado desde DXF real, con base visual utilizable, mapa interactivo y tour 360 listos para operar.",
            ubicacion: "Cañuelas, Buenos Aires, Argentina",
            estado: "EN_VENTA",
            tipo: "URBANIZACION",
            imagenPortada: previewUpload.url,
            masterplanSVG,
            mapCenterLat: -35.0525,
            mapCenterLng: -58.7612,
            mapZoom: 16,
            overlayUrl: previewUpload.url,
            overlayBounds: JSON.stringify(overlayBounds),
            overlayRotation: 0,
            invertible: true,
            precioM2Inversor: "95.00",
            precioM2Mercado: "135.00",
            metaM2Objetivo: "12000.00",
            fechaLimiteFondeo: new Date("2026-12-31T23:59:59.000Z"),
            documentacionEstado: "APROBADO",
            creadoPorId: admin.id,
            orgId: admin.orgId ?? null,
            visibilityStatus: "PUBLICADO",
            estadoValidacion: "APROBADO",
            puedeCaptarLeads: true,
            puedePublicarse: true,
            puedeReservarse: true,
            aiKnowledgeBase:
                "Proyecto residencial de ejemplo basado en el plano CAÑUELAS. Usa base visual del masterplan, overlay georreferenciado y recorrido 360 operativo.",
            aiSystemPrompt:
                "Respondé como asesor comercial del proyecto Barrio Cañuelas. Priorizá claridad comercial, disponibilidad de lotes y guía para reserva.",
            tour360Url: `/proyectos/${PROJECT_SLUG}/tour360`,
            planGallery: JSON.stringify([
                {
                    id: galleryItemId,
                    nombre: "Plano base CAÑUELAS",
                    imageUrl: previewUpload.url,
                    tipo: "catastral",
                    uploadedAt: now.toISOString(),
                },
            ]),
        },
    });

    if (admin.orgId) {
        await prisma.proyectoUsuario.create({
            data: {
                proyectoId: proyecto.id,
                userId: admin.id,
                orgId: admin.orgId,
                tipoRelacion: "OWNER",
                estadoRelacion: "ACTIVA",
                permisoEditarProyecto: true,
                permisoSubirDocumentacion: true,
                permisoVerLeadsGlobales: true,
                permisoVerMetricasGlobales: true,
            },
        });
    }

    const etapaId = "canuelas-etapa-1";
    const manzanaId = "canuelas-manzana-a";

    await prisma.etapa.create({
        data: {
            id: etapaId,
            proyectoId: proyecto.id,
            nombre: "Etapa 1",
            orden: 1,
            estado: "ACTIVA",
        },
    });

    await prisma.manzana.create({
        data: {
            id: manzanaId,
            etapaId,
            nombre: "Manzana A",
        },
    });

    for (const lot of manualLots) {
        await prisma.unidad.create({
            data: {
                id: `canuelas-unidad-${lot.internalId}`,
                manzanaId,
                numero: lot.numero,
                tipo: "LOTE",
                superficie: lot.area,
                frente: lot.frente,
                fondo: lot.fondo,
                precio: lot.precio,
                moneda: "USD",
                estado: "DISPONIBLE",
                coordenadasMasterplan: JSON.stringify({
                    path: lot.path,
                    center: lot.center,
                    internalId: lot.internalId,
                    lotLabel: lot.numero,
                }),
            },
        });
    }

    const unidadDemo = await prisma.unidad.findFirst({
        where: { manzanaId },
        select: { id: true, numero: true },
        orderBy: { numero: "asc" },
    });

    await prisma.imagenMapa.create({
        data: {
            id: "canuelas-mapa-360-1",
            proyectoId: proyecto.id,
            unidadId: unidadDemo?.id ?? null,
            url: SCENE_IMAGE_URL,
            tipo: "360",
            titulo: "Vista general del proyecto",
            lat: -35.0525,
            lng: -58.7612,
            orden: 0,
            altitudM: 500,
            imageHeading: 0,
            latOffset: 0,
            lngOffset: 0,
            planRotation: 0,
            planScale: 1,
        },
    });

    await prisma.tour360.create({
        data: {
            id: "canuelas-tour-general",
            proyectoId: proyecto.id,
            unidadId: unidadDemo?.id ?? null,
            nombre: "Tour General",
            estado: "APROBADO",
            scenes: {
                create: [
                    {
                        id: "canuelas-tour-scene-1",
                        title: "Vista principal",
                        imageUrl: SCENE_IMAGE_URL,
                        isDefault: true,
                        order: 0,
                        category: "RAW",
                        masterplanOverlay: {
                            mode: "geo-calibrated",
                            imageUrl: previewUpload.url,
                            selectedPlanId: galleryItemId,
                            opacity: 0.55,
                            isVisible: true,
                            altitudM: 500,
                            imageHeading: 0,
                            latOffset: 0,
                            lngOffset: 0,
                            planRotation: 0,
                            planScale: 1,
                        },
                    },
                ],
            },
        },
    });

    await prisma.documentacion.create({
        data: {
            id: "canuelas-doc-cad",
            proyectoId: proyecto.id,
            tipo: "PLANO_CAD",
            archivoUrl: originalUpload.url,
            estado: "APROBADO",
            comentarios: "Plano CAÑUELAS cargado como base documental del proyecto.",
            usuarioId: admin.id,
        },
    });

    await prisma.pago.create({
        data: {
            id: "canuelas-pago-publicacion",
            usuarioId: admin.id,
            proyectoId: proyecto.id,
            monto: "1500.00",
            moneda: "USD",
            concepto: "Alta inicial del proyecto",
            estado: "APROBADO",
            tipo: "PUBLICACION",
        },
    });

    await prisma.lead.create({
        data: {
            id: "canuelas-lead-demo",
            nombre: "Lead Demo Cañuelas",
            email: "lead.canuelas@seventoop.local",
            telefono: "+5491123456789",
            origen: "WEB",
            proyectoId: proyecto.id,
            unidadInteres: unidadDemo?.numero ?? "L1",
            estado: "NUEVO",
            mensaje: "Consulta inicial generada para completar el flujo del proyecto.",
            notas: "Lead creado automáticamente para dejar CRM/Gestión operativo.",
            canalOrigen: "LANDING",
            orgId: admin.orgId ?? null,
        },
    });

    console.log(
        JSON.stringify(
            {
                ok: true,
                proyectoId: proyecto.id,
                slug: proyecto.slug,
                sourceUrl: originalUpload.url,
                previewUrl: previewUpload.url,
                masterplanMode: blueprintMeta.processingMode,
                unitCount: manualLots.length,
                publicUrl: `/proyectos/${proyecto.slug}`,
            },
            null,
            2
        )
    );
}

main()
    .catch((error) => {
        console.error("[create-canuelas-project] error");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
