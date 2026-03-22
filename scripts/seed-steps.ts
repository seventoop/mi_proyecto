/**
 * seed-steps.ts
 * Populates demo projects with data for steps 2, 4 and 5:
 *   Step 2 – Plano del Proyecto  → masterplanSVG + coordenadasMasterplan on units
 *   Step 4 – Mapa Interactivo   → overlayBounds
 *   Step 5 – Tour 360           → imagenesMapa records
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PAD = 60;
const COLS = 5;
const LOT_W = 80;
const LOT_H = 100;
const LOT_GAP = 2;
const MANZANA_SPACING = 40;
const HEADER_H = 80; // title + subtitle area

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface LotCoord {
    label: string;   // lot label (e.g. "N-01")
    cx: number;      // SVG center X
    cy: number;      // SVG center Y
    x: number;       // rect top-left X
    y: number;       // rect top-left Y
    pathData: string;
    internalId: number;
}

interface SVGResult {
    svg: string;
    lotCoords: LotCoord[];
    totalW: number;
    totalH: number;
}

interface ManzanaDef { label: string; units: { numero: string; id: string }[]; }

// ─── SVG GENERATOR ────────────────────────────────────────────────────────────
function generateBlueprintSVG(
    projectName: string,
    manzanas: ManzanaDef[],
    streets: { label: string; x1: number; y1: number; x2: number; y2: number }[],
): SVGResult {
    const totalW = manzanas.length * (COLS * (LOT_W + LOT_GAP) + MANZANA_SPACING) + PAD * 2;
    const maxRows = Math.max(...manzanas.map(m => Math.ceil(m.units.length / COLS)));
    const totalH = maxRows * (LOT_H + LOT_GAP) + PAD + HEADER_H + 20;

    const lotCoords: LotCoord[] = [];
    let rects = "";
    let textLabels = "";
    let manzLabels = "";
    let internalIdx = 1;

    manzanas.forEach((manzana, mi) => {
        const mxBase = PAD + mi * (COLS * (LOT_W + LOT_GAP) + MANZANA_SPACING);
        const myBase = PAD + HEADER_H;

        const manzCX = mxBase + (COLS * (LOT_W + LOT_GAP)) / 2;
        manzLabels += `<text x="${manzCX}" y="${myBase - 15}" font-size="13" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle" font-weight="bold">${manzana.label}</text>\n`;

        manzana.units.forEach((unit, li) => {
            const col = li % COLS;
            const row = Math.floor(li / COLS);
            const lx = mxBase + col * (LOT_W + LOT_GAP);
            const ly = myBase + row * (LOT_H + LOT_GAP);
            const cx = lx + LOT_W / 2;
            const cy = ly + LOT_H / 2;
            const pathId = `lot-${unit.numero.replace(/\s+/g, "-")}`;
            const pathData = `M ${lx} ${ly} H ${lx + LOT_W} V ${ly + LOT_H} H ${lx} Z`;

            rects += `<rect id="${pathId}" x="${lx}" y="${ly}" width="${LOT_W}" height="${LOT_H}" fill="rgba(148,163,184,0.08)" stroke="#94a3b8" stroke-width="1.5" rx="2" data-lot="${unit.numero}" data-area="${(LOT_W * LOT_H * 0.01).toFixed(2)}"/>\n`;
            textLabels += `<text x="${cx}" y="${cy + 5}" font-size="10" font-family="Arial,sans-serif" fill="#475569" text-anchor="middle" pointer-events="none">${unit.numero}</text>\n`;

            lotCoords.push({ label: unit.numero, cx, cy, x: lx, y: ly, pathData, internalId: internalIdx++ });
        });
    });

    let streetLines = "";
    streets.forEach(s => {
        streetLines += `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>\n`;
        const mx = (s.x1 + s.x2) / 2;
        const my = (s.y1 + s.y2) / 2;
        streetLines += `<text x="${mx}" y="${my - 4}" font-size="9" font-family="Arial,sans-serif" fill="#94a3b8" text-anchor="middle">${s.label}</text>\n`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="${totalW / 2}" y="${PAD + 22}" font-size="16" font-family="Arial,sans-serif" fill="#f1f5f9" text-anchor="middle" font-weight="bold">${projectName}</text>
  <text x="${totalW / 2}" y="${PAD + 40}" font-size="10" font-family="Arial,sans-serif" fill="#64748b" text-anchor="middle">Plano de Loteo — Referencia</text>
  ${streetLines}
  ${rects}
  ${textLabels}
  ${manzLabels}
  <g transform="translate(${totalW - 46}, 50)">
    <circle cx="0" cy="0" r="16" fill="none" stroke="#475569" stroke-width="1.5"/>
    <polygon points="0,-12 4,5 0,2 -4,5" fill="#f97316"/>
    <text x="0" y="26" font-size="9" font-family="Arial,sans-serif" fill="#94a3b8" text-anchor="middle">N</text>
  </g>
</svg>`;

    return { svg, lotCoords, totalW, totalH };
}

// ─── OVERLAY BOUNDS ──────────────────────────────────────────────────────────
function computeBounds(lat: number, lng: number, delta = 0.003): [[number, number], [number, number]] {
    return [[lat - delta, lng - delta], [lat + delta, lng + delta]];
}

// ─── PROJECT-SPECIFIC DATA ───────────────────────────────────────────────────
const STREETS: Record<string, { label: string; x1: number; y1: number; x2: number; y2: number }[]> = {
    "barrio-las-casuarinas":      [{ label: "Av. Los Plátanos", x1: 60, y1: 470, x2: 600, y2: 470 }, { label: "Calle Los Pinos", x1: 310, y1: 80, x2: 310, y2: 470 }],
    "loteo-san-martin-mendoza":   [{ label: "Calle Sarmiento",  x1: 60, y1: 470, x2: 560, y2: 470 }, { label: "Bv. Rivadavia",    x1: 285, y1: 80, x2: 285, y2: 470 }],
    "chacras-del-norte-santa-fe": [{ label: "Ruta Prov. 70",    x1: 60, y1: 470, x2: 540, y2: 470 }, { label: "Camino Las Lomas", x1: 305, y1: 80, x2: 305, y2: 470 }],
    "villa-del-lago-buenos-aires":[{ label: "Calle Los Lagos",  x1: 60, y1: 470, x2: 620, y2: 470 }, { label: "Av. del Parque",   x1: 330, y1: 80, x2: 330, y2: 470 }],
};

const PORTADAS: Record<string, string> = {
    "barrio-las-casuarinas":      "https://images.unsplash.com/photo-1448630360428-65456885c650?w=800&q=80",
    "loteo-san-martin-mendoza":   "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
    "chacras-del-norte-santa-fe": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    "villa-del-lago-buenos-aires":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
};

const IMAGES: Record<string, { url: string; titulo: string }[]> = {
    "barrio-las-casuarinas": [
        { url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop", titulo: "Vista aérea Norte" },
        { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=1600&auto=format&fit=crop", titulo: "Acceso principal" },
        { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop", titulo: "Sector Manzana A" },
        { url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=1600&auto=format&fit=crop", titulo: "Lindero Sur" },
    ],
    "loteo-san-martin-mendoza": [
        { url: "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?q=80&w=1600&auto=format&fit=crop", titulo: "Vista general Mendoza" },
        { url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1600&auto=format&fit=crop", titulo: "Parcelamiento sector 1" },
        { url: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1600&auto=format&fit=crop", titulo: "Sector manzana 2" },
    ],
    "chacras-del-norte-santa-fe": [
        { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop", titulo: "Panorámica Norte" },
        { url: "https://images.unsplash.com/photo-1444464666168-49d633b86797?q=80&w=1600&auto=format&fit=crop", titulo: "Chacras sector Norte" },
        { url: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=1600&auto=format&fit=crop", titulo: "Lindero Ruta 70" },
    ],
    "villa-del-lago-buenos-aires": [
        { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600&auto=format&fit=crop", titulo: "Laguna central" },
        { url: "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?q=80&w=1600&auto=format&fit=crop", titulo: "Lotes frente al lago" },
        { url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?q=80&w=1600&auto=format&fit=crop", titulo: "Sector parque" },
        { url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1600&auto=format&fit=crop", titulo: "Acceso barrio" },
    ],
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    const projects = await prisma.proyecto.findMany({
        where: { slug: { in: ["barrio-las-casuarinas","loteo-san-martin-mendoza","chacras-del-norte-santa-fe","villa-del-lago-buenos-aires"] } },
        include: {
            etapas: {
                orderBy: { orden: "asc" },
                include: {
                    manzanas: {
                        orderBy: { createdAt: "asc" },
                        include: { unidades: { orderBy: { numero: "asc" } } },
                    },
                },
            },
        },
    });

    for (const p of projects) {
        console.log(`\n▶ ${p.nombre} (${p.slug})`);

        // Build manzanas with units
        const allManzanas: ManzanaDef[] = p.etapas.flatMap(e =>
            e.manzanas.map(m => ({
                label: m.nombre,
                units: m.unidades.map(u => ({ numero: u.numero, id: u.id })),
            }))
        );

        const streets = STREETS[p.slug!] ?? [];
        const { svg, lotCoords, totalW, totalH } = generateBlueprintSVG(p.nombre, allManzanas, streets);

        // ── STEP 1 extra: imagenPortada ───────────────────────────────────────
        const portada = PORTADAS[p.slug!];
        if (portada) {
            await prisma.proyecto.update({ where: { id: p.id }, data: { imagenPortada: portada } });
            console.log(`  ✓ imagenPortada — ${portada.slice(0, 60)}...`);
        }

        // ── STEP 2a: Save masterplanSVG ───────────────────────────────────────
        await prisma.proyecto.update({ where: { id: p.id }, data: { masterplanSVG: svg } });
        console.log(`  ✓ Paso 2a — masterplanSVG generado (${lotCoords.length} lotes en ${allManzanas.length} manzanas)`);

        // ── STEP 2b: Compute overlay bounds + seed coordenadasMasterplan ──────
        const lat = p.mapCenterLat ?? -31.33;
        const lng = p.mapCenterLng ?? -64.22;
        const bounds = computeBounds(lat, lng, 0.003);
        const [[swLat, swLng], [neLat, neLng]] = bounds;
        const latDiff = neLat - swLat;
        const lngDiff = neLng - swLng;

        // SVG viewport range for projection
        const svgW = totalW - PAD * 2;
        const svgH = totalH - PAD - HEADER_H;
        const svgMinX = PAD;
        const svgMinY = PAD + HEADER_H;

        // Build lookup: lot label → LotCoord
        const coordsByLabel = new Map(lotCoords.map(lc => [lc.label, lc]));

        // Update each unit with coordenadasMasterplan + geoJSON
        let syncedCount = 0;
        for (const etapa of p.etapas) {
            for (const manzana of etapa.manzanas) {
                for (const unit of manzana.unidades) {
                    const lc = coordsByLabel.get(unit.numero);
                    if (!lc) continue;

                    // Project SVG center → geo coords (Y flipped: top=north)
                    const unitLat = neLat - ((lc.cy - svgMinY) / svgH) * latDiff;
                    const unitLng = swLng + ((lc.cx - svgMinX) / svgW) * lngDiff;

                    const coordenadasMasterplan = JSON.stringify({
                        path: lc.pathData,
                        center: { x: lc.cx, y: lc.cy },
                        internalId: lc.internalId,
                        lotLabel: lc.label,
                    });

                    const geoJSON = JSON.stringify({
                        type: "Point",
                        coordinates: [unitLng, unitLat],
                    });

                    await prisma.unidad.update({
                        where: { id: unit.id },
                        data: { coordenadasMasterplan, geoJSON, centerLat: unitLat, centerLng: unitLng },
                    });
                    syncedCount++;
                }
            }
        }
        console.log(`  ✓ Paso 2b — coordenadasMasterplan seteada en ${syncedCount} unidades`);

        // ── STEP 4: overlayBounds ─────────────────────────────────────────────
        await prisma.proyecto.update({
            where: { id: p.id },
            data: { overlayBounds: JSON.stringify(bounds) },
        });
        console.log(`  ✓ Paso 4 — overlayBounds: SW(${bounds[0]}), NE(${bounds[1]})`);

        // ── STEP 5: imagenesMapa ──────────────────────────────────────────────
        const images = IMAGES[p.slug!] ?? [];
        await prisma.imagenMapa.deleteMany({ where: { proyectoId: p.id } });
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const offsetLat = lat + (i - images.length / 2) * 0.0008;
            const offsetLng = lng + (i % 2 === 0 ? 0.001 : -0.001);
            await prisma.imagenMapa.create({
                data: {
                    proyectoId: p.id,
                    url: img.url,
                    tipo: "foto",
                    titulo: img.titulo,
                    lat: offsetLat,
                    lng: offsetLng,
                    orden: i,
                    altitudM: 500,
                    imageHeading: i * 45,
                },
            });
        }
        console.log(`  ✓ Paso 5 — ${images.length} imágenes del mapa cargadas`);
    }

    console.log("\n✅ Pasos 2 (SVG + coordenadas), 4 (bounds) y 5 (imágenes) completados.");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
